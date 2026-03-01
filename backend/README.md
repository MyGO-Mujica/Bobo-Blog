# boboのblog Server

基于 Node.js + Express + MySQL 的博客后端系统

## 功能特色

- 用户注册登录
- 文章发布管理
- 文章分类
- 图片上传
- 动态广场（发布、点赞、评论）

## 技术栈

- Node.js + Express
- MySQL 数据库
- JWT 身份验证
- multer 文件上传

## 快速开始

1. 克隆项目
```bash
git clone https://github.com/MyGO-Mujica/bobo_blog_server.git
cd bobo_blog_server
```

2. 安装依赖
```bash
npm install
```

3. 配置数据库
修改 `config.js` 中的数据库连接信息

4. 启动服务
```bash
npm start
```

服务运行在：http://localhost:3007

## 项目结构

```
├── app.js              # 入口文件
├── config.js           # 配置文件
├── router/             # 路由
├── router_handler/     # 业务逻辑
├── schema/             # 数据验证
├── db/                 # 数据库
└── uploads/            # 上传文件
```

## 主要API

- `POST /api/reguser` - 用户注册
- `POST /api/login` - 用户登录
- `GET /my/userinfo` - 获取用户信息
- `GET /my/article/cates` - 获取文章分类
- `POST /my/article/add` - 发布文章
- `GET /my/square/posts` - 获取动态列表
