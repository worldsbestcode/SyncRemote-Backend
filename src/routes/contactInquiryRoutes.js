const express = require('express')
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth')
const { createInquiry, getInquiry } = require('../controllers/inquiryControllers/inquiryController')
const router = express.Router()

router.route('/create_inquiry').post(createInquiry)
router.route('/get_inquiry/:id?').get(isAuthenticatedUser, authorizeRoles('admin'), getInquiry)

module.exports = router
