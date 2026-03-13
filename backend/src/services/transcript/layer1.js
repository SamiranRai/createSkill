'use strict'

const { exec } = require('child_process')
const { promisify } = require('util')
const fs   = require('fs')
const path = require('path')

const execAsync = promisify(exec)

const YT_DLP_BIN = process.env.YT_DLP_PATH || "yt-dlp";
const TMP_DIR    = path.join(__dirname, '../../../../tmp')
const TIMEOUT_MS = 30_000

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

const cleanupFile = (filePath) => {
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
}

const decodeEntities = (text) =>
  text
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')

const buildCommand = (videoId, outputPath) =>
  [
    YT_DLP_BIN,
    '--write-subs',
    '--write-auto-subs',
    '--sub-lang en',
    '--skip-download',
    '--sub-format vtt',
    '--no-warnings',
    `--output "${outputPath}"`,
    `"https://www.youtube.com/watch?v=${videoId}"`,
  ].join(' ')

const parseVTT = (vtt) => {
  const isMetaLine = (line) =>
    !line.trim()                 ||
    line.startsWith('WEBVTT')    ||
    line.startsWith('NOTE')      ||
    line.startsWith('Kind:')     ||
    line.startsWith('Language:') ||
    line.includes('-->')         ||
    /^\d+$/.test(line.trim())

  const lines = vtt
    .split('\n')
    .filter((line) => !isMetaLine(line))
    .map((line) => line.replace(/<[^>]*>/g, '').trim())
    .filter(Boolean)

  // consecutive-only dedup — preserves repeated phrases later in video
  const deduped = lines.filter((line, i) => line !== lines[i - 1])

  return decodeEntities(deduped.join(' ').replace(/\s+/g, ' ').trim())
}

const getTranscript = async (videoId) => {
  console.log(`[Layer1] Fetching transcript — videoId: ${videoId}`)

  ensureDir(TMP_DIR)

  const outputPath = path.join(TMP_DIR, videoId)
  const vttFile    = `${outputPath}.en.vtt`

  cleanupFile(vttFile)

  try {
    await execAsync(buildCommand(videoId, outputPath), { timeout: TIMEOUT_MS })
  } catch (err) {
    throw new Error(`[Layer1] yt-dlp failed: ${err.message}`)
  }

  if (!fs.existsSync(vttFile)) {
    throw new Error('[Layer1] No subtitle file created — video may have no English captions')
  }

  const raw  = fs.readFileSync(vttFile, 'utf8')
  cleanupFile(vttFile)

  const text = parseVTT(raw)
  if (!text) throw new Error('[Layer1] Transcript is empty after parsing VTT')

  console.log(`[Layer1] Done — ${text.length} chars`)
  return text
}

module.exports = getTranscript
