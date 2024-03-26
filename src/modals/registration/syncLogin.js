const mongoose = require('mongoose')

const loginSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  }
})

const syncLogin = mongoose.model('sync_login', loginSchema)

module.exports = syncLogin
