# Bobo-Blog - Docker 一键启动指南

本项目已完成完整的容器化配置，您可以使用 Docker Compose 一键启动所有服务（包括前后端和数据库）。

## 🚀 快速启动

### 1. 环境准备

- 确保您的系统中已安装 [Docker](https://docs.docker.com/get-docker/) 和 [Docker Compose](https://docs.docker.com/compose/install/)。
- 确保 **80 端口**未被占用（前端服务使用）。

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，设置数据库密码和 JWT 密钥
# Windows: notepad .env
# Linux/macOS: nano .env
```

编辑 `.env` 文件内容：

```env
# 数据库配置
DB_HOST=db
DB_USER=root
DB_PASSWORD=YourSecurePassword123!     # 修改为强密码
DB_NAME=my_db_01

# JWT 密钥（用于生成用户令牌）
JWT_SECRET=YourSuperSecretJWTKey123456789  # 修改为随机字符串
```

### 3. 一键启动

```bash
# 在项目根目录下执行
docker-compose up -d --build
```

首次构建可能需要 3-5 分钟，请耐心等待。

## 🌐 访问地址

启动成功后，您可以通过以下地址访问服务：

### 主应用

- **博客前端**: [http://localhost](http://localhost)
- **默认管理员账号**:
  - 用户名: `超时空辉夜姬`
  - 密码: `111111`
  - ⚠️ **首次登录后请立即修改密码！**

  - ⚠️ **首次登录后请立即修改密码！**

---

## 📦 容器架构

项目包含 3 个服务容器：

```
┌─────────────────────────────────────────┐
│         Bobo-Blog 容器架构              │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐                      │
│  │   Frontend   │ Nginx + Vue 3        │
│  │   Port: 80   │ 静态文件 + 反向代理   │
│  └──────┬───────┘                      │
│         │                               │
│         │ Proxy: /api, /my, /uploads   │
│         ↓                               │
│  ┌──────────────┐                      │
│  │   Backend    │ Node.js 20 + Express │
│  │  Port: 3007  │ RESTful API 服务     │
│  └──────┬───────┘                      │
│         │                               │
│         │ MySQL 连接                    │
│         ↓                               │
│  ┌──────────────┐                      │
│  │   Database   │ MySQL 8.0            │
│  │  Port: 3306  │ 数据持久化           │
│  └──────────────┘                      │
│                                         │
└─────────────────────────────────────────┘

数据持久化:
✓ mysql_data (数据库数据)
✓ uploads (用户上传文件)
```

### 服务说明

| 服务名       | 镜像              | 端口        | 说明                        |
| ------------ | ----------------- | ----------- | --------------------------- |
| **frontend** | nginx:1.27-alpine | 80          | 前端静态文件 + API 反向代理 |
| **backend**  | node:20-slim      | 3007 (内部) | Express API 服务            |
| **db**       | mysql:8.0         | 3306 (内部) | MySQL 数据库                |

---

## 🛠️ 常用维护命令

### 基础操作

```bash
# 查看所有容器状态
docker-compose ps

# 查看实时日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs backend
docker-compose logs frontend

# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart backend
```

### 停止和清理

```bash
# 停止所有服务
docker-compose down

# 停止并删除数据库数据（⚠️ 谨慎使用）
docker-compose down -v

# 重新构建并启动
docker-compose up -d --build
```

### 数据库操作

```bash
# 进入数据库容器
docker exec -it bobo-blog-db bash

# 备份数据库
docker exec bobo-blog-db mysqldump -uroot -pYourPassword my_db_01 > backup.sql

# 恢复数据库
docker exec -i bobo-blog-db mysql -uroot -pYourPassword my_db_01 < backup.sql

# 查看数据库表
docker exec bobo-blog-db mysql -uroot -pYourPassword my_db_01 -e "SHOW TABLES;"
```

---

## 💾 数据持久化与迁移

### 1. 数据库数据

- **存储位置**: Docker 卷 `mysql_data`
- **持久化**: 即使删除容器，数据依然保留
- **迁移方法**: 使用上述数据库备份/恢复命令

### 2. 用户上传文件

- **存储位置**: Docker 卷 `uploads_data`，映射到容器内 `/app/uploads`
- **访问方式**: 通过 Nginx 代理 `/uploads/` 路径访问
- **备份建议**: 定期备份此卷以保护用户数据

### 3. 数据库初始化

- **自动执行**: 首次启动时，会自动运行 `mysql/init/01-schema.sql`
- **包含内容**:
  - 创建 6 张数据表
  - 插入默认管理员账号
  - 插入 3 个默认分类
- **重新初始化**: 删除数据卷后重启即可

---

## ⚠️ 注意事项与常见问题

### 1. 端口占用

**问题**: 80 端口已被占用

```bash
# 修改 docker-compose.yml 中的端口映射
ports:
  - "8080:80"  # 将 80 改为其他端口

# 然后访问 http://localhost:8080
```

### 2. 首次构建时间较长

- **原因**: 需要下载基础镜像和安装依赖
- **建议**: 首次构建预计需要 3-5 分钟，请耐心等待
- **优化**: 配置 Docker 镜像加速器

### 3. Windows 路径问题

- **已解决**: 本项目使用复制本地 `node_modules` 的方式
- **前置要求**: 在构建前需要先在 `backend/` 目录执行 `npm install`
- **原因**: Windows Docker 挂载卷存在文件系统兼容性问题

### 4. 数据库连接失败

**排查步骤**:

```bash
# 1. 检查数据库健康状态
docker-compose ps db

# 2. 查看数据库日志
docker-compose logs db

# 3. 测试数据库连接
docker exec bobo-blog-db mysql -uroot -pYourPassword -e "SELECT 1;"

# 4. 检查后端日志
docker-compose logs backend
```

### 6. 图片/头像显示不正常

- **已优化**: 所有图片字段已改为 `LONGTEXT` 类型
- **支持格式**: base64 编码和文件上传
- **存储位置**: 文件上传保存在 `/app/uploads` 目录

---

## 🔒 生产环境部署建议

### 1. 安全配置

```bash
# 强制修改默认密码
- 数据库 root 密码（.env 中的 DB_PASSWORD）
- JWT 密钥（.env 中的 JWT_SECRET）
- 管理员账号密码（首次登录后修改）
```

### 2. HTTPS 配置

推荐使用 Nginx 反向代理或 Traefik：

- 自动 HTTPS（Let's Encrypt）
- 负载均衡
- 请求限流

### 3. 资源限制

在 `docker-compose.yml` 中添加资源限制：

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: "1"
          memory: 512M
```

### 4. 日志管理

```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 5. 定期备份

```bash
# 创建定时任务备份数据库
0 2 * * * docker exec bobo-blog-db mysqldump -uroot -p\$DB_PASSWORD my_db_01 > /backup/db_$(date +\%Y\%m\%d).sql
```

---

## 🆘 获取帮助

遇到问题？按以下顺序排查：

1. **查看日志**:

   ```bash
   docker-compose logs -f
   ```

2. **检查容器状态**:

   ```bash
   docker-compose ps
   ```

3. **提交 Issue**: 到项目 GitHub 仓库

---

## 📚 相关文档

- [项目总览](README.md) - 功能介绍和本地开发指南
- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)

---

💡 **提示**: 本项目专为容器化部署优化，推荐使用 Docker 方式启动，无需手动配置复杂的开发环境。
