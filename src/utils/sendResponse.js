exports.errFunc = (res, statusCode, success, message) => {
  res.status(statusCode).json({ success, message })
}
