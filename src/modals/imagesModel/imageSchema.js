const mongoose = require('mongoose')

const imageSchema = new mongoose.Schema({
  image: String
})

const imageLink = mongoose.model('sync_image', imageSchema)

module.exports = imageLink
