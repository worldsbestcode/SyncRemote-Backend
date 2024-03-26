const express = require('express')
const { syncRecommend, syncAllRecommend, recommendResult } = require('../controllers/recommendationController/recommendController')
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth')
const router = express.Router()

router.route('/recommendcafe').post(syncRecommend)
router.route('/getrecommend/:id?').get(isAuthenticatedUser, authorizeRoles('admin'), syncAllRecommend)
router.route('/recommendresult').post(isAuthenticatedUser, authorizeRoles('admin'), recommendResult)

module.exports = router
