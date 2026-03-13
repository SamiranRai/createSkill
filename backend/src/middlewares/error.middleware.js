'use strict'

const AppError = require('./AppError')
const { isDev } = require('../config/env')

const formatResponse = (err) => ({
  success: false,
  code: err.code || 'SERVER_ERROR',
  message: err.message || 'Something went wrong',
})

const handleCastError = () =>
  new AppError('Invalid resource identifier', 400, 'INVALID_ID')

const handleDuplicateError = (err) => {
  const field = err.keyValue ? Object.keys(err.keyValue).join(',') : 'field'
  return new AppError(`Duplicate value for ${field}`, 400, 'DUPLICATE_FIELD')
}

const handleValidationError = (err) =>
  new AppError(err.message, 400, 'VALIDATION_ERROR')

module.exports = (err, req, res, next) => {
  let error = err
  error.statusCode = error.statusCode || 500
  error.code = error.code || 'SERVER_ERROR'

  if (error.name === 'CastError') error = handleCastError(error)
  if (error.code === 11000) error = handleDuplicateError(error)
  if (error.name === 'ValidationError') error = handleValidationError(error)

  if (isDev) {
    return res.status(error.statusCode).json({
      ...formatResponse(error),
      stack: error.stack,
      error,
    })
  }

  if (!error.isOperational) {
    console.error('[ErrorMiddleware] Unexpected error:', error)
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Something went wrong',
    })
  }

  return res.status(error.statusCode).json(formatResponse(error))
}
