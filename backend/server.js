'use strict'

process.on('uncaughtException', (err) => {
  console.error('[Server] uncaughtException:', err.message)
  process.exit(1)
})

const { env } = require('./src/config/env')
const connectDB = require('./src/config/database')
const app = require('./app')

const PORT = env.PORT || 3000;

(async () => {
  await connectDB(env.MONGODB_URI)
  const server = app.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`)
  })

  process.on('unhandledRejection', (err) => {
    console.error('[Server] unhandledRejection:', err.message)
    server.close(() => process.exit(1))
  })
})()
