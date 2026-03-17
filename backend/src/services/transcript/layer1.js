"use strict";

const { exec } = require("child_process");
const { promisify } = require("util");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { env, isProd } = require("../../config/env");

const execAsync = promisify(exec);

const YT_DLP_BIN = env.YT_DLP_PATH || "yt-dlp";
const TMP_DIR = path.join(__dirname, "../../../../tmp");
const TIMEOUT_MS = 45_000;
const IS_PROD = isProd;
const TRANSCRIPT_API_BASE_URL = "https://transcriptapi.com/api/v2";
const TRANSCRIPT_API_RETRYABLE_STATUS = new Set([408, 429, 503]);

// ─── Proxy pool — round robin ─────────────────────────────────────────────────

const PROXY_POOL = (env.RESIDENTIAL_PROXY_URL || "")
  .split(",")
  .map((p) => p.trim())
  .filter(Boolean);

let _proxyIdx = 0;
const getNextProxy = () => {
  if (!PROXY_POOL.length) return null;
  const proxy = PROXY_POOL[_proxyIdx % PROXY_POOL.length];
  _proxyIdx++;
  return proxy;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const cleanupFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {}
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const normalizeApiTranscript = (data) => {
  if (!data) return "";

  if (typeof data.transcript === "string") {
    return data.transcript.replace(/\s+/g, " ").trim();
  }

  if (Array.isArray(data.transcript)) {
    return data.transcript
      .map((segment) => (typeof segment?.text === "string" ? segment.text : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return "";
};

const fetchTranscriptFromApi = async (videoId) => {
  const apiKey = env.YT_TRANSCRIPT_API_KEY;
  if (!apiKey) return null;

  const url = `${TRANSCRIPT_API_BASE_URL}/youtube/transcript`;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await axios.get(url, {
        params: {
          video_url: videoId,
          format: "json",
          include_timestamp: false,
          send_metadata: false,
        },
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 12_000,
        validateStatus: () => true,
      });

      if (response.status === 200) {
        const text = normalizeApiTranscript(response.data);
        return text || null;
      }

      if (!TRANSCRIPT_API_RETRYABLE_STATUS.has(response.status)) {
        const detail = response?.data?.detail;
        const message =
          typeof detail === "string"
            ? detail
            : detail?.message || `HTTP ${response.status}`;
        const nonRetryableError = new Error(
          `[TranscriptAPI] Non-retryable error: ${message}`,
        );
        nonRetryableError.nonRetryable = true;
        throw nonRetryableError;
      }

      if (attempt === maxAttempts) {
        throw new Error(
          `[TranscriptAPI] Retry limit reached (status ${response.status})`,
        );
      }

      const retryAfter = Number(response.headers?.["retry-after"] || 0);
      const backoffMs = retryAfter > 0 ? retryAfter * 1000 : attempt * 1000;
      await sleep(backoffMs);
    } catch (err) {
      if (err?.nonRetryable) {
        throw err;
      }

      if (attempt === maxAttempts) {
        throw new Error(`[TranscriptAPI] Request failed: ${err.message}`);
      }

      await sleep(attempt * 1000);
    }
  }

  return null;
};

const decodeEntities = (text) =>
  text
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const writeCookieFile = () => {
  const b64 = env.YT_COOKIES_B64;
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

// ─── Build strategies ─────────────────────────────────────────────────────────

const buildStrategies = (videoId, cookiePath) => {
  const base = [
    "--write-subs",
    "--write-auto-subs",
    "--sub-lang en",
    "--skip-download",
    "--sub-format vtt",
    "--no-warnings",
    "--no-check-certificates",
    "--socket-timeout 10",
  ];

  const cookieFlag = cookiePath ? `--cookies "${cookiePath}"` : "";
  const proxy = getNextProxy();
  const proxyFlag = proxy ? `--proxy "${proxy}"` : "";

  const iosArgs = [
    `--extractor-args "youtube:player_client=ios"`,
    `--user-agent "com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X)"`,
  ];

  const tvArgs = [`--extractor-args "youtube:player_client=tv_embedded"`];

  const creatorArgs = [`--extractor-args "youtube:player_client=web_creator"`];

  const strategies = [
    // ── With rotating proxy ──────────────────────────────────────────────────
    {
      name: "proxy+ios",
      outputPath: path.join(TMP_DIR, `${videoId}_p1`),
      args: [...base, ...iosArgs, cookieFlag, proxyFlag],
    },
    {
      name: "proxy+tv",
      outputPath: path.join(TMP_DIR, `${videoId}_p2`),
      args: [...base, ...tvArgs, cookieFlag, proxyFlag],
    },
    {
      name: "proxy+creator",
      outputPath: path.join(TMP_DIR, `${videoId}_p3`),
      args: [...base, ...creatorArgs, cookieFlag, proxyFlag],
    },
    // ── No proxy fallbacks ───────────────────────────────────────────────────
    {
      name: "noproxy+ios",
      outputPath: path.join(TMP_DIR, `${videoId}_n1`),
      args: [...base, ...iosArgs, cookieFlag],
    },
    {
      name: "noproxy+tv",
      outputPath: path.join(TMP_DIR, `${videoId}_n2`),
      args: [...base, ...tvArgs, cookieFlag],
    },
  ];

  // Local dev — use browser cookies, no proxy
  if (!IS_PROD) {
    return strategies.map((s) => ({
      ...s,
      args: [
        ...s.args.filter(
          (a) => !a.startsWith("--cookies") && !a.startsWith("--proxy"),
        ),
        "--cookies-from-browser chrome",
      ],
    }));
  }

  return strategies;
};

// ─── Run single strategy ──────────────────────────────────────────────────────

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

// ─── Cache with TTL ───────────────────────────────────────────────────────────

const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

const cacheSet = (k, v) => cache.set(k, { v, exp: Date.now() + CACHE_TTL });
const cacheGet = (k) => {
  const e = cache.get(k);
  if (!e) return null;
  if (Date.now() > e.exp) {
    cache.delete(k);
    return null;
  }
  return e.v;
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const getTranscript = async (videoId) => {
  const cached = cacheGet(videoId);
  if (cached) {
    console.log(`[Layer1] Cache hit — ${videoId}`);
    return cached;
  }

  console.log(`[Layer1] Fetching — ${videoId}`);
  ensureDir(TMP_DIR);

  const cookiePath = IS_PROD ? writeCookieFile() : null;
  const strategies = buildStrategies(videoId, cookiePath);

  let vttFile = null;
  let winner = null;

  for (const strategy of strategies) {
    vttFile = await runStrategy(strategy, videoId);
    if (vttFile) {
      winner = strategy;
      break;
    }
    await sleep(500);
  }

  // ✅ READ FIRST before any cleanup
  if (!vttFile) {
    strategies.forEach((s) => cleanupFile(`${s.outputPath}.en.vtt`));

    console.log("[Layer1] Trying final fallback: TranscriptAPI");
    const apiTranscript = await fetchTranscriptFromApi(videoId);

    if (!apiTranscript) {
      throw new Error(
        "[Layer1] All strategies failed, including TranscriptAPI fallback.",
      );
    }

    cacheSet(videoId, apiTranscript);
    console.log(
      `[Layer1] ✓ Done via transcriptapi fallback — ${apiTranscript.length} chars`,
    );
    return apiTranscript;
  }

  const raw = fs.readFileSync(vttFile, "utf8");

  // THEN cleanup all temp files
  strategies.forEach((s) => cleanupFile(`${s.outputPath}.en.vtt`));

  const text = parseVTT(raw);
  if (!text) throw new Error("[Layer1] Transcript empty after parsing");

  cacheSet(videoId, text);
  console.log(`[Layer1] ✓ Done via ${winner.name} — ${text.length} chars`);
  return text;
};

module.exports = getTranscript;
