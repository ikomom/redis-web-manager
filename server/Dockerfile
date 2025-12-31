FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies（不使用 frozen-lockfile，避免锁文件版本不一致导致构建失败）
RUN pnpm install --no-frozen-lockfile

# Copy source
COPY . .

# Build
RUN pnpm build

# Expose port
EXPOSE 3000

# Start command
CMD ["node", "dist/index.js"]
