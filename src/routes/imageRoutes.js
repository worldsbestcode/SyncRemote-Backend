const express = require('express')
const { createImage } = require('../controllers/imageController/imageController')
const upload = require('../middleware/multer')

const router = express.Router()

router.route('/image').post(upload.single('image'), createImage)

module.exports = router
