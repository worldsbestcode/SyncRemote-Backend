const mongoose = require('mongoose')

const blogsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  authorImage: {
    type: String
  },
  publishDate: {
    type: String
  },
  status: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

const syncBlog = mongoose.model('sync_blog', blogsSchema)

module.exports = syncBlog
