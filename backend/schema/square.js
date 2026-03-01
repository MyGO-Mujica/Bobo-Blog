const joi = require('@hapi/joi')

// 发布帖子的验证规则
const square_post_schema = {
  body: {
    article_id: joi.number().integer().min(1).optional(),
    title: joi.string().required(),
    content: joi.string().required(),
    cover_img: joi.string().dataUri().optional()
  }
}

// 点赞/取消点赞的验证规则
const square_like_schema = {
  body: {
    post_id: joi.number().integer().min(1).required()
  }
}

// 评论的验证规则
const square_comment_schema = {
  body: {
    post_id: joi.number().integer().min(1).required(),
    parent_id: joi.number().integer().min(1).optional(),
    content: joi.string().required()
  }
}

// 导出验证规则对象
module.exports = {
  square_post_schema,
  square_like_schema,
  square_comment_schema
}
