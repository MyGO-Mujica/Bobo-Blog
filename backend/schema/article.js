const joi = require('@hapi/joi')

// 分别定义 标题、分类Id、内容、发布状态的校验规则
const title = joi.string().required()
const cate_id = joi.number().integer().min(1)
const content = joi.string().required().allow('')
const state = joi.string().valid('已发布', '草稿').required()
const id = joi.number().integer().min(1).required()

// 分页、查询的校验规则
const pagenum = joi.number().integer().min(1)
const pagesize = joi.number().integer().min(1)
const cate_id_optional = joi.alternatives().try(
  joi.number().integer().min(1),
  joi.string().allow(''),
  joi.allow(null)
)
const state_optional = joi.alternatives().try(
  joi.string().valid('已发布', '草稿'),
  joi.string().allow(''),
  joi.allow(null)
)

// 验证规则对象 - 发布文章
exports.add_article_schema = {
  body: {
    title,
    cate_id,
    content,
    state,
  },
}

// 验证规则对象 - 更新文章
exports.update_article_schema = {
  body: {
    id,
    title,
    cate_id,
    content,
    state,
  },
}

// 验证规则对象 - 获取文章列表
exports.get_articles_schema = {
  query: {
    pagenum,
    pagesize,
    cate_id: cate_id_optional,
    state: state_optional,
  },
}

// 验证规则对象 - 获取单个文章详情
exports.get_article_schema = {
  query: {
    id: joi.number().integer().min(1).required(),
  },
}

// 验证规则对象 - 删除文章
exports.delete_article_schema = {
  query: {
    id: joi.number().integer().min(1).required(),
  },
}
