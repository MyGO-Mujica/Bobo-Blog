FROM node:20-slim

WORKDIR /app

# 复制依赖文件和 node_modules
COPY package*.json ./
COPY node_modules ./node_modules

# 复制源码
COPY . .

# 创建 uploads 目录
RUN mkdir -p uploads

# 声明端口（需与 app.js 中 listen 的端口一致）
EXPOSE 3007

# 使用 exec 形式，让 node 直接作为 PID 1，确保能正确接收 SIGTERM 优雅退出
CMD ["node", "app.js"]
