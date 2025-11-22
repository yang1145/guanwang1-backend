# 使用官方 Node.js 运行时作为基础镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /usr/src/app

# 复制 package.json 和 package-lock.json（如果存在）
COPY package*.json ./

# 安装生产依赖
RUN npm install

# 复制应用源代码
COPY . .

# 创建环境变量文件（如果不存在）
RUN cp -n .env.example .env 2>/dev/null || true

# 暴露端口
EXPOSE 3001

# 设置 Docker 环境标识
ENV IS_DOCKER=true

# 启动应用
CMD ["npm", "start"]