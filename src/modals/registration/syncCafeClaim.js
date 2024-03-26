const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const Schema = mongoose.Schema

const cafeClaim = new mongoose.Schema({
  name: {
    type: String
  },
  email: {
    type: String
  },
  password: {
    type: String,
    select: false
  },
  phone: {
    type: String
  },
  dialCode: {
    type: String
  },
  countryCode: {
    type: String
  },
  position: {
    type: String
  },
  cafeId: {
    type: Schema.Types.ObjectId,
    ref: 'syncCafeRegistration'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isApproved: {
    type: String,
    default: 'pending'
  },
  verifyUserToken: {
    type: String,
    select: false
  },
  verifyUserExpire: {
    type: Date,
    select: false
  }
})

cafeClaim.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next()
  }

  this.password = await bcrypt.hash(this.password, 10)
})

// Generating Verify User Reset Token
cafeClaim.methods.getVerifyUserToken = function () {
  // Generating Token
  const verifyToken = crypto.randomBytes(20).toString('hex')

  // Hashing and adding verifyToken to userSchema
  this.verifyUserToken = crypto
    .createHash('sha256')
    .update(verifyToken)
    .digest('hex')

  this.verifyUserExpire = Date.now() + 15 * 60 * 1000

  return verifyToken
}

const syncCafeClaim = mongoose.model(
  'sync_cafeClaim',
  cafeClaim
)

module.exports = syncCafeClaim
