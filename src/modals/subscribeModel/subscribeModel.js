const mongoose = require('mongoose')

const subscribeSchema = new mongoose.Schema({
  name: {
    type: String
  },
  email: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now()
  }
})

const syncSubscribe = mongoose.model('sync_people_subscriber', subscribeSchema)

module.exports = syncSubscribe
