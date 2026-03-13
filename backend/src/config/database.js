'use strict'

const mongoose = require('mongoose')

const connectDB = async (uri) => {
  try {
    await mongoose.connect(uri)
    console.log('[Database] Connected successfully')
  } catch (err) {
    console.error('[Database] Connection failed', err.message)
    process.exit(1)
  }
}

module.exports = connectDB
