const catchAsyncErrors = require('../../middleware/catchAsyncErrors')
const syncCafeRegistration = require('../../modals/cafeRegistration/cafeRegistration')
const syncRegistration = require('../../modals/registration/syncRegistration')
const peopleSubscribers = require('../../modals/subscribeModel/subscribeModel')
const sendContactEmail = require('../../utils/sendContactEmail')
const { errFunc } = require('../../utils/sendResponse')
const admin = require('../../utils/firebaseConnection')

exports.updateDetails = catchAsyncErrors(async (req, res, next) => {
  const user = await syncRegistration.findByIdAndUpdate(req.user.id, req.body, {
    new: true
  }).populate([{
    path: 'ratingReviews',
    populate: [
      { path: 'cafeData', model: syncCafeRegistration, select: 'establishmentName pictures streetAddress city' },
      { path: 'userProfile', model: syncRegistration, select: 'name profileImage position country city' }
    ]
  },
  {
    path: 'ratingFilters',
    populate: [
      { path: 'cafeData', model: syncCafeRegistration, select: 'establishmentName pictures streetAddress city' },
      { path: 'userProfile', model: syncRegistration, select: 'name profileImage position country city' }
    ]
  },
  {
    path: 'savedCafe',
    model: syncCafeRegistration,
    select: 'establishmentName pictures streetAddress city latitude longitude'
  },
  {
    path: 'pinnedCafe',
    model: syncCafeRegistration,
    select: 'establishmentName pictures streetAddress city latitude longitude'
  }, {
    path: 'connection', model: syncRegistration, select: 'notification fcmToken', populate: { path: 'connection', model: syncRegistration, select: 'name schoolName profileImage connection' }
  }]).exec()
  if (!user) {
    return next(errFunc(res, 404, false, `User does not exist with Id: ${req.user.id}`))
  }
  if (req.body.photos) {
    const uniqueId = req.body.photos[req.body.photos?.length - 1]?.cafe?.id
    if (uniqueId) {
      const cafe = await syncCafeRegistration.findById({ _id: uniqueId })
      cafe.postByUsers = [...cafe.postByUsers, {
        id: user?._id,
        name: user?.name,
        image: req.body.photos[req.body.photos?.length - 1]?.image,
        description: req.body.photos[req.body.photos?.length - 1]?.description
      }]
      await cafe.save()
    }
    const notificationMessage = {
      body: `${user?.name} added a photo`,
      userId: user?._id,
      data: {
        name: user?.name,
        image: user?.profileImage
      },
      role: 'user',
      status: false
    }
    const updateNotificationPromises = []
    user.connection.forEach((e) => {
      e?.fcmToken.forEach((a) => {
        const message = {
          data: {
            title: 'New Message',
            body: `${user?.name} added a photo`
          },
          token: a
        }
        admin.messaging().send(message)
          .then((response) => {
            console.log('Message sent successfully:', response)
          })
          .catch(async (error) => {
            console.error('Error sending message:', error)
          })
      })
      e.notification = notificationMessage
      updateNotificationPromises.push(e.save())
    })
    await Promise.all(updateNotificationPromises)
  }
  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    user
  })
})

exports.locationSearch = catchAsyncErrors(async (req, res, next) => {
  const user = await syncRegistration.findById(req.user.id)
  if (!user) {
    return next(errFunc(res, 404, false, `User does not exist with Id: ${req.user.id}`))
  }
  const checkData = user.searchLocation.some(e => e.placeName === req.body.searchLocation.placeName)
  if (!checkData) {
    user.searchLocation = [...user.searchLocation, req.body.searchLocation]
    user.save()
    res.status(200).json({
      success: true,
      message: 'Save location successfully'
    })
  }
  res.status(400).json({
    success: true,
    message: 'location already exist'
  })
})

exports.saveCafe = catchAsyncErrors(async (req, res, next) => {
  const user = await syncRegistration.findById(req.user.id)
  if (!user) {
    return next(errFunc(res, 404, false, `User does not exist with Id: ${req.user.id}`))
  }
  if (user.savedCafe.length > 0 && user.savedCafe.some((e) => e.toString() === req.params.id)) {
    user.savedCafe = user.savedCafe.filter((cafeId) => cafeId.toString() !== req.params.id)
    await user.save()
    res.status(200).json({
      success: true,
      message: 'Removed cafe successfully'
    })
  } else {
    user.savedCafe.push(req.params.id)
    await user.save()
    res.status(200).json({
      success: true,
      message: 'Saved cafe successfully'
    })
  }
})

exports.reviews = catchAsyncErrors(async (req, res, next) => {
  const user = await syncRegistration.findById(req.user.id)
  if (!user) {
    return next(errFunc(res, 404, false, `User does not exist with Id: ${req.user.id}`))
  }
  const cafe = await syncCafeRegistration.findById(req.params.id)
  if (!cafe) {
    return next(errFunc(res, 404, false, `Cafe does not exist with Id: ${req.params.id}`))
  }
  user.ratingReviews.push(req.body.ratingReviews)
  cafe.ratingReviews.push(req.body.ratingReviews)
  await user.save()
  await cafe.save()
  res.status(200).json({
    success: true,
    message: 'Ratings added successfully'
  })
})

exports.reviewsFilter = catchAsyncErrors(async (req, res, next) => {
  const user = await syncRegistration.findById(req.user.id)
  if (!user) {
    return next(errFunc(res, 404, false, `User does not exist with Id: ${req.user.id}`))
  }
  const cafe = await syncCafeRegistration.findById(req.params.id)
  if (!cafe) {
    return next(errFunc(res, 404, false, `Cafe does not exist with Id: ${req.params.id}`))
  }
  user.ratingFilters.push(req.body.ratingFilters)
  cafe.ratingFilters.push(req.body.ratingFilters)
  const totalValue = cafe.ratingFilters.reduce((acc, item, index) => {
    acc += item.wifiQuality
    return acc
  }, 0)
  cafe.wifiRating = Math.round(totalValue / cafe.ratingFilters.length)
  await user.save()
  await cafe.save()
  res.status(200).json({
    success: true,
    message: 'Ratings added successfully'
  })
})

exports.pinCafe = catchAsyncErrors(async (req, res, next) => {
  const user = await syncRegistration.findById(req.user.id)
  const cafe = await syncCafeRegistration.findById(req.params.id)
  if (!user || !cafe) {
    return next(errFunc(res, 404, false, `User does not exist with Id: ${req.user.id}`))
  }
  if (user.pinnedCafe.some(e => e === req.params.id)) {
    const filterPin = user.pinnedCafe.filter(e => e !== req.params.id)
    const cafeFilterPin = cafe.pinnedUser.filter(e => e !== req.user.id)
    user.pinnedCafe = filterPin
    cafe.pinnedUser = cafeFilterPin
    await user.save()
    await cafe.save()
    res.status(200).json({
      success: true,
      message: 'Cafe removed from map'
    })
  } else {
    user.pinnedCafe.push(req.params.id)
    cafe.pinnedUser.push(req.user.id)
    await user.save()
    await cafe.save()
    res.status(200).json({
      success: true,
      message: 'Cafe pinned on map'
    })
  }
})

// exports.mapFunc = catchAsyncErrors(async (req, res, next) => {
//   const fetchKey = await fetch(`https://api.mapbox.com/tokens/v2/${process.env.MAPBOX_USERNAME}?access_token=${process.env.MAPBOX_API_KEY}`, {
//     method: 'post',
//     headers: {
//       'Content-Type': 'application/json'
//     },
//     body: JSON.stringify({
//       note: `${process.env.MAPBOX_USERNAME}`,
//       scopes: ['styles:read', 'fonts:read']
//     })
//   }).then(data => data.json()).then(res => {
//     return res
//   }).catch(e => console.log(e, 'eee'))
//   res.status(200).json({
//     success: true,
//     fetchKey: fetchKey?.token
//   })
// })

exports.subscribe = catchAsyncErrors(async (req, res, next) => {
  await peopleSubscribers.create(req.body)
  await sendContactEmail({
    email: req.body.email,
    to: 'pablo.martinez@syncremote.co',
    subject: 'Subscribe to connect',
    message: 'Subscribe to connect',
    name: req.body.name
  })
  res.status(200).json({
    success: true,
    message: 'Subscribe successfully'
  })
})

exports.getAllSubscribe = catchAsyncErrors(async (req, res, next) => {
  const subscribers = await peopleSubscribers.find()
  res.status(200).json({
    success: true,
    subscribers: subscribers.reverse()
  })
})

exports.isSearchLocation = catchAsyncErrors(async (req, res, next) => {
  const user = await syncRegistration.findById(req.user.id)
  if (!user) {
    return next(errFunc(res, 404, false, `User does not exist with Id: ${req.user.id}`))
  }
  user.isSearchLocation = req.body.isSearchLocation
  await user.save()
  res.status(200).json({
    success: true
  })
})

exports.updateOnce = catchAsyncErrors(async (req, res, next) => {
  const user = await syncRegistration.findOneAndUpdate({ email: req.body.email }, req.body, {
    new: true
  })
  if (!user) {
    return next(errFunc(res, 404, false, `User does not exist with email: ${req.body.email}`))
  }
  res.status(200).json({
    success: true,
    message: 'Profile updated successfully'
  })
})

exports.updateNotification = catchAsyncErrors(async (req, res, next) => {
  const user = await syncRegistration.findById(req.user.id)
  if (!user) {
    return next(errFunc(res, 404, false, `User does not exist with email: ${req.body.email}`))
  }
  user.notification.forEach((item) => {
    if (item.status === false) {
      item.status = true
    }
  })
  await user.save()
  res.status(200).json({
    success: true,
    message: 'Profile updated successfully'
  })
})

exports.updateNotificationLength = catchAsyncErrors(async (req, res, next) => {
  const user = await syncRegistration.findById(req.user.id)
  if (!user) {
    return next(errFunc(res, 404, false, `User does not exist with email: ${req.body.email}`))
  }
  user.lastNotification = req.body.notificationLength
  await user.save()
  res.status(200).json({
    success: true,
    message: 'Profile updated successfully'
  })
})
