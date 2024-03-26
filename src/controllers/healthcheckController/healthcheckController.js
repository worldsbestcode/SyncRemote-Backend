const catchAsyncErrors = require('../../middleware/catchAsyncErrors')

// Healthcheck
exports.healthcheck = catchAsyncErrors(async (req, res) => {
  console.log('Request to: ', req.originalUrl)
  console.log('body: ', req.body)
  console.log('query: ', req.query)
  console.log('params: ', req.params)
  res.status(200).json({
    success: true,
    message: 'Healthcheck Ok'
  })
})
