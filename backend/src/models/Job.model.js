'use strict'

const mongoose = require('mongoose')

const videoMetaSchema = new mongoose.Schema(
  {
    title: { type: String, default: null },
    author: { type: String, default: null },
    thumbnailUrl: { type: String, default: null },
  },
  { _id: false }
)

const errorSchema = new mongoose.Schema(
  {
    message: { type: String, default: null },
    failedAt: { type: String, default: null },
  },
  { _id: false }
)

const jobSchema = new mongoose.Schema(
  {
    youtubeUrl: { type: String, required: true, trim: true },
    videoId: { type: String, required: true, index: true },
    videoMeta: { type: videoMetaSchema, default: {} },
    status: {
      type: String,
      enum: ['pending', 'fetching_transcript', 'extracting_skill', 'complete', 'failed'],
      default: 'pending',
      index: true,
    },
    rawTranscript: { type: String, default: null },
    skillMarkdown: { type: String, default: null },
    error: { type: errorSchema, default: null },
    processingMs: { type: Number, default: null },
  },
  { timestamps: true, versionKey: false }
)

jobSchema.methods.markFailed = async function (message, failedAt) {
  this.status = 'failed'
  this.error = { message, failedAt }
  await this.save()
}

jobSchema.index({ videoId: 1, status: 1 })

module.exports = mongoose.model('Job', jobSchema)
