const catchAsyncErrors = require('../../middleware/catchAsyncErrors')
const syncCafeRegistration = require('../../modals/cafeRegistration/cafeRegistration')
const syncCafeRecommendation = require('../../modals/recommendModel/recommendSchema')
const syncRegistration = require('../../modals/registration/syncRegistration')
const sendEmail = require('../../utils/sendEmail')
const { errFunc } = require('../../utils/sendResponse')
const admin = require('../../utils/firebaseConnection')

exports.syncRecommend = catchAsyncErrors(async (req, res, next) => {
  await syncCafeRecommendation.create(req.body)
  res.status(200).json({
    success: true,
    message: 'Recommend Successul'
  })
})

exports.syncAllRecommend = catchAsyncErrors(async (req, res, next) => {
  if (!req.params.id) {
    const users = await syncCafeRecommendation.find()
    res.status(200).json({
      success: true,
      users: users.reverse()
    })
  } else {
    const users = await syncCafeRecommendation.findById(req.params.id).populate([{ path: 'recommendBy', model: syncRegistration, select: 'email name' }, {
      path: 'ratingReviews',
      populate: [
        { path: 'userProfile', model: syncRegistration, select: 'name profileImage position country city' }
      ]
    }]).exec()
    res.status(200).json({
      success: true,
      users
    })
    if (!users) {
      return next(errFunc(res, 404, false, `cafe does not exist with Id: ${req.params.id}`))
    }
  }
})

exports.recommendResult = catchAsyncErrors(async (req, res, next) => {
  const cafe = await syncCafeRecommendation.findById(req.body.id).populate({ path: 'recommendBy', model: syncRegistration, select: 'email name fcmToken notification connection recommandCafes', populate: { path: 'connection', model: syncRegistration, select: 'email name fcmToken notification' } }).exec()
  if (!cafe) {
    return next(errFunc(res, 404, false, `Cafe does not exist with Id: ${req.body.id}`))
  }

  cafe.isAccepted = req.body.resolution
  if (req.body.resolution === 'Approved') {
    try {
      const email = `${Date.now()}example@gmail.com`
      const status = true

      // Create and save the cafe data
      const dataCafe = { ...cafe.toObject(), email, status }
      const createNewCafe = await syncCafeRegistration.create(dataCafe)
      // Send notifications if recommendBy and fcmToken exist
      cafe.recommendBy.recommandCafes.push(createNewCafe._id.toString())
      cafe.recommendBy.notification.push({
        body: `Your recommended cafe ${createNewCafe.establishmentName} is Approved`,
        userId: createNewCafe._id,
        data: {
          name: createNewCafe?.establishmentName,
          pictures: createNewCafe?.pictures,
          images: createNewCafe?.images
        },
        role: 'cafe',
        status: false
      })

      await cafe.recommendBy.save()
      if (cafe.recommendBy.fcmToken.length > 0) {
        const message = {
          data: {
            title: 'New Message',
            body: `Your recommended cafe ${cafe.establishmentName} is Approved`
          }
        }

        // Send messages to all fcmTokens
        const sendPromises = cafe.recommendBy.fcmToken.map(token =>
          admin.messaging().send({ ...message, token })
        )

        // Wait for all messages to be sent
        const responses = await Promise.all(sendPromises)
        console.log('Messages sent successfully:', responses)
      }
      const notificationMessage = {
        body: `${cafe.recommendBy.name}'s recommended cafe ${cafe.establishmentName} is Approved`,
        userId: createNewCafe._id,
        data: {
          name: cafe?.establishmentName,
          pictures: cafe?.pictures,
          images: cafe?.images
        },
        role: 'cafe',
        status: false
      }
      const updateNotificationPromises = []
      cafe.recommendBy.connection.forEach((e) => {
        console.log(e, 'asdasdasdasdsadasdasdasd')
        e?.fcmToken.forEach((a) => {
          const message = {
            data: {
              title: 'New Message',
              body: `${cafe.recommendBy.name}'s recommended cafe ${cafe.establishmentName} is Approved`
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
    } catch (error) {
      console.error('Failed to create data in syncCafeRegistration:', error)
    }
  }

  await cafe.save()

  res.status(200).json({
    success: true,
    message: `${cafe.establishmentName} is ${req.body.resolution} successfully.`
  })

  if (cafe.recommendBy.name) {
    await sendEmail({
      email: cafe.recommendBy.email,
      subject: req.body.resolution === 'Approved' ? 'Your recommended cafe is Approved' : 'Your recommended cafe is rejected',
      message: req.body.message
    })
  }
})
