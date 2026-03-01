// 文章的路由模块

const express = require('express')
const router = express.Router()

// 导入需要的处理函数模块
const article_handler = require('../router_handler/article')

// 导入 multer 和 path
const multer = require('multer')
const path = require('path')

// 配置 multer 中间件
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'))
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname)
    cb(null, Date.now() + ext)
  }
})

const upload = multer({ storage: storage })

// 创建 multer 的实例
const uploads = multer({ dest: path.join(__dirname, '../uploads') })
// 导入验证数据的中间件
const expressJoi = require('@escook/express-joi')
// 导入需要的验证规则对象
const { add_article_schema, get_articles_schema, get_article_schema, update_article_schema, delete_article_schema } = require('../schema/article')

// 获取文章列表的路由
router.get('/list', expressJoi(get_articles_schema), article_handler.getArticles)
// 获取单个文章详情的路由
router.get('/info', expressJoi(get_article_schema), article_handler.getArticleById)
// 更新文章的路由
router.put('/info', upload.single('cover_img'), expressJoi(update_article_schema), article_handler.updateArticle)
// 删除文章的路由
router.delete('/info', expressJoi(delete_article_schema), article_handler.deleteArticle)
// 发布文章的路由
router.post('/add', upload.single('cover_img'), expressJoi(add_article_schema), article_handler.addArticle)
// 搜索文章的路由
router.get('/search', article_handler.searchArticles)
// 图片上传的路由
router.post('/upload/image', upload.single('image'), article_handler.uploadImage)

module.exports = router
