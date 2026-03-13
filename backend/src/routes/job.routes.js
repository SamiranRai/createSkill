'use strict'

const express = require('express')
const router = express.Router()
const jobController = require('../controllers/job.controller')

router.route('/').post(jobController.createJob)
router.route('/:jobId').get(jobController.getJob)
router.route('/:jobId/skill').get(jobController.downloadSkill)

module.exports = router
