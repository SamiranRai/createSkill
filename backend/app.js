'use strict'

const express  = require('express')
const helmet   = require('helmet')
const morgan   = require('morgan')
const cors     = require('cors')

const registerGlobalRouteHandler = require('./global.routes')
const registerGlobalErrorHandler = require('./src/middlewares/error.middleware')
const AppError = require('./src/middlewares/AppError')
const { isDev }  = require('./src/config/env')

const app = express()

app.use(helmet())
app.use(cors())
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true }))

if (isDev) app.use(morgan('dev'))

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }))

registerGlobalRouteHandler(app)

app.use((req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404, 'ROUTE_NOT_FOUND'))
})

app.use(registerGlobalErrorHandler)

module.exports = app
