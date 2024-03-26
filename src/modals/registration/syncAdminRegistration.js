const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

const adminRegisterSchema = new mongoose.Schema({
  name: {
    type: String
  },
  email: {
    type: String,
    unique: true
  },
  password: {
    type: String,
    select: false
  },
  role: {
    type: String,
    default: 'admin'
  },
  fcmToken: {
    type: Array
  },
  status: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },

  resetPasswordToken: String,
  resetPasswordExpire: Date,

  verifyUserToken: String,
  verifyUserExpire: Date
})

adminRegisterSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next()
  }

  this.password = await bcrypt.hash(this.password, 10)
})

// JWT TOKEN
adminRegisterSchema.methods.getJWTToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  })
}

// Compare Password

adminRegisterSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password)
}

// Generating Password Reset Token
adminRegisterSchema.methods.getResetPasswordToken = function () {
  // Generating Token
  const resetToken = crypto.randomBytes(20).toString('hex')

  // Hashing and adding resetPasswordToken to userSchema
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex')

  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000

  return resetToken
}

const syncAdminRegistration = mongoose.model(
  'sync_admin_registration',
  adminRegisterSchema
)

module.exports = syncAdminRegistration
