const admin = require('../utils/firebaseConnection')
const syncRegistration = require('../modals/registration/syncRegistration')
const sendEmail = require('../utils/sendEmail')

module.exports = function (server) {
  const io = require('socket.io')(server, {
    pingTimeout: 60000,
    cors: {
      origin: '*',
      wsEngine: 'ws',
      credentials: true
    }
  })

  io.on('connection', async (socket) => {
    socket.on('setup', (userData) => {
      socket.join(userData._id)
      socket.emit('connected')
    })

    socket.on('sendConnection', async (userId, profileId, callback) => {
      try {
        await handleConnectionRequest(userId, profileId, callback, socket)
      } catch (err) {
        socket.emit('count error', err.message)
      }
    })

    socket.on('cancelConnection', async (userId, profileId, callback) => {
      try {
        await handleCancelConnection(userId, profileId, callback)
      } catch (err) {
        socket.emit('count error', err.message)
      }
    })

    socket.on('acceptConnection', async (userId, profileId, callback) => {
      try {
        await handleAcceptConnection(userId, profileId, callback)
      } catch (err) {
        socket.emit('count error', err.message)
      }
    })

    socket.on('ignoreConnection', async (userId, profileId, callback) => {
      try {
        await handleIgnoreConnection(userId, profileId, callback)
      } catch (err) {
        socket.emit('count error', err.message)
      }
    })

    socket.on('unfollowConnection', async (userId, profileId, callback) => {
      try {
        await handleUnfollowConnection(userId, profileId, callback)
      } catch (err) {
        socket.emit('count error', err.message)
      }
    })

    socket.off('offsetup', (userData) => {
      console.log('USER DISCONNECTED')
      socket.leave(userData._id)
    })

    async function handleConnectionRequest (userId, profileId, callback, socket) {
      const [createRequest, requestedUser] = await Promise.all([
        syncRegistration.findOne({ _id: profileId }),
        syncRegistration.findOne({ _id: userId })
      ])

      requestedUser.requestConnection.push(profileId)
      createRequest.sendConnection.push(userId)
      const bulkOps = [
        { updateOne: { filter: { _id: requestedUser._id }, update: { $set: { requestConnection: requestedUser.requestConnection } } } },
        { updateOne: { filter: { _id: createRequest._id }, update: { $set: { sendConnection: createRequest.sendConnection } } } }
      ]
      await syncRegistration.bulkWrite(bulkOps)

      const [user, userRequested] = await Promise.all([
        populateUser(syncRegistration.findOne({ _id: profileId })),
        populateUser(syncRegistration.findOne({ _id: userId }))
      ])

      callback(user)

      socket.broadcast.emit('getConnection', userRequested)

      updateUserNotification(userRequested, `${user?.name} sent you a friend request`)
      await sendFriendRequestNotification(userRequested, user?.name, user?.profileImage)
      await sendEmail({
        email: userRequested.email,
        subject: 'You have a new friend request!',
        message: `You've just received a friend request from ${user.name}. To connect with them, simply click the link below:  \n \n \n \n https://syncremote.co/people`
      })
      await removeInvalidFcmTokens(userRequested, user)
    }

    async function handleCancelConnection (userId, profileId, callback) {
      const [createRequest, requestedUser] = await Promise.all([
        syncRegistration.findOne({ _id: profileId }),
        syncRegistration.findOne({ _id: userId })
      ])
      const filterRequestedUser = requestedUser.requestConnection.filter(e => e !== profileId)
      const filterCreateUser = createRequest.sendConnection.filter(e => e !== userId)
      const bulkOps = [
        { updateOne: { filter: { _id: requestedUser._id }, update: { $set: { requestConnection: filterRequestedUser } } } },
        { updateOne: { filter: { _id: createRequest._id }, update: { $set: { sendConnection: filterCreateUser } } } }
      ]

      await syncRegistration.bulkWrite(bulkOps)

      const [user, userRequested] = await Promise.all([
        populateUser(syncRegistration.findOne({ _id: profileId })),
        populateUser(syncRegistration.findOne({ _id: userId }))
      ])
      callback(user)

      userRequested.notification = userRequested.notification.filter(e => e.body !== `${user?.name} sent you a friend request`)

      await userRequested.save()
    }

    async function handleAcceptConnection (userId, profileId, callback) {
      const [createRequest, requestedUser] = await Promise.all([
        syncRegistration.findOne({ _id: profileId }),
        syncRegistration.findOne({ _id: userId })
      ])

      const filterRequestedUser = requestedUser.sendConnection.filter(e => e !== profileId)
      const filterCreateUser = createRequest.requestConnection.filter(e => e !== userId)

      requestedUser.sendConnection = filterRequestedUser
      createRequest.requestConnection = filterCreateUser

      requestedUser.connection.push(profileId)
      createRequest.connection.push(userId)

      const bulkOps = [
        { updateOne: { filter: { _id: requestedUser._id }, update: { $set: { sendConnection: requestedUser.sendConnection, connection: requestedUser.connection } } } },
        { updateOne: { filter: { _id: createRequest._id }, update: { $set: { requestConnection: createRequest.requestConnection, connection: createRequest.connection } } } }
      ]

      await syncRegistration.bulkWrite(bulkOps)

      const [user, userRequested] = await Promise.all([
        populateUser(syncRegistration.findOne({ _id: profileId })),
        populateUser(syncRegistration.findOne({ _id: userId }))
      ])

      callback(user)

      user.notification = user.notification.filter(e => e.body !== `${userRequested?.name} sent you a friend request`)
      user.lastNotification = user.lastNotification - 1
      await user.save()

      socket.broadcast.emit('getConnection', userRequested)

      updateUserNotification(userRequested, `${user?.name} accepted your friend request`)

      await sendFriendRequestNotification(userRequested, user?.name, user?.profileImage)

      await removeInvalidFcmTokens(userRequested, user)
    }

    async function handleIgnoreConnection (userId, profileId, callback) {
      const [createRequest, requestedUser] = await Promise.all([
        syncRegistration.findOne({ _id: profileId }),
        syncRegistration.findOne({ _id: userId })
      ])

      const filterRequestedUser = requestedUser.sendConnection.filter(e => e !== profileId)
      const filterCreateUser = createRequest.requestConnection.filter(e => e !== userId)

      requestedUser.sendConnection = filterRequestedUser
      createRequest.requestConnection = filterCreateUser

      const bulkOps = [
        { updateOne: { filter: { _id: requestedUser._id }, update: { $set: { sendConnection: requestedUser.sendConnection } } } },
        { updateOne: { filter: { _id: createRequest._id }, update: { $set: { requestConnection: createRequest.requestConnection } } } }
      ]

      await syncRegistration.bulkWrite(bulkOps)

      const [user, userRequested] = await Promise.all([
        populateUser(syncRegistration.findOne({ _id: profileId })),
        populateUser(syncRegistration.findOne({ _id: userId }))
      ])

      callback(user)

      user.notification = user.notification.filter(e => e.body !== `${userRequested?.name} sent you a friend request`)
      await user.save()

      socket.broadcast.emit('getConnection', userRequested)
    }

    async function handleUnfollowConnection (userId, profileId, callback) {
      const [createRequest, requestedUser] = await Promise.all([
        syncRegistration.findOne({ _id: profileId }),
        syncRegistration.findOne({ _id: userId })
      ])

      const filterCreateUser = createRequest.connection.filter(e => e !== userId)
      const filterRequestedUser = requestedUser.connection.filter(e => e !== profileId)

      const bulkOps = [
        { updateOne: { filter: { _id: requestedUser._id }, update: { $set: { connection: filterRequestedUser } } } },
        { updateOne: { filter: { _id: createRequest._id }, update: { $set: { connection: filterCreateUser } } } }
      ]

      await syncRegistration.bulkWrite(bulkOps)

      const [user, userRequested] = await Promise.all([
        populateUser(syncRegistration.findOne({ _id: profileId })),
        populateUser(syncRegistration.findOne({ _id: userId }))
      ])

      callback(user)

      socket.broadcast.emit('getConnection', userRequested)
    }

    async function populateUser (query) {
      return query
        .populate([
          { path: 'requestConnection', model: syncRegistration, select: 'name schoolName profileImage connection', populate: { path: 'connection', model: syncRegistration, select: 'name schoolName profileImage connection' } },
          { path: 'sendConnection', model: syncRegistration, select: 'name schoolName profileImage connection', populate: { path: 'connection', model: syncRegistration, select: 'name schoolName profileImage connection' } },
          { path: 'connection', model: syncRegistration, select: 'name schoolName profileImage connection', populate: { path: 'connection', model: syncRegistration, select: 'name schoolName profileImage connection' } }
        ])
        .exec()
    }

    async function updateUserNotification (userRequested, notificationBody) {
      userRequested.notification = userRequested.notification.filter((e) => e.body !== notificationBody)
      await userRequested.save()
    }

    async function sendFriendRequestNotification (userRequested, userName, userImage) {
      userRequested.notification.push({
        body: `${userName} sent you a friend request`,
        userId: userRequested._id,
        data: {
          name: userName,
          image: userImage
        },
        role: 'user',
        status: false
      })

      await userRequested.save()

      if (userRequested.fcmToken.length > 0) {
        userRequested.fcmToken.forEach(async (e, index) => {
          await sendFcmMessage(userRequested, userName)
        })
      }
    }

    async function sendFcmMessage (userRequested, userName) {
      const messages = userRequested.fcmToken.map((token) => {
        return {
          data: {
            title: 'New Message',
            body: `${userName} sent you a friend request`
          },
          token
        }
      })

      try {
        const responses = await Promise.all(messages.map((message) => admin.messaging().send(message)))
        console.log('Messages sent successfully:', responses)
      } catch (error) {
        console.error('Error sending messages:', error)
      }
    }

    async function removeInvalidFcmTokens (userRequested, user) {
      const removeFcm = []

      if (userRequested.fcmToken.length > 0) {
        userRequested.fcmToken.forEach(async (e, index) => {
          try {
            await sendFcmMessage(userRequested, user?.name)
          } catch (error) {
            removeFcm.push(index)
            console.error('Error sending message:', error)
          }
        })
      }

      function removeIndexes (arr, indexes) {
        return arr.filter((value, index) => !indexes.includes(index))
      }

      if (removeFcm.length > 0) {
        const newArray = removeIndexes(userRequested.fcmToken, removeFcm)
        userRequested.fcmToken = newArray
        await userRequested.save()
      }
    }
  })
}
