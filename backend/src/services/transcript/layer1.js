"use strict";

const { exec } = require("child_process");
const { promisify } = require("util");
const fs = require("fs");
const path = require("path");

const execAsync = promisify(exec);

// ─── Constants ───────────────────────────────────────────────────────────────

const YT_DLP_BIN = process.env.YT_DLP_PATH || "yt-dlp";
const TMP_DIR = path.join(__dirname, "../../../../tmp");
const TIMEOUT_MS = 60_000; // increased — proxy adds latency
const IS_PROD = process.env.NODE_ENV === "production";

// ─── Proxy Pool ──────────────────────────────────────────────────────────────
// Comma-separate multiple proxies in RESIDENTIAL_PROXY_URL for rotation
// e.g. "http://user:pass@p1.webshare.io:80,http://user:pass@p2.webshare.io:80"
const PROXY_POOL = (process.env.RESIDENTIAL_PROXY_URL || "")
  .split(",")
  .map((p) => p.trim())
  .filter(Boolean);

const getRandomProxy = () => {
  if (!PROXY_POOL.length) return null;
  return PROXY_POOL[Math.floor(Math.random() * PROXY_POOL.length)];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const cleanupFile = (filePath) => {
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
};

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const decodeEntities = (text) =>
  text
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const writeCookieFile = () => {
  const b64 = process.env.YT_COOKIES_B64;
  if (!b64) return null;
  const cookiePath = path.join("/tmp", "yt-cookies.txt");
  fs.writeFileSync(cookiePath, Buffer.from(b64, "base64").toString("utf8"));
  return cookiePath;
};

const parseVTT = (vtt) => {
  const isMetaLine = (line) =>
    !line.trim() ||
    line.startsWith("WEBVTT") ||
    line.startsWith("NOTE") ||
    line.startsWith("Kind:") ||
    line.startsWith("Language:") ||
    line.includes("-->") ||
    /^\d+$/.test(line.trim());

  const lines = vtt
    .split("\n")
    .filter((line) => !isMetaLine(line))
    .map((line) => line.replace(/<[^>]*>/g, "").trim())
    .filter(Boolean);

  const deduped = lines.filter((line, i) => line !== lines[i - 1]);
  return decodeEntities(deduped.join(" ").replace(/\s+/g, " ").trim());
};

// ─── Strategy Builder ────────────────────────────────────────────────────────
// Each strategy is a different combination of client, proxy, and timing.
// They are tried in order — first success wins.

const buildStrategies = (videoId, outputPath, cookiePath) => {
  const base = [
    "--write-subs",
    "--write-auto-subs",
    "--sub-lang en",
    "--skip-download",
    "--sub-format vtt",
    "--no-warnings",
  ];

  const cookieFlag = cookiePath ? `--cookies "${cookiePath}"` : "";
  const proxy = getRandomProxy();
  const proxyFlag = proxy ? `--proxy "${proxy}"` : "";
  const output = `--output "${outputPath}"`;
  const url = `"https://www.youtube.com/watch?v=${videoId}"`;

  // Client presets
  const iosClient = [
    `--extractor-args "youtube:player_client=ios"`,
    `--user-agent "com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X)"`,
  ];
  const webStealth = [
    `--extractor-args "youtube:player_client=web"`,
    "--sleep-interval 2",
    "--max-sleep-interval 5",
  ];

  const strategies = [
    // Best: iOS client spoofs mobile app — lowest bot suspicion
    {
      name: "ios+proxy+cookies",
      args: [...base, ...iosClient, cookieFlag, proxyFlag, output, url],
    },
    // Good: web client with sleep intervals — slower but stealthier
    {
      name: "web+sleep+proxy+cookies",
      args: [...base, ...webStealth, cookieFlag, proxyFlag, output, url],
    },
    // Fallback: iOS without proxy — in case proxy IP is the problem
    {
      name: "ios+cookies+noproxy",
      args: [...base, ...iosClient, cookieFlag, output, url],
    },
    // Last resort: bare command with just cookies
    {
      name: "bare+cookies",
      args: [...base, cookieFlag, output, url],
    },
  ];

  // Locally: swap cookie file for browser cookies — no setup needed
  if (!IS_PROD) {
    return strategies.map((s) => ({
      ...s,
      args: [
        ...s.args.filter((a) => !a.startsWith("--cookies")),
        "--cookies-from-browser chrome",
      ],
    }));
  }

  return strategies;
};

// ─── Strategy Runner ─────────────────────────────────────────────────────────

const tryStrategy = async (strategy, retries = 2) => {
  const command = [YT_DLP_BIN, ...strategy.args].filter(Boolean).join(" ");

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(
        `[Layer1] Strategy="${strategy.name}" attempt=${attempt}/${retries}`,
      );
      await execAsync(command, { timeout: TIMEOUT_MS });
      return true;
    } catch (err) {
      const is429 = err.message.includes("429");
      const isBot = err.message.includes("Sign in to confirm");
      const isLast = attempt === retries;

      if (isLast) {
        console.warn(
          `[Layer1] Strategy "${strategy.name}" exhausted: ${err.message.slice(0, 150)}`,
        );
        return false;
      }

      if (is429 || isBot) {
        const wait = attempt * 4000; // 4s → 8s
        console.log(
          `[Layer1] ${is429 ? "429 rate limit" : "bot check"} — retrying in ${wait / 1000}s`,
        );
        await sleep(wait);
      }
    }
  }

  return false;
};

// ─── In-Memory Cache ─────────────────────────────────────────────────────────

const cache = new Map();

// ─── Public API ──────────────────────────────────────────────────────────────

const getTranscript = async (videoId) => {
  if (cache.has(videoId)) {
    console.log(`[Layer1] Cache hit — ${videoId}`);
    return cache.get(videoId);
  }

  console.log(`[Layer1] Fetching transcript — videoId: ${videoId}`);
  ensureDir(TMP_DIR);

  const outputPath = path.join(TMP_DIR, videoId);
  const vttFile = `${outputPath}.en.vtt`;
  cleanupFile(vttFile);

  const cookiePath = IS_PROD ? writeCookieFile() : null;
  const strategies = buildStrategies(videoId, outputPath, cookiePath);

  for (const strategy of strategies) {
    await tryStrategy(strategy);
    if (fs.existsSync(vttFile)) break; // vtt file exists = success
    await sleep(1500); // brief pause before trying next strategy
  }

  if (!fs.existsSync(vttFile)) {
    throw new Error(
      "[Layer1] All strategies exhausted — YouTube may be blocking this server. " +
        "Check proxy health, refresh cookies, or upgrade to a paid proxy plan.",
    );
  }

  const raw = fs.readFileSync(vttFile, "utf8");
  cleanupFile(vttFile);

  const text = parseVTT(raw);
  if (!text) throw new Error("[Layer1] Transcript parsed but came back empty");

  cache.set(videoId, text);
  console.log(`[Layer1] Done — ${text.length} chars`);
  return text;
};

module.exports = getTranscript;
