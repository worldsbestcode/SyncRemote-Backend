const { Schema } = require('mongoose')
const mongoose = require('mongoose')

const ratingReviews = {
  uniqueId: String,
  message: String,
  photos: Array,
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

const recommendCafeSchema = new mongoose.Schema({
  streetAddress: {
    type: String
  },
  category: {
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
  facilities: {
    type: Array
  },
  pictures: {
    type: Array
  },
  ratingReviews: [
    ratingReviews
  ],
  limitations: {
    type: String
  },
  otherDescription: {
    type: String
  },
  isMember: {
    type: String
  },
  message: {
    type: String
  },
  establishmentName: {
    type: String
  },
  contactEmail: {
    type: String
  },
  longitude: {
    type: String
  },
  latitude: {
    type: String
  },
  dialCode: {
    type: Number
  },
  countryCode: {
    type: String
  },
  standoutFacilities: {
    type: Array
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
  isAccepted: {
    type: String,
    default: 'pending'
  },
  recommendBy: {
    type: Schema.Types.ObjectId,
    ref: 'syncRegistration'
  },
  isUpload: {
    type: Boolean,
    default: false
  },
  status: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    default: 'cafe'
  },
  createdAt: {
    type: Date,
    default: Date.now()
  }
})

const syncCafeRecommendation = mongoose.model('sync_cafe_recommendation', recommendCafeSchema)

module.exports = syncCafeRecommendation
