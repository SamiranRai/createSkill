'use strict'

const jobRoutes = require('./src/routes/job.routes')

const registerGlobalRouteHandler = (app) => {
  app.use('/api/v1/jobs', jobRoutes)
}

module.exports = registerGlobalRouteHandler
