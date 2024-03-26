const catchAsyncErrors = require('../../middleware/catchAsyncErrors')
const syncCafeRegistration = require('../../modals/cafeRegistration/cafeRegistration')
const syncRegistration = require('../../modals/registration/syncRegistration')
const sendEmail = require('../../utils/sendEmail')
const { errFunc } = require('../../utils/sendResponse')
const crypto = require('crypto')

exports.syncClaim = catchAsyncErrors(async (req, res, next) => {
  const isAlreadyUser = await syncRegistration.findOne({ email: req.body.email })
  if (isAlreadyUser) {
    return next(errFunc(res, 401, false, 'Email ID already exist'))
  }
  const isUser = await syncCafeRegistration.find({ email: req.body.email, role: 'cafeClaim' })
  if (isUser.length > 0) {
    const filterCafe = isUser?.filter(z => z.isVerified === false)
    if (filterCafe?.length > 0) {
      // Get verifyUser Token
      await syncCafeRegistration.updateOne({ _id: filterCafe[0]._id }, req.body)
      const verifyToken = filterCafe[0].getVerifyUserToken()
      await filterCafe[0].save({ validateBeforeSave: false })
      const verifyUserUrl = `${req.protocol}://${process.env.HOST}/cafeclaim/${verifyToken}`
      const message = `Thanks so much for signing up to claim your free business profile on Sync! We're really excited to have you as part of our community. Please click the link below to verify your email: \n\n ${verifyUserUrl}`

      res.status(200).json({
        success: true,
        message: `Email sent to ${filterCafe[0].email} successfully`
      })
      await sendEmail({
        email: filterCafe[0].email,
        subject: 'Welcome to Sync! Please verify your email ',
        message
      })
    } else {
      const cafe = await syncCafeRegistration.findOne({ _id: req.body.cafeId })
      cafe.isMember = 'yes'
      await cafe.save()
      const mergedData = { ...cafe.toObject(), ...req.body, role: 'cafeClaim', isSubmitted: true, isAccepted: 'pending', status: false }
      delete mergedData?._id
      const user = await syncCafeRegistration.create(mergedData)
      const verifyToken = user.getVerifyUserToken()
      // Get verifyUser Token

      await user.save({ validateBeforeSave: false })
      const verifyUserUrl = `${req.protocol}://${process.env.HOST}/cafeclaim/${verifyToken}`
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
    }
  } else {
    const cafe = await syncCafeRegistration.findOne({ _id: req.body.cafeId })
    cafe.isMember = 'yes'
    await cafe.save()
    const mergedData = { ...cafe.toObject(), ...req.body, role: 'cafeClaim', isSubmitted: true, isAccepted: 'pending', status: false }
    delete mergedData?._id
    const user = await syncCafeRegistration.create(mergedData)
    // Get verifyUser Token
    const verifyToken = user.getVerifyUserToken()

    await user.save({ validateBeforeSave: false })

    const verifyUserUrl = `${req.protocol}://${process.env.HOST}/cafeclaim/${verifyToken}`

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
  }
})

exports.verifyCafeClaim = catchAsyncErrors(async (req, res, next) => {
  // creating token hash
  const verifyUserToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex')
  const user = await syncCafeRegistration.findOne({
    verifyUserToken
  })

  if (user && user.isVerified === false && user.verifyUserExpire < Date.now()) {
    await user.deleteOne()
    return errFunc(
      res,
      400,
      false`Verify User Token is invalid or has been expired`
    )
  }

  if (user && user.isVerified === true) {
    return errFunc(res, 400, false, 'User already verified')
  }

  if (!user) {
    return errFunc(
      res,
      400,
      false,
      'Verify User Token is invalid or has been expired'
    )
  }
  user.isVerified = true

  await user.save()
  res.status(200).json({
    status: true,
    message: 'Email verified successfully'
  })
})

exports.getAllClaimRequest = catchAsyncErrors(async (req, res, next) => {
  if (!req?.params?.id) {
    const users = await syncCafeRegistration.find({ role: 'cafeClaim' }).populate({ path: 'cafeId', model: syncCafeRegistration, select: 'establishmentName pictures streetAddress city' }).exec()
    res.status(200).json({
      success: true,
      users: users.reverse()
    })
  } else {
    const users = await syncCafeRegistration.findById(req.params.id).populate({ path: 'cafeId', model: syncCafeRegistration, select: 'establishmentName pictures streetAddress city' }).exec()
    if (!users) {
      return next(errFunc(res, 404, false, `cafe does not exist with Id: ${req.params.id}`))
    }
    res.status(200).json({
      success: true,
      users
    })
  }
})

exports.claimResult = catchAsyncErrors(async (req, res, next) => {
  const cafe = await syncCafeRegistration.findById(req.body.id).select('+password').populate({ path: 'cafeId', model: syncCafeRegistration, select: 'establishmentName pictures streetAddress city' }).exec()
  const pass = cafe?.password
  if (!cafe) {
    return next(errFunc(res, 404, false, `cafe does not exist with Id: ${req.body.id}`))
  }
  cafe.isAccepted = req.body.resolution
  await cafe.save()
  const searchCafe = await syncCafeRegistration.findOne(cafe.cafeId?._id).select('+password')
  if (!searchCafe) {
    return next(errFunc(res, 404, false, `cafe does not exist with Id: ${req.body.id}`))
  }
  if (req.body.resolution === 'Approved') {
    const data = cafe.toObject()
    console.log(data)
    delete data?._id
    await syncCafeRegistration.updateOne({ _id: cafe.cafeId?._id }, { ...data, isAccepted: 'Approved', syncClaim: true, password: pass, role: 'cafe', status: true })
    // searchCafe.isMember = true
    // searchCafe.email = cafe?.email
    // searchCafe.name = cafe?.name
    // searchCafe.password = pass
    // searchCafe.phone = cafe?.phone
    // searchCafe.dialCode = cafe?.dialCode
    // searchCafe.countryCode = cafe?.countryCode
    // searchCafe.position = cafe?.position
    // searchCafe.isVerified = cafe?.isVerified
    // searchCafe.isAccepted = cafe?.isApproved
    // searchCafe.syncClaim = true
    // searchCafe.isClaimed = true
    // searchCafe.isFirst = true
    // searchCafe.isSubmitted = true
    // searchCafe.isCertify = true
    // searchCafe.isAgreeUser = true
    // await searchCafe.save()
    await syncCafeRegistration.deleteOne({ _id: req.body.id })
  }
  if (req.body.resolution === 'Rejected') {
    searchCafe.isMember = 'no'
    await searchCafe.save()
  }
  res.status(200).json({
    success: true,
    message: `${searchCafe.establishmentName} is ${req.body.resolution} successfully.`
  })
  await sendEmail({
    email: cafe.email,
    subject: req.body.resolution === 'Approved' ? 'Welcome aboard! Your business listing access is approved' : 'Update on your business profile',
    message: req.body.message
  })
})
