const inquirySync = require('../../modals/contactInquiryModel/inquiry')
const ErrorHandler = require('../../utils/errorHandler')
const catchAsyncErrors = require('../../middleware/catchAsyncErrors')
const sendContactEmail = require('../../utils/sendContactEmail')

// create inquiry
exports.createInquiry = catchAsyncErrors(async (req, res, next) => {
  await sendContactEmail({
    email: req.body.email,
    to: 'hello@syncremote.co',
    subject: 'Inquiry Form',
    message: req.body.message,
    name: req.body.firstName + ' ' + req.body.lastName
  })
  res.status(201).json({
    success: true,
    message: 'Your inquiry is submitted'
  })
})

// get single or all inquiry
exports.getInquiry = catchAsyncErrors(async (req, res, next) => {
  if (!req?.params?.id) {
    const allInquiry = await inquirySync.find()
    res.status(200).json({
      success: true,
      allInquiry
    })
  } else {
    const singleInquiry = await inquirySync.findById(req.params.id)
    if (!singleInquiry) {
      return next(new ErrorHandler(`Inquiry does not exist with Id: ${req.params.id}`))
    }
    res.status(200).json({
      success: 200,
      singleInquiry
    })
  }
})
