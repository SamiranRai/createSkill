"use strict";

const { exec } = require("child_process");
const { promisify } = require("util");
const fs = require("fs");
const path = require("path");

const execAsync = promisify(exec);

const YT_DLP_BIN = process.env.YT_DLP_PATH || "yt-dlp";
const TMP_DIR = path.join(__dirname, "../../../../tmp");
const TIMEOUT_MS = 45_000;
const IS_PROD = process.env.NODE_ENV === "production";

const PROXY_POOL = (process.env.RESIDENTIAL_PROXY_URL || "")
  .split(",")
  .map((p) => p.trim())
  .filter(Boolean);

const getRandomProxy = () => {
  if (!PROXY_POOL.length) return null;
  return PROXY_POOL[Math.floor(Math.random() * PROXY_POOL.length)];
};

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const cleanupFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {}
};

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

const buildStrategies = (videoId, cookiePath) => {
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

  const iosArgs = [
    `--extractor-args "youtube:player_client=ios"`,
    `--user-agent "com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X)"`,
  ];

  const strategies = [
    {
      name: "ios+proxy",
      outputPath: path.join(TMP_DIR, `${videoId}_p`),
      args: [...base, ...iosArgs, cookieFlag, proxyFlag],
    },
    {
      name: "ios+noproxy",
      outputPath: path.join(TMP_DIR, `${videoId}_n`),
      args: [...base, ...iosArgs, cookieFlag],
    },
    {
      name: "bare",
      outputPath: path.join(TMP_DIR, `${videoId}_b`),
      args: [...base, cookieFlag],
    },
  ];

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

const runStrategy = async (strategy, videoId) => {
  const vttFile = `${strategy.outputPath}.en.vtt`;
  cleanupFile(vttFile);

  const command = [
    YT_DLP_BIN,
    ...strategy.args,
    `--output "${strategy.outputPath}"`,
    `"https://www.youtube.com/watch?v=${videoId}"`,
  ]
    .filter(Boolean)
    .join(" ");

  console.log(`[Layer1] → ${strategy.name}`);

  try {
    await execAsync(command, { timeout: TIMEOUT_MS });
    if (fs.existsSync(vttFile)) return vttFile;
    return null;
  } catch (err) {
    console.warn(`[Layer1] ✗ ${strategy.name}: ${err.message.slice(0, 100)}`);
    return null;
  }
};

const cache = new Map();

const getTranscript = async (videoId) => {
  if (cache.has(videoId)) {
    console.log(`[Layer1] Cache hit — ${videoId}`);
    return cache.get(videoId);
  }

  console.log(`[Layer1] Fetching — ${videoId}`);
  ensureDir(TMP_DIR);

  const cookiePath = IS_PROD ? writeCookieFile() : null;
  const [s1, s2, s3] = buildStrategies(videoId, cookiePath);

  // Phase 1: race s1 and s2 in parallel
  let vttFile = await Promise.any(
    [runStrategy(s1, videoId), runStrategy(s2, videoId)].map((p) =>
      p.then((r) => r ?? Promise.reject()),
    ),
  ).catch(() => null);

  // Phase 2: sequential fallback
  if (!vttFile) {
    console.log("[Layer1] Parallel strategies failed, trying fallback...");
    vttFile = await runStrategy(s3, videoId);
  }

  if (!vttFile) {
    // Cleanup all then throw
    [s1, s2, s3].forEach((s) => cleanupFile(`${s.outputPath}.en.vtt`));
    throw new Error(
      "[Layer1] All strategies failed — check proxy health or refresh cookies.",
    );
  }

  // ✅ READ FIRST, then cleanup losers
  const raw = fs.readFileSync(vttFile, "utf8");
  [s1, s2, s3].forEach((s) => cleanupFile(`${s.outputPath}.en.vtt`));

  const text = parseVTT(raw);
  if (!text) throw new Error("[Layer1] Transcript empty after parsing");

  cache.set(videoId, text);
  console.log(`[Layer1] ✓ Done — ${text.length} chars`);
  return text;
};

module.exports = getTranscript;
