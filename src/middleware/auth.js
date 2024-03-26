const ErrorHandler = require('../utils/errorHandler')
const catchAsyncErrors = require('./catchAsyncErrors')
const jwt = require('jsonwebtoken')
const syncRegistration = require('../modals/registration/syncRegistration')
const syncAdminRegistration = require('../modals/registration/syncAdminRegistration')
const cafeRegistration = require('../modals/cafeRegistration/cafeRegistration')

exports.isAuthenticatedUser = catchAsyncErrors(async (req, res, next) => {
  const { token } = req.cookies

  if (!token) {
    return next(new ErrorHandler('Please Login to access this resource', 401))
  }

  const decodedData = jwt.verify(token, process.env.JWT_SECRET)

  req.user = await syncRegistration.findById(decodedData.id)

  if (!req.user) {
    req.user = await cafeRegistration.findById(decodedData.id)
  }

  if (!req.user) {
    req.user = await syncAdminRegistration.findById(decodedData.id)
  }

  next()
})

exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorHandler(
          `Role: ${req.user.role} is not allowed to access this resouce `,
          403
        )
      )
    }
    next()
  }
}
