const syncBlog = require('../../modals/blogModel/blogs')
const ErrorHandler = require('../../utils/errorHandler')
const catchAsyncErrors = require('../../middleware/catchAsyncErrors')

// create blog
exports.createBlog = catchAsyncErrors(async (req, res, next) => {
  await syncBlog.create(req.body)
  res.status(201).json({
    success: true,
    message: 'Blog created successfully'
  })
})

// get all blogs
exports.getAllBlogs = catchAsyncErrors(async (req, res, next) => {
  const allBlogs = await syncBlog.find()

  res.status(200).json({
    success: 200,
    allBlogs
  })
})

// get single blog
exports.getSingleBlog = catchAsyncErrors(async (req, res, next) => {
  const blog = await syncBlog.findById(req.params.id)

  if (!blog) {
    return next(
      new ErrorHandler(`Blog does not exist with Id: ${req.params.id}`)
    )
  }

  res.status(200).json({
    success: true,
    blog
  })
})

// change status of blog
exports.changeStatus = catchAsyncErrors(async (req, res, next) => {
  const blog = await syncBlog.findById(req.params.id)
  if (!blog) {
    return next(
      new ErrorHandler(`Blog does not exist with Id: ${req.params.id}`)
    )
  }
  blog.status = !blog.status
  await blog.save()
  res.status(200).json({
    success: true,
    message: `Blog is ${blog.status === true ? 'Published' : 'Unpublished'}`
  })
})

// update blog
exports.updateBlog = catchAsyncErrors(async (req, res, next) => {
  const blog = await syncBlog.findByIdAndUpdate(req.params.id, req.body, {
    new: true
  })

  if (!blog) {
    return next(
      new ErrorHandler(`Blog does not exist with Id: ${req.params.id}`)
    )
  }

  res.status(200).json({
    success: true,
    message: 'Your blog is updated successfully'
  })
})

// delete blog
exports.deleteSingleBlog = catchAsyncErrors(async (req, res, next) => {
  const blog = await syncBlog.findById(req.params.id)

  if (!blog) {
    return next(
      new ErrorHandler(`Blog does not exist with Id: ${req.params.id}`)
    )
  }

  res.status(200).json({
    success: true,
    message: 'Your blog is deleted successfully'
  })
  await blog.deleteOne()
})
