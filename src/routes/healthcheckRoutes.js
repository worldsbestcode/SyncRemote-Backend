const express = require('express')
const { healthcheck } = require('../controllers/healthcheckController/healthcheckController')
const router = express.Router()

router.route('').get(healthcheck)

module.exports = router
