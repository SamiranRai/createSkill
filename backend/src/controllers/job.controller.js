'use strict'

const Job = require('../models/Job.model')
const AppError = require('../middlewares/AppError')
const catchAsync = require('../middlewares/catchAsync')
const { extractVideoId, fetchVideoMeta } = require('../utils/youtube.utils')
const getTranscript = require('../services/transcript/layer1')
const { generateSkill } = require('../services/skill.service')

const processJob = async (jobId) => {
  const job = await Job.findById(jobId)
  if (!job) return

  const startTime = Date.now()

  try {
    const meta = await fetchVideoMeta(job.videoId)
    job.videoMeta = meta
    await job.save()

    job.status = 'fetching_transcript'
    await job.save()
    const rawTranscript = await getTranscript(job.videoId)
    job.rawTranscript = rawTranscript
    await job.save()

    job.status = 'extracting_skill'
    await job.save()
    const skillMarkdown = await generateSkill(rawTranscript, {
      videoId: job.videoId,
      title: job.videoMeta?.title,
    })
    job.skillMarkdown = skillMarkdown

    job.status = 'complete'
    job.processingMs = Date.now() - startTime
    await job.save()

    console.log(`[JobController] Job complete — ${job._id} in ${job.processingMs}ms`)
  } catch (err) {
    console.error(`[JobController] Job failed — ${err.message}`)
    await job.markFailed(err.message, job.status)
  }
}

const createJob = catchAsync(async (req, res, next) => {
  const { youtubeUrl } = req.body || {}

  if (!youtubeUrl) {
    return next(new AppError('YouTube URL is required', 400, 'YOUTUBE_URL_REQUIRED'))
  }

  const videoId = extractVideoId(youtubeUrl)
  if (!videoId) {
    return next(new AppError('Invalid YouTube URL', 400, 'INVALID_YOUTUBE_URL'))
  }

  const existing = await Job.findOne({ videoId, status: 'complete' })
  if (existing) {
    return res.status(200).json({
      success: true,
      code: 'CACHED',
      data: { jobId: existing._id, status: existing.status, cached: true },
    })
  }

  const job = await Job.create({ youtubeUrl, videoId })
  processJob(job._id)

  return res.status(201).json({
    success: true,
    code: 'JOB_CREATED',
    data: { jobId: job._id, status: 'pending' },
  })
})

const getJob = catchAsync(async (req, res, next) => {
  const { jobId } = req.params
  const job = await Job.findById(jobId).select('-rawTranscript')
  if (!job) {
    return next(new AppError('Job not found', 404, 'JOB_NOT_FOUND'))
  }

  return res.status(200).json({ success: true, data: job })
})

const downloadSkill = catchAsync(async (req, res, next) => {
  const { jobId } = req.params
  const job = await Job.findById(jobId)

  if (!job) {
    return next(new AppError('Job not found', 404, 'JOB_NOT_FOUND'))
  }

  if (job.status !== 'complete') {
    return next(new AppError('Job is not complete yet', 400, 'JOB_NOT_COMPLETE'))
  }

  if (!job.skillMarkdown) {
    return next(new AppError('Skill file not available', 400, 'SKILL_NOT_AVAILABLE'))
  }

  res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="SKILL-${job.videoId}.md"`)
  return res.send(job.skillMarkdown)
})

module.exports = { createJob, getJob, downloadSkill }
