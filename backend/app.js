// 导入 express
const express = require('express')
// 创建服务器的实例对象
const app = express()
const joi = require('@hapi/joi')

// 导入并配置 cors 中间件
const cors = require('cors')
app.use(cors())

// 配置解析表单数据的中间件，注意：这个中间件，只能解析 application/x-www-form-urlencoded 格式的表单数据
app.use(express.urlencoded({ extended: false, limit: '100mb' }))
// 配置解析 JSON 格式数据的中间件
app.use(express.json({ limit: '100mb' }))

// 托管静态资源文件
app.use('/uploads', express.static('./uploads'))

// 一定要在路由之前，封装 res.cc 函数
app.use((req, res, next) => {
  // status 默认值为 1，表示失败的情况
  // err 的值，可能是一个错误对象，也可能是一个错误的描述字符串
  res.cc = function (err, status = 1) {
    res.send({
      status,
      message: err instanceof Error ? err.message : err,
    })
  }
  next()
})

// 一定要在路由之前配置解析 Token 的中间件
const expressJWT = require('express-jwt')
const config = require('./config')

app.use(expressJWT({ secret: config.jwtSecretKey }).unless({ path: [/^\/api/] }))

// 导入并使用用户路由模块
const userRouter = require('./router/user')
app.use('/api', userRouter)
// 导入并使用用户信息的路由模块
const userinfoRouter = require('./router/userinfo')
app.use('/my', userinfoRouter)
// 导入并使用文章分类的路由模块
const artCateRouter = require('./router/artcate')
app.use('/my', artCateRouter)
// 导入并使用文章的路由模块
const articleRouter = require('./router/article')
app.use('/my/article', articleRouter)
// 导入并使用广场的路由模块
const squareRouter = require('./router/square')
app.use('/my/square', squareRouter)

// 定义错误级别的中间件
app.use((err, req, res, next) => {
  // 请求体过大的错误
  if (err.type === 'entity.too.large') {
    return res.send({
      status: 1,
      message: '上传的文件过大，请选择更小的图片！',
    })
  }
  // 验证失败导致的错误
  if (err instanceof joi.ValidationError) {
    if (res.cc) {
      return res.cc(err)
    } else {
      return res.send({
        status: 1,
        message: err instanceof Error ? err.message : err,
      })
    }
  }
  // 身份认证失败后的错误
  if (err.name === 'UnauthorizedError') {
    return res.status(401).send({
      status: 1,
      message: 'token过期或无效，请重新登录！',
    })
  }
  // 未知的错误
  if (res.cc) {
    res.cc(err)
  } else {
    res.send({
      status: 1,
      message: err instanceof Error ? err.message : err,
    })
  }
})

// 启动服务器
app.listen(3007, () => {
  console.log('api server running at http://127.0.0.1:3007')
})
