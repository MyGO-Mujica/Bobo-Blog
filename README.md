# Bobo-Blog 全栈博客系统

一个基于 Vue 3 + Express + MySQL 的现代化全栈博客平台，支持文章管理、社交广场、用户互动等功能。

## ✨ 功能特性

### 核心功能

- 📝 **文章管理** - 支持 Markdown/富文本编辑，文章分类，草稿/发布状态管理
- 🏷️ **分类系统** - 灵活的文章分类，支持用户自定义和公共分类
- 🌐 **博客广场** - 多用户内容共享平台，支持点赞、评论、浏览
- 👤 **用户系统** - 注册登录、个人资料、头像上传、密码管理
- 🔐 **权限管理** - 基于 JWT 的身份验证，用户/管理员角色区分
- 🖼️ **图片上传** - 支持 base64 和文件上传，封面图、用户头像

### 交互功能

- 💬 评论系统 - 帖子评论，支持回复和嵌套
- 👍 点赞功能 - 帖子点赞，实时统计
- 🔍 搜索功能 - 按标题、分类搜索文章
- 📱 响应式设计 - 完美适配桌面和移动设备

## 🛠 技术栈

### 前端

- **框架**: Vue 3.3.4（Composition API）
- **构建工具**: Vite 4.2.3
- **包管理**: pnpm
- **状态管理**: Pinia 2.1.3
- **路由**: Vue Router 4.2.2
- **UI 组件**: Element Plus 2.3.7
- **富文本编辑器**: Editor.js 2.30.8
- **HTTP 客户端**: Axios 1.4.0
- **样式**: Sass

### 后端

- **运行环境**: Node.js 20
- **框架**: Express 4.17.1
- **数据库**: MySQL 8.0
- **身份验证**: JWT (jsonwebtoken 8.5.1, express-jwt 5.3.3)
- **密码加密**: bcryptjs 2.4.3
- **数据验证**: @hapi/joi 17.1.0
- **文件上传**: multer 1.4.2
- **数据库驱动**: mysql2 3.14.1

### DevOps

- **容器化**: Docker & Docker Compose
- **Web 服务器**: Nginx 1.27-alpine
- **数据持久化**: Docker Volume

## 📦 项目结构

```
Bobo-Blog/
├── frontend/                 # 前端项目
│   ├── src/
│   │   ├── api/             # API 接口
│   │   ├── components/      # 全局组件
│   │   ├── router/          # 路由配置
│   │   ├── stores/          # 状态管理
│   │   ├── views/           # 页面组件
│   │   └── utils/           # 工具函数
│   ├── nginx/
│   │   └── nginx.conf       # Nginx 配置
│   ├── Dockerfile           # 前端 Docker 配置
│   └── package.json
│
├── backend/                  # 后端项目
│   ├── router/              # 路由
│   ├── router_handler/      # 业务逻辑
│   ├── schema/              # 数据验证规则
│   ├── middleware/          # 中间件
│   ├── db/                  # 数据库连接
│   ├── uploads/             # 文件上传目录
│   ├── Dockerfile           # 后端 Docker 配置
│   └── package.json
│
├── mysql/                    # 数据库初始化
│   └── init/
│       └── 01-schema.sql    # 数据库表结构和初始数据
│
├── docker-compose.yml        # Docker Compose 编排
├── .env                      # 环境变量配置（需自行创建）
├── .env.example             # 环境变量示例
├── .gitignore
├── README.md                # 项目总览（本文件）
└── README_DOCKER.md         # Docker 部署指南

```

## 🚀 快速开始

### 前置要求

#### 本地开发

- Node.js >= 20.x
- MySQL >= 8.0
- pnpm（推荐）或 npm

#### Docker 部署

- Docker >= 20.x
- Docker Compose >= 2.x

### 方式一：本地开发

#### 1. 克隆项目

```bash
git clone <your-repo-url>
cd Bobo-Blog
```

#### 2. 配置数据库

```bash
# 登录 MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE my_db_01;

# 导入表结构
mysql -u root -p my_db_01 < mysql/init/01-schema.sql
```

#### 3. 后端配置和启动

```bash
cd backend

# 安装依赖
npm install

# 修改 db/index.js 和 config.js 配置数据库连接和 JWT 密钥

# 启动服务
npm start
# 服务运行在 http://localhost:3007
```

#### 4. 前端配置和启动

```bash
cd frontend

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
# 访问 http://localhost:5173
```

### 方式二：Docker 部署（推荐）

详细的 Docker 部署指南请查看 [README_DOCKER.md](README_DOCKER.md)

**快速启动：**

```bash
# 1. 复制环境变量配置
cp .env.example .env

# 2. 编辑 .env 文件，设置密码和密钥

# 3. 启动所有服务
docker-compose up -d

# 4. 访问应用
# 前端: http://localhost
# 后端 API: http://localhost/api
```

## 🔧 环境变量配置

创建 `.env` 文件（参考 `.env.example`）：

```env
# 数据库配置
DB_HOST=db
DB_USER=root
DB_PASSWORD=YourSecurePassword123!
DB_NAME=my_db_01

# JWT 密钥
JWT_SECRET=YourSuperSecretJWTKey123456789
```

## 📱 功能模块

### 文章管理

- 新增文章（支持富文本编辑、封面图上传）
- 编辑文章（草稿/已发布状态切换）
- 删除文章（软删除）
- 文章搜索（按标题、分类）
- 文章分页

### 分类管理

- 创建自定义分类
- 编辑分类
- 删除分类（软删除）
- 公共分类（系统预设）

### 博客广场

- 发布帖子（可关联文章）
- 浏览帖子列表
- 点赞帖子
- 评论帖子（支持回复）
- 删除自己的帖子

### 用户中心

- 个人资料修改
- 头像上传（base64）
- 密码修改
- 邮箱设置

## 🗃️ 数据库设计

### 主要表结构

- `ev_users` - 用户表
- `ev_article_cate` - 文章分类表
- `ev_articles` - 文章表
- `square_posts` - 广场帖子表
- `square_likes` - 点赞表
- `square_comments` - 评论表

详细表结构请查看 [mysql/init/01-schema.sql](mysql/init/01-schema.sql)

## 🔍 API 接口

### 用户相关

- `POST /api/reguser` - 用户注册
- `POST /api/login` - 用户登录
- `GET /my/userinfo` - 获取用户信息
- `PUT /my/userinfo` - 更新用户信息
- `PATCH /my/updatepwd` - 修改密码
- `PATCH /my/update/avatar` - 更新头像

### 文章相关

- `GET /my/article/cates` - 获取文章分类
- `POST /my/article/addcates` - 添加分类
- `GET /my/article/list` - 获取文章列表
- `POST /my/article/add` - 发布文章
- `GET /my/article/:id` - 获取文章详情
- `POST /my/article/edit` - 编辑文章
- `DELETE /my/article/delete` - 删除文章

### 广场相关

- `GET /square/posts` - 获取帖子列表
- `GET /square/posts/:id` - 获取帖子详情
- `POST /square/posts` - 发布帖子
- `POST /square/posts/:postId/like` - 点赞帖子
- `GET /square/posts/:postId/comments` - 获取评论
- `POST /square/posts/:postId/comments` - 发表评论

## 🐛 常见问题

### 1. 端口冲突

如果 80 端口被占用，修改 `docker-compose.yml` 中的端口映射：

```yaml
ports:
  - "8080:80" # 改为其他端口
```

### 2. 图片上传失败

确保 `backend/uploads` 目录存在且有写权限。Docker 部署已通过 volume 持久化。

### 3. npm 安装失败（Windows + Docker）

npm 安装存在问题，本项目使用使用本地安装后复制 node_modules 的方式。
