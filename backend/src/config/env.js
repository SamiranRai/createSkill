'use strict'

const dotenv = require('dotenv')

dotenv.config()

const env = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  YT_DLP_PATH: process.env.YT_DLP_PATH,
}

;['MONGODB_URI', 'GEMINI_API_KEY'].forEach((key) => {
  if (!env[key]) {
    throw new Error(`[Env] Missing required environment variable: ${key}`)
  }
})

const isDev = env.NODE_ENV === 'development'
const isProd = env.NODE_ENV === 'production'

module.exports = { env, isDev, isProd }
