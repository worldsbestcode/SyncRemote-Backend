const mongoose = require('mongoose')
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

const subcribers = {
  name: String,
  email: String,
  terms: Boolean
}

const deletedData = {
  deleteTime: {
    type: Number,
    default: Date.now
  },
  status: {
    type: Boolean,
    default: false
  },
  reason: String,
  comment: String
}

const deleteUserSchema = new mongoose.Schema({
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
  mobileNumber: {
    type: Number
  },
  dialCode: {
    type: Number
  },
  countryCode: {
    type: String
  },
  role: {
    type: String,
    default: 'user'
  },
  status: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  bannerImage: {
    type: String
  },
  headline: {
    type: String
  },
  companyName: {
    type: String
  },
  position: {
    type: String
  },
  industry: {
    type: String
  },
  showCompany: {
    type: Boolean,
    default: false
  },
  schoolName: {
    type: String
  },
  showEducation: {
    type: Boolean,
    default: false
  },
  country: {
    type: String
  },
  postalCode: {
    type: String
  },
  city: {
    type: String
  },
  landline: {
    type: Number
  },
  address: {
    type: String
  },
  birthdayMonth: {
    type: String
  },
  birthdayDate: {
    type: Number
  },
  website: {
    type: String
  },
  about: {
    type: String
  },
  photos: {
    type: Array
  },
  savedCafe: [{
    type: Schema.Types.ObjectId,
    ref: 'syncCafeRegistration'
  }],
  ratingReviews: [
    ratingReviews
  ],
  ratingFilters: [
    ratingFilters
  ],
  pinnedCafe: {
    type: Array
  },
  profileImage: {
    type: String
  },
  searchLocation: {
    type: Array
  },
  isSearchLocation: {
    type: Boolean
  },
  subscribeToConnect: {
    type: subcribers
  },
  deletedData,
  createdAt: {
    type: Date,
    default: Date.now
  },
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpire: {
    type: Date,
    select: false
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

const syncDeleteUser = mongoose.model(
  'sync_delete_user',
  deleteUserSchema
)

module.exports = syncDeleteUser
