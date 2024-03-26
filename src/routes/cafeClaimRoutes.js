const express = require('express')
const { syncClaim, verifyCafeClaim, getAllClaimRequest, claimResult } = require('../controllers/registrationController/cafeClaimController')
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth')
const router = express.Router()

router.route('/claimcafe').post(syncClaim)
router.route('/verifyclaim/:token').get(verifyCafeClaim)
router.route('/getAllClaimRequest/:id?').get(isAuthenticatedUser, authorizeRoles('admin'), getAllClaimRequest)
router.route('/claimresult').post(isAuthenticatedUser, authorizeRoles('admin'), claimResult)

module.exports = router
