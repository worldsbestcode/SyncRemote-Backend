// const multerS3 = require('multer-s3')
const multer = require("multer");

const aws = require("aws-sdk");
// const s3 = new aws.S3()

const storage = multer.memoryStorage();
const upload = multer({ storage });

module.exports = upload;
