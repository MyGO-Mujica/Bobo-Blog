const express = require('express')
const router = express.Router()

// 导入路由处理函数模块
const square_handler = require('../router_handler/square')

// 导入验证数据的中间件
const expressJoi = require('@escook/express-joi')
// 导入需要的验证规则对象
const { square_post_schema, square_comment_schema, square_like_schema } = require('../schema/square')

// 发布帖子的路由
router.post('/post', expressJoi(square_post_schema), square_handler.publishPost)

// 获取帖子列表的路由
router.get('/posts', square_handler.getPostList)

// 获取帖子详情的路由
router.get('/post/:id', square_handler.getPostDetail)

// 删除帖子的路由
router.post('/post/delete', square_handler.deletePost)

// 点赞帖子的路由
router.post('/like', expressJoi(square_like_schema), square_handler.likePost)

// 取消点赞的路由
router.post('/unlike', expressJoi(square_like_schema), square_handler.unlikePost)

// 添加评论的路由
router.post('/comment', expressJoi(square_comment_schema), square_handler.addComment)

// 获取评论列表的路由
router.get('/comments/:postId', square_handler.getComments)

// 删除评论的路由
router.post('/comment/delete', square_handler.deleteComment)

module.exports = router
