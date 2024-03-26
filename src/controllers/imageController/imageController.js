const sharp = require('sharp')
const ExifImage = require('exif').ExifImage
const catchAsyncErrors = require('../../middleware/catchAsyncErrors')
const aws = require('aws-sdk')
// create ImageURL
exports.createImage = catchAsyncErrors(async (req, res, next) => {
  let orientation = 1 // Default orientation (no rotation)
  if (req.file.originalname.toLowerCase().includes('jpg') || req.file.originalname.toLowerCase().includes('jpeg')) {
    try {
      const exifData = await new Promise((resolve, reject) => {
        // eslint-disable-next-line no-new
        new ExifImage({ image: req.file.buffer }, (error, data) => {
          if (error) {
            reject(error)
          } else {
            resolve(data)
          }
        })
      })
      orientation = exifData.image.Orientation || 1
    } catch (error) {
      console.log('Error reading EXIF metadata:', error)
    }
  }
  const resizedImage = await sharp(req.file.buffer).jpeg({ quality: 100 }).resize(1500).toBuffer()
  const compressedFile = await sharp(resizedImage).rotate(orientation === 6 ? 90 : orientation === 3 ? 180 : orientation === 8 ? 270 : 0).toBuffer()
  const s3 = new aws.S3()
  const params = {
    Bucket: 'sync-react-images',
    Key: `path/to/upload/${req.file.originalname}`,
    Body: compressedFile
  }
  try {
    const uploadResult = await s3.upload(params).promise()
    res.status(201).json({
      success: true,
      image: { image: uploadResult.Location }
    })
  } catch (error) {
    console.error('Error occurred while uploading file:', error)
    res.status(400).json({
      success: false,
      error
    })
  }
})
