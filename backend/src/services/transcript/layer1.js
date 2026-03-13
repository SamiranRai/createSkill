"use strict";
const { exec } = require("child_process");
const { promisify } = require("util");
const fs = require("fs");
const path = require("path");

const execAsync = promisify(exec);

const YT_DLP_BIN = process.env.YT_DLP_PATH || "yt-dlp";
const TMP_DIR = path.join(__dirname, "../../../../tmp");
const TIMEOUT_MS = 30_000;

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const cleanupFile = (filePath) => {
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
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

const buildCommand = (videoId, outputPath) => {
  const isProduction = process.env.NODE_ENV === "production";

  // Production: use cookies from env var + proxy
  // Local: pull cookies directly from Chrome (no setup needed)
  let cookieFlag = "";
  if (isProduction) {
    const cookiePath = writeCookieFile();
    cookieFlag = cookiePath ? `--cookies "${cookiePath}"` : "";
  } else {
    cookieFlag = "--cookies-from-browser chrome";
  }

  const proxyFlag =
    isProduction && process.env.RESIDENTIAL_PROXY_URL
      ? `--proxy "${process.env.RESIDENTIAL_PROXY_URL}"`
      : "";

  return [
    YT_DLP_BIN,
    "--write-subs",
    "--write-auto-subs",
    "--sub-lang en",
    "--skip-download",
    "--sub-format vtt",
    "--no-warnings",
    cookieFlag,
    proxyFlag,
    `--output "${outputPath}"`,
    `"https://www.youtube.com/watch?v=${videoId}"`,
  ]
    .filter(Boolean)
    .join(" ");
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

// in-memory cache — avoids hitting YouTube twice for same video
const cache = new Map();

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

  try {
    await execAsync(buildCommand(videoId, outputPath), { timeout: TIMEOUT_MS });
  } catch (err) {
    throw new Error(`[Layer1] yt-dlp failed: ${err.message}`);
  }

  if (!fs.existsSync(vttFile)) {
    throw new Error(
      "[Layer1] No subtitle file created — video may have no English captions",
    );
  }

  const raw = fs.readFileSync(vttFile, "utf8");
  cleanupFile(vttFile);

  const text = parseVTT(raw);
  if (!text) throw new Error("[Layer1] Transcript is empty after parsing VTT");

  cache.set(videoId, text);
  console.log(`[Layer1] Done — ${text.length} chars`);
  return text;
};

module.exports = getTranscript;
