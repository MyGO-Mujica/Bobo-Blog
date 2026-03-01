# ================================
# 阶段一：构建 Vue 项目
# ================================
FROM node:20-alpine AS builder

WORKDIR /app

# 启用 pnpm（项目使用 pnpm 管理依赖）
RUN corepack enable && corepack prepare pnpm@latest --activate

# 先复制依赖描述文件，利用缓存层
COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

# 复制源码
COPY . .

# 构建生产产物（输出到 dist/ 目录）
# VITE_API_BASE_URL='' 使 Axios 使用相对路径，由 Nginx 负责代理
RUN VITE_API_BASE_URL='' pnpm build

# ================================
# 阶段二：用 Nginx 托管静态文件
# ================================
FROM nginx:1.27-alpine

# 删除 Nginx 默认配置，替换为我们的配置
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx/nginx.conf /etc/nginx/conf.d/app.conf

# 将构建产物从阶段一复制到 Nginx 的静态目录
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
