const catchAsyncErrors = require('../../middleware/catchAsyncErrors')
const syncAdminRegistration = require('../../modals/registration/syncAdminRegistration')
const syncRegistration = require('../../modals/registration/syncRegistration')
const cafeRegistration = require('../../modals/cafeRegistration/cafeRegistration')
const recommendCafeSchema = require('../../modals/recommendModel/recommendSchema')
const sendToken = require('../../utils/jwtToken')
const sendEmail = require('../../utils/sendEmail')
const crypto = require('crypto')
const { errFunc } = require('../../utils/sendResponse')
const syncDeleteUser = require('../../modals/registration/syncDeleteUser')

// Register User
exports.registerSync = catchAsyncErrors(async (req, res, next) => {
  const { name, email, password } = req.body

  const isUser = await syncRegistration.findOne({ email })
  let admin
  let cafe
  if (!isUser) {
    cafe = await cafeRegistration.findOne({ email })
  }
  if (!isUser && !cafe) {
    admin = await syncAdminRegistration.findOne({ email })
  }

  if (isUser || admin || cafe) {
    if (isUser && isUser?.deletedData?.status === true) {
      return next(errFunc(res, 401, false, 'Email ID already exist'))
    }
    if (isUser && isUser?.isVerified === false) {
      // Get verifyUser Token
      const verifyToken = await isUser.getVerifyUserToken()
      const verifyUserUrl = `${req.protocol}://${process.env.HOST}/${verifyToken}`

      const message = `Thanks so much for signing up to claim your free business profile on Sync! We're really excited to have you as part of our community. Please click the link below to verify your email: \n\n ${verifyUserUrl}`

      res.status(200).json({
        success: true,
        message: `Email sent to ${isUser.email} successfully`
      })

      await sendEmail({
        email: isUser.email,
        subject: 'Welcome to Sync! Please verify your email ',
        message
      })
    } else {
      return next(errFunc(res, 401, false, 'Email ID already exist'))
    }
  }

  const user = await syncRegistration.create({ name, email, password })

  // Get verifyUser Token
  const verifyToken = await user.getVerifyUserToken()

  const verifyUserUrl = `${req.protocol}://${process.env.HOST}/${verifyToken}`

  const message = `Thanks so much for signing up to claim your free business profile on Sync! We're really excited to have you as part of our community. Please click the link below to verify your email: \n\n ${verifyUserUrl}`

  try {
    res.status(200).json({
      success: true,
      message: `Email sent to ${user.email} successfully`
    })

    await sendEmail({
      email: user.email,
      subject: 'Welcome to Sync! Please verify your email ',
      message
    })
  } catch (error) {
    user.verifyUserToken = undefined
    user.verifyUserExpire = undefined

    await user.save({ validateBeforeSave: false })

    return next(errFunc(res, 500, false, error.message))
  }
})

// Register Admin
exports.registerAdminSync = catchAsyncErrors(async (req, res, next) => {
  const { name, email, password } = req.body

  const isUser = await syncAdminRegistration.findOne({ email })
  const userData = await syncRegistration.findOne({ email })

  if (isUser || userData) {
    return next(errFunc(res, 401, false, 'Email ID already exist'))
  }

  const user = await syncAdminRegistration.create({ name, email, password })

  await user.save({ validateBeforeSave: false })
  res.status(200).json({
    success: true,
    message: `Register ${user.email} successfully`
  })
})

// Verification of User

exports.verifyUser = catchAsyncErrors(async (req, res, next) => {
  // creating token hash
  console.log(req.params, req.body.fcmToken, 'fcmtoken')
  const verifyUserToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex')

  const user = await syncRegistration.findOne({
    verifyUserToken
  }).select('+verifyUserToken').select('+verifyUserExpire')
  const time = new Date(user.verifyUserExpire).getTime()
  if (user && user.isVerified === false && (time + (15 * 60 * 1000)) < Date.now()) {
    await user.deleteOne()
    return errFunc(res, 400, false`Verify User Token is invalid or has been expired`
    )
  }

  if (user?.deletedData?.status === true) {
    const deletedUser = await syncDeleteUser.findOne({ email: user.email })
    await syncRegistration.updateOne({ email: user.email }, deletedUser, {
      new: true
    })
    const updatedUser = await syncRegistration.findOne({ email: user.email })
    await syncDeleteUser.deleteOne({ email: user.email })
    updatedUser.deletedData = {
      deleteTime: Date.now(),
      status: false
    }
    if (req.body.fcmToken !== '' && !updatedUser.fcmToken.some((e) => e === req.body.fcmToken)) {
      updatedUser.fcmToken.push(req.body.fcmToken)
    }
    updatedUser.status = true
    updatedUser.isVerified = true
    await updatedUser.save()
    sendToken(updatedUser, 200, res)
  }

  if (user && user.isVerified === true) {
    return errFunc(res, 400, false, 'User already verified')
  }

  if (!user) {
    return errFunc(res, 400, false, 'Verify User Token is invalid or has been expired')
  }

  user.status = true
  user.isVerified = true
  if (req.body.fcmToken !== '' && !user.fcmToken.some((e) => e === req.body.fcmToken)) {
    user.fcmToken.push(req.body.fcmToken)
  }
  await user.save()
  sendToken(user, 200, res)
})

// Login User
exports.loginSync = catchAsyncErrors(async (req, res, next) => {
  const { email, password, fcmToken } = req.body

  if (!email || !password) {
    return next(errFunc(res, 400, false, 'Please Enter Email & Password'))
  }

  const user = await syncRegistration.findOne({ email }).select('+password')
  let cafe
  if (!user) {
    cafe = await cafeRegistration.find({ email }).select('+password')
  }
  if (!user && !cafe) {
    return next(errFunc(res, 401, false, 'User not found'))
  }
  if (user) {
    if (user?.password === undefined) {
      return res.status(403).json({
        success: false,
        message: 'There`s no password associated with this account, please log in with google or set up a password clicking in "Forgot Password?"'
      })
    }
    if (user?.deletedData?.status === true) {
      const totalTime = Date.now() - 1296000000
      if (user?.deletedData?.deleteTime > totalTime) {
        if (user.status === false) {
          return res.status(403).json({
            success: false,
            message: 'Your account is temporarily deactivated by admin'
          })
        }
        await sendVerificationEmail(user, req)
        return res.status(403).json({
          success: false,
          message: `Email sent to ${user.email} successfully. Please verify first`
        })
      } else {
        next(errFunc(res, 401, false, 'Your account is deleted'))
      }
    }
    if (user.isVerified === false) {
      await sendVerificationEmail(user, req)
      return res.status(403).json({
        success: false,
        message: `Email sent to ${user.email} successfully. Please verify first`
      })
    }

    if (await user.comparePassword(password)) {
      if (user.status === false) {
        return res.status(403).json({
          success: false,
          message: 'Your account is temporarily deactivated by admin'
        })
      }
      if (fcmToken !== '' && !user.fcmToken.some((e) => e === fcmToken)) {
        user.fcmToken.push(fcmToken)
        await user.save()
      }
      sendToken(user, 200, res)
      return
    } else {
      next(errFunc(res, 401, false, 'Invalid email or password'))
    }
  }
  if (cafe?.length > 0) {
    const filterCafe = cafe?.filter(a => a.password)
    if (filterCafe.length > 0 && await filterCafe[0].comparePassword(password)) {
      if (fcmToken !== '' && !filterCafe[0].fcmToken.some((e) => e === fcmToken)) {
        filterCafe[0].fcmToken.push(fcmToken)
        await filterCafe[0].save()
      }
      sendToken(filterCafe[0], 200, res)
      return
    }
    next(errFunc(res, 401, false, 'Invalid email or password'))
    return
  }
  next(errFunc(res, 401, false, 'Invalid email or password'))
})

async function sendVerificationEmail (user, req) {
  const verifyToken = await user.getVerifyUserToken()
  const verifyUserUrl = `${req.protocol}://${process.env.HOST}/${verifyToken}`
  const message = `Thanks so much for signing up to claim your free business profile on Sync! We're really excited to have you as part of our community. Please click the link below to verify your email: \n\n ${verifyUserUrl}`
  await sendEmail({
    email: user.email,
    subject: 'Welcome to Sync! Please verify your email ',
    message
  })
}
// Login Admin
exports.loginAdminSync = catchAsyncErrors(async (req, res, next) => {
  const { email, password, fcmToken } = req.body

  if (!email || !password) {
    return next(errFunc(res, 400, false, 'Please Enter Email & Password'))
  }

  const admin = await syncAdminRegistration.findOne({ email }).select('+password')

  if (!admin) {
    return next(errFunc(res, 401, false, 'User not found'))
  }

  if (admin && await admin.comparePassword(password)) {
    if (fcmToken !== '' && !admin.fcmToken.some((e) => e === fcmToken)) {
      admin.fcmToken.push(fcmToken)
      await admin.save()
    }
    sendToken(admin, 200, res)
    return
  }

  next(errFunc(res, 401, false, 'Invalid email or password'))
})

// Logout User
exports.logout = catchAsyncErrors(async (req, res, next) => {
  console.log(req.body, 'asdjhj')
  let user = await syncRegistration.findById(req.body.id)

  if (!user) {
    user = await cafeRegistration.findById(req.body.id)
  }

  if (!user) {
    user = await syncAdminRegistration.findById(req.body.id)
  }

  if (!user) {
    return next(errFunc(res, 401, false, 'User not found'))
  }

  user.fcmToken = user.fcmToken.filter((item) => item !== req.body.fcmToken)
  await user.save()
  res.cookie('token', '', {
    expires: new Date(0),
    httpOnly: true
  })

  res.status(200).json({
    success: true,
    message: 'Logged Out'
  })
})

// Forgot Password
exports.forgotPassword = catchAsyncErrors(async (req, res, next) => {
  const user = await syncRegistration.findOne({ email: req.body.email })
  const cafe = await cafeRegistration.findOne({ email: req.body.email })
  if (!user && !cafe) {
    return next(errFunc(res, 404, false, 'User not found'))
  }

  if (user && user.isVerified === false) {
    // Get verifyUser Token
    const verifyToken = user.getVerifyUserToken()
    const verifyUserUrl = `${req.protocol}://${process.env.HOST}/${verifyToken}`

    const message = `Thanks so much for signing up to claim your free business profile on Sync! We're really excited to have you as part of our community. Please click the link below to verify your email: \n\n ${verifyUserUrl}`
    res.status(403).json({
      success: false,
      message: `Email sent to ${user.email} successfully.Please verify first`
    })

    await sendEmail({
      email: user.email,
      subject: 'Welcome to Sync! Please verify your email ',
      message
    })
  }

  // Get ResetPassword Token
  if (user) {
    const resetToken = user.getResetPasswordToken()

    await user.save({ validateBeforeSave: false })

    const resetPasswordUrl = `${req.protocol}://${process.env.HOST}/password/reset/${resetToken}`

    const message = `Your password reset token is :- \n\n ${resetPasswordUrl} \n\nIf you have not requested this email then, please ignore it.`

    try {
      res.status(200).json({
        success: true,
        message: `Email sent to ${user.email} successfully`
      })

      await sendEmail({
        email: user.email,
        subject: 'Sync Password Recovery',
        message
      })
    } catch (error) {
      user.resetPasswordToken = undefined
      user.resetPasswordExpire = undefined

      await user.save({ validateBeforeSave: false })

      return next(errFunc(res, 500, false, error.message))
    }
  }
  if (cafe) {
    const resetToken = cafe.getResetPasswordToken()

    await cafe.save({ validateBeforeSave: false })

    const resetPasswordUrl = `${req.protocol}://${process.env.HOST}/password/reset/${resetToken}`

    const message = `Your password reset token is :- \n\n ${resetPasswordUrl} \n\nIf you have not requested this email then, please ignore it.`

    try {
      res.status(200).json({
        success: true,
        message: `Email sent to ${cafe.email} successfully`
      })

      await sendEmail({
        email: cafe.email,
        subject: 'Sync Password Recovery',
        message
      })
    } catch (error) {
      cafe.resetPasswordToken = undefined
      cafe.resetPasswordExpire = undefined

      await cafe.save({ validateBeforeSave: false })

      return next(errFunc(res, 500, false, error.message))
    }
  }
})

// Reset Password
exports.resetPassword = catchAsyncErrors(async (req, res, next) => {
  // creating token hash
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex')

  const user = await syncRegistration.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  })
  const cafe = await cafeRegistration.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  })

  if (!user && !cafe) {
    return next(errFunc(res, 400, false, 'Reset Password Token is invalid or has been expired'))
  }

  if (req.body.password !== req.body.confirmPassword) {
    return next(errFunc(res, 400, false, 'Password does not macthed'))
  }

  if (user) {
    user.password = req.body.password
    user.resetPasswordToken = undefined
    user.resetPasswordExpire = undefined

    await user.save()

    sendToken(user, 200, res)
  }
  if (cafe) {
    cafe.password = req.body.password
    cafe.resetPasswordToken = undefined
    cafe.resetPasswordExpire = undefined

    await cafe.save()

    sendToken(cafe, 200, res)
  }
})

// Add User
exports.addUser = catchAsyncErrors(async (req, res, next) => {
  const { name, email, mobileNumber, dialCode, countryCode } = req.body

  const isUser = await syncRegistration.findOne({ email })

  if (isUser) {
    return next(errFunc(res, 401, false, 'Email ID already exist'))
  }

  const user = await syncRegistration.create({ name, email, mobileNumber, dialCode, countryCode })

  const passwordSetToken = user.getResetPasswordToken()

  await user.save({ validateBeforeSave: false })

  const setPasswordUrl = `${req.protocol}://${process.env.HOST}/password/reset/${passwordSetToken}`

  const message = `Your password set token is :- \n\n ${setPasswordUrl} \n\nIf you have not requested this email then, please ignore it.`

  try {
    res.status(200).json({
      success: true,
      message: `Add user and Email sent to ${user.email} successfully`
    })

    await sendEmail({
      email: user.email,
      subject: 'Sync set Password',
      message
    })
  } catch (error) {
    user.resetPasswordToken = undefined
    user.resetPasswordExpire = undefined

    await user.save({ validateBeforeSave: false })

    return next(errFunc(res, 500, false, error.message))
  }
})

// Get User Detail
exports.getUserDetails = catchAsyncErrors(async (req, res, next) => {
  let user = await syncRegistration.findById(req.user.id).populate([{
    path: 'ratingReviews',
    populate: [
      { path: 'cafeData', model: cafeRegistration, select: 'establishmentName pictures streetAddress images city' },
      { path: 'userProfile', model: syncRegistration, select: 'name profileImage position country city' }
    ]
  },
  {
    path: 'ratingFilters',
    populate: [
      { path: 'cafeData', model: cafeRegistration, select: 'establishmentName pictures streetAddress images city' },
      { path: 'userProfile', model: syncRegistration, select: 'name profileImage position country city' }
    ]
  },
  {
    path: 'savedCafe',
    model: cafeRegistration,
    select: 'establishmentName pictures images streetAddress city latitude longitude'
  },
  {
    path: 'recommandCafes',
    model: recommendCafeSchema,
    select: 'establishmentName pictures streetAddress city latitude longitude ratingReviews reviewsNumber stars openHours images',
    populate: { path: 'ratingReviews', populate: { path: 'userProfile', model: syncRegistration, select: 'name schoolName profileImage' } }
  },
  {
    path: 'pinnedCafe',
    model: cafeRegistration,
    select: 'establishmentName pictures streetAddress city latitude longitude ratingReviews reviewsNumber stars openHours images',
    populate: { path: 'ratingReviews', populate: { path: 'userProfile', model: syncRegistration, select: 'name schoolName profileImage' } }
  },
  {
    path: 'requestConnection',
    model: syncRegistration,
    select: 'name schoolName profileImage connection',
    populate: { path: 'connection', model: syncRegistration, select: 'name schoolName profileImage connection' }
  },
  {
    path: 'sendConnection',
    model: syncRegistration,
    select: 'name schoolName profileImage connection',
    populate: { path: 'connection', model: syncRegistration, select: 'name schoolName profileImage connection' }
  },
  {
    path: 'connection',
    model: syncRegistration,
    select: 'name schoolName profileImage connection headline gender interest',
    populate: { path: 'connection', model: syncRegistration, select: 'name schoolName profileImage connection' }
  }]).exec()
  if (!user) {
    const cafe = await cafeRegistration.findById(req.user.id)
    if (cafe) {
      user = await cafeRegistration.find({ email: cafe.email }).populate([{ path: 'cafeId', model: cafeRegistration, select: 'establishmentName pictures streetAddress city' }, {
        path: 'ratingReviews',
        populate: [
          { path: 'cafeData', model: cafeRegistration, select: 'establishmentName pictures streetAddress city' },
          { path: 'userProfile', model: syncRegistration, select: 'name profileImage position country city' }
        ]
      },
      {
        path: 'ratingFilters',
        populate: [
          { path: 'cafeData', model: cafeRegistration, select: 'establishmentName pictures streetAddress city' },
          { path: 'userProfile', model: syncRegistration, select: 'name profileImage position country city' }
        ]
      }]).exec()
    }
  }
  if (!user) {
    user = await syncAdminRegistration.findById(req.user.id)
  }

  res.status(200).json({
    success: true,
    user
  })
})

// update User password
exports.updatePassword = catchAsyncErrors(async (req, res, next) => {
  const user = await syncRegistration.findById(req.user.id).select('+password')
  if (user) {
    const isPasswordMatched = await user.comparePassword(req.body.oldPassword)

    if (!isPasswordMatched) {
      return next(errFunc(res, 400, false, 'Old password is incorrect'))
    }

    user.password = req.body.newPassword

    await user.save()

    sendToken(user, 200, res)
  }
  const cafe = await cafeRegistration.findById(req.user.id).select('+password')
  const isPasswordMatched = await cafe.comparePassword(req.body.oldPassword)

  if (!isPasswordMatched) {
    return next(errFunc(res, 400, false, 'Old password is incorrect'))
  }
  cafe.syncClaim = false
  cafe.password = req.body.newPassword

  await cafe.save()

  sendToken(cafe, 200, res)

  if (!user && !cafe) {
    return next(errFunc(res, 401, false, 'User not found'))
  }
})

// Get all users(admin)
exports.getAllUser = catchAsyncErrors(async (req, res, next) => {
  const users = await syncRegistration.find().populate({
    path: 'connection',
    model: syncRegistration,
    select: 'name schoolName profileImage connection headline gender interest',
    populate: { path: 'connection', model: syncRegistration, select: 'name schoolName profileImage connection' }
  }).exec()

  res.status(200).json({
    success: true,
    users: users.reverse()
  })
})

// Get single user (admin)
exports.getSingleUser = catchAsyncErrors(async (req, res, next) => {
  const user = await syncRegistration.findById(req.params.id).populate([{
    path: 'ratingReviews',
    populate: [
      { path: 'cafeData', model: cafeRegistration, select: 'establishmentName pictures streetAddress images city' },
      { path: 'userProfile', model: syncRegistration, select: 'name profileImage position country city' }
    ]
  },
  {
    path: 'ratingFilters',
    populate: [
      { path: 'cafeData', model: cafeRegistration, select: 'establishmentName pictures streetAddress images city' },
      { path: 'userProfile', model: syncRegistration, select: 'name profileImage position country city' }
    ]
  },
  {
    path: 'savedCafe',
    model: cafeRegistration,
    select: 'establishmentName pictures streetAddress city images latitude longitude'
  },
  {
    path: 'recommandCafes',
    model: recommendCafeSchema,
    select: 'establishmentName pictures streetAddress city latitude longitude ratingReviews reviewsNumber stars openHours images',
    populate: { path: 'ratingReviews', populate: { path: 'userProfile', model: syncRegistration, select: 'name schoolName profileImage' } }
  },
  {
    path: 'pinnedCafe',
    model: cafeRegistration,
    select: 'establishmentName pictures streetAddress city images latitude longitude ratingReviews reviewsNumber openHours stars',
    populate: { path: 'ratingReviews', populate: { path: 'userProfile', model: syncRegistration, select: 'name schoolName profileImage' } }
  },
  {
    path: 'requestConnection',
    model: syncRegistration,
    select: 'name schoolName profileImage connection',
    populate: { path: 'connection', model: syncRegistration, select: 'name schoolName profileImage connection' }
  },
  {
    path: 'sendConnection',
    model: syncRegistration,
    select: 'name schoolName profileImage connection',
    populate: { path: 'connection', model: syncRegistration, select: 'name schoolName profileImage connection' }
  },
  {
    path: 'connection',
    model: syncRegistration,
    select: 'name schoolName profileImage connection',
    populate: { path: 'connection', model: syncRegistration, select: 'name schoolName profileImage connection' }
  }]).exec()

  if (!user) {
    return next(errFunc(res, 404, false, `User does not exist with Id: ${req.params.id}`))
  }

  res.status(200).json({
    success: true,
    user
  })
})

// update User Status -- Admin
exports.updateUserStatus = catchAsyncErrors(async (req, res, next) => {
  const user = await syncRegistration.findById(req.params.id)

  if (!user) {
    return next(errFunc(res, 404, false, `User does not exist with Id: ${req.params.id}`))
  }

  user.status = !user.status

  res.status(200).json({
    success: true,
    message: `${user.name} is ${
      user.status === true ? 'actived' : 'deactivated'
    }`
  })

  await user.save()
})

// Register User using social apps
exports.registerUserSocial = catchAsyncErrors(async (req, res, next) => {
  const isUser = await syncRegistration.findOne({ email: req.body.email })
  let isCafe
  let isAdmin
  if (!isUser) {
    isCafe = await cafeRegistration.findOne({ email: req.body.email })
  }
  if (!isUser && !isCafe) {
    isAdmin = await syncAdminRegistration.findOne({ email: req.body.email })
  }

  if (isUser || isCafe || isAdmin) {
    return next(errFunc(res, 401, false, `${req.body.email} already exist`))
  }

  const user = await syncRegistration.create(req.body)
  sendToken(user, 200, res)
})

// Login User using social apps
exports.loginUserSocial = catchAsyncErrors(async (req, res, next) => {
  const isUser = await syncRegistration.findOne({ email: req.body.email })
  let isCafe
  let isAdmin
  if (!isUser) {
    isCafe = await cafeRegistration.findOne({ email: req.body.email })
  }
  if (!isUser && !isCafe) {
    isAdmin = await syncAdminRegistration.findOne({ email: req.body.email })
  }

  if (isUser) {
    if (isUser.status === false) {
      res.status(403).json({
        success: false,
        message: 'Your account is temporary deactivated by admin'
      })
    } else {
      if (req.body.fcmToken !== '' && !isUser.fcmToken.some((e) => e === req.body.fcmToken)) {
        isUser.fcmToken.push(req.body.fcmToken)
        await isUser.save()
      }
      sendToken(isUser, 200, res)
    }
  }

  if (!isUser && isCafe && !isAdmin) {
    sendToken(isCafe, 200, res)
  }

  if (!isUser && !isCafe && isAdmin) {
    sendToken(isAdmin, 200, res)
  }

  if (!isUser && !isCafe && !isAdmin) {
    return next(errFunc(res, 404, false, `User does not exist with email: ${req.body.email}`))
  }
})

// Update admin data
exports.updateAdminData = catchAsyncErrors(async (req, res, next) => {
  const user = await syncAdminRegistration.findByIdAndUpdate(req.params.id, req.body, {
    new: true
  })

  if (!user) {
    return next(errFunc(res, 404, false, `User does not exist with Id: ${req.params.id}`))
  }

  res.status(200).json({
    success: true,
    message: `${user.name} is updated successfully`,
    user
  })

  await user.save()
})

exports.updateAdminPassword = catchAsyncErrors(async (req, res, next) => {
  const user = await syncAdminRegistration.findById(req.user.id).select('+password')

  const isPasswordMatched = await user.comparePassword(req.body.oldPassword)

  if (!isPasswordMatched) {
    return next(errFunc(res, 400, false, 'Old password is incorrect'))
  }

  user.password = req.body.newPassword

  await user.save()

  res.status(200).json({
    success: true,
    message: 'Password updated successfully'
  })
})

exports.deleteUser = catchAsyncErrors(async (req, res, next) => {
  const user = await syncRegistration.findById(req.user.id).exec()
  if (!user) {
    return next(errFunc(res, 404, false, `User does not exist with Id: ${req.user.id}`))
  }
  user.deletedData = {
    deleteTime: Date.now(),
    status: true,
    reason: req.body.reason,
    comment: req.body.comment
  }
  const data = { ...user.toObject() }
  await syncDeleteUser.create(data)
  user.name = 'Sync User'
  user.mobileNumber = undefined
  user.dialCode = undefined
  user.countryCode = ''
  user.bannerImage = undefined
  user.isVerified = false
  user.headline = ''
  user.companyName = ''
  user.position = ''
  user.industry = ''
  user.schoolName = ''
  user.country = ''
  user.postalCode = ''
  user.city = ''
  user.landline = undefined
  user.address = ''
  user.birthdayMonth = ''
  user.birthdayDate = ''
  user.website = ''
  user.about = ''
  user.photos = []
  user.savedCafe = []
  user.ratingReviews = []
  user.ratingFilters = []
  user.pinnedCafe = []
  user.profileImage = ''
  user.searchLocation = ''
  user.subscribeToConnect = {}
  await user.save({ isValidateBefore: false })
  res.status(200).json({
    success: true,
    message: 'Account deleted successfully'
  })
})

exports.getSameSchoolData = catchAsyncErrors(async (req, res, next) => {
  const sameSchoolData = await syncRegistration.find({ schoolName: req.params.schoolname })
  res.status(200).json({
    success: true,
    sameSchoolData
  })
})

exports.getSamePinnedCafe = catchAsyncErrors(async (req, res, next) => {
  const samePinnedData = await cafeRegistration.find({ _id: { $in: req.body.pinnedCafe } },
    { pinnedCafe: 1, establishmentName: 1 }).populate({ path: 'pinnedUser', model: syncRegistration, select: 'name schoolName profileImage connection', populate: { path: 'connection', model: syncRegistration, select: 'name schoolName profileImage connection' } }).exec()
  res.status(200).json({
    success: true,
    samePinnedData
  })
})

exports.getSameInterest = catchAsyncErrors(async (req, res, next) => {
  const userList = await syncRegistration.find()
  const sameInterestUsers = []
  req.body?.interest?.forEach((item) => {
    userList?.forEach((e) => {
      if (e?.interest?.some((a) => a === item)) {
        if (!(sameInterestUsers?.some((b) => b?._id === e?._id))) {
          sameInterestUsers.push(e)
        }
      }
    })
  })
  res.status(200).json({
    success: true,
    sameInterestUsers
  })
})

exports.fcmTokenAdd = catchAsyncErrors(async (req, res, next) => {
  const user = await syncRegistration.findById(req.user.id)
  if (!user) {
    return next(errFunc(res, 404, false, `User does not exist with Id: ${req.user.id}`))
  }
  if (!user.fcmToken.some((e) => e === req.body.fcmToken)) {
    user?.fcmToken?.push(req.body.fcmToken)
    await user.save()
  }
  res.status(200).json({
    success: true,
    message: 'Fcmtoken added successfully'
  })
})
