const express = require('express')
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth')
const { createBlog, getAllBlogs, getSingleBlog, changeStatus, updateBlog, deleteSingleBlog } = require('../controllers/blogController/blogControllers')
const router = express.Router()

router.route('/admin/create_blog').post(isAuthenticatedUser, authorizeRoles('admin'), createBlog)
router.route('/blogs').get(getAllBlogs)
router.route('/blog/:id').get(getSingleBlog).patch(isAuthenticatedUser, authorizeRoles('admin'), changeStatus).put(isAuthenticatedUser, authorizeRoles('admin'), updateBlog).delete(isAuthenticatedUser, authorizeRoles('admin'), deleteSingleBlog)

module.exports = router
