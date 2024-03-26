const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const Schema = mongoose.Schema

const ratingReviews = {
  uniqueId: String,
  cafeData: {
    type: Schema.Types.ObjectId,
    ref: 'syncCafeRegistration'
  },
  message: String,
  photos: Array,
  amenities: Array,
  point: Number,
  userProfile: {
    type: Schema.Types.ObjectId,
    ref: 'syncRegistration'
  },
  reply: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
}

const ratingFilters = {
  atmosphere: Number,
  cafeData: {
    type: Schema.Types.ObjectId,
    ref: 'syncCafeRegistration'
  },
  outletAvaibility: Number,
  userProfile: {
    type: Schema.Types.ObjectId,
    ref: 'syncRegistration'
  },
  wifiQuality: Number
}

const syncCafeSchema = new mongoose.Schema({
  name: {
    type: String
  },
  poi_id: {
    type: String
  },
  date_refreshed: {
    type: String
  },
  county: {
    type: String
  },
  price_class: {
    type: String
  },
  popularity: {
    type: String
  },
  reviewsNumber: {
    type: String
  },
  avg_sentiment: {
    type: String
  },
  main_clusters: {
    type: Array
  },
  spoken_languages: {
    type: Array
  },
  images: {
    type: Array
  },
  fcmToken: {
    type: Array
  },
  country: {
    type: String
  },
  state: {
    type: String
  },
  city: {
    type: String
  },
  streetAddress: {
    type: String
  },
  longitude: {
    type: String
  },
  latitude: {
    type: String
  },
  industry: {
    type: String
  },
  category: {
    type: String
  },
  priceRange: {
    type: String
  },
  phone: {
    type: String || Number
  },
  website: {
    type: String
  },
  reviews: {
    type: Number
  },
  stars: {
    type: String || Number
  },
  openHours: {
    type: Object
  },
  facilities: {
    type: Array
  },
  pictures: {
    type: Array
  },
  limitations: {
    type: String
  },
  otherDescription: {
    type: String
  },
  isMember: {
    type: String
  },
  position: {
    type: String
  },
  isOpen: {
    type: String
  },
  establishmentName: {
    type: String
  },
  legalEstablishmentName: {
    type: String
  },
  shortDescription: {
    type: String
  },
  contactEmail: {
    type: String
  },
  dialCode: {
    type: Number
  },
  countryCode: {
    type: String
  },
  timeLimitation: {
    type: String
  },
  standoutFacilities: {
    type: Array
  },
  postalCode: {
    type: String
  },
  userPosition: {
    type: String
  },
  userPhone: {
    type: Number
  },
  isAgreeUser: {
    type: Boolean
  },
  userDialCode: {
    type: Number
  },
  userCountryCode: {
    type: String
  },
  otp: {
    type: String
  },
  isNotifyByEmail: {
    type: Boolean
  },
  isCertify: {
    type: Boolean
  },
  isSubmitted: {
    type: Boolean,
    default: false
  },
  facebookLink: {
    type: String
  },
  instagramLink: {
    type: String
  },
  twitterLink: {
    type: String
  },
  linkedinLink: {
    type: String
  },
  type: {
    type: String
  },
  isClaimed: {
    type: Boolean,
    default: false
  },
  uploadDocuments: {
    type: Array
  },
  postByUsers: {
    type: Array
  },
  ratingReviews: [
    ratingReviews
  ],
  ratingFilters: [
    ratingFilters
  ],
  isAccepted: {
    type: String,
    default: 'pending'
  },
  isUpload: {
    type: Boolean,
    default: false
  },
  email: {
    type: String
  },
  password: {
    type: String,
    select: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isFirst: {
    type: Boolean,
    default: true
  },
  status: {
    type: Boolean,
    default: false
  },
  pinnedUser: {
    type: Array
  },
  wifiRating: {
    type: Number,
    default: 0
  },
  role: {
    type: String,
    default: 'cafe'
  },
  createdAt: {
    type: Date,
    default: Date.now()
  },
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpire: {
    type: Date,
    select: false
  },
  syncClaim: {
    type: Boolean,
    default: false
  },
  cafeId: {
    type: Schema.Types.ObjectId,
    ref: 'syncCafeRegistration'
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

syncCafeSchema.pre('save', async function (next) {
  if (!this.isModified('password') || this.syncClaim === true) {
    next()
  }

  this.password = await bcrypt.hash(this.password, 10)
})

// Generating Verify User Reset Token
syncCafeSchema.methods.getVerifyUserToken = function () {
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

// JWT TOKEN
syncCafeSchema.methods.getJWTToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  })
}

// Compare Password

syncCafeSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password)
}

// Generating Password Reset Token
syncCafeSchema.methods.getResetPasswordToken = function () {
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

const syncCafeRegistration = mongoose.model('sync_cafe_registration', syncCafeSchema)

module.exports = syncCafeRegistration
