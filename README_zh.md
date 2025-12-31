# Redis Web Manager

[English](README.md)

## 🇨🇳 中文

### 简介

一个基于 React 和 Express 构建的现代 Web 版 Redis 管理工具。它提供了友好的用户界面来管理多个 Redis 连接，以树形视图浏览键，并使用针对各种 Redis 数据类型的专用编辑器编辑值。

### 功能特性

- **多连接管理**：轻松切换不同的 Redis 服务器和数据库。
- **键资源管理器**：使用冒号 (`:`) 分隔符的层级树状视图。
- **丰富的值编辑器**：
  - **String**：文本、JSON、Hex、Base64 视图。
  - **Hash/List/Set**：带分页的专用表格/列表编辑器，支持大数据量。
  - **HyperLogLog**：查看基数和合并操作。
  - **JSON**：原生 JSON 编辑支持 (ReJSON)。
- **国际化**：支持多语言（英文/中文）。
- **现代 UI**：基于 Shadcn/UI、TailwindCSS 和 Radix UI 构建。

### 技术栈

- **前端**：React 19, Vite, TypeScript, TailwindCSS, Zustand, Radix UI, Monaco Editor。
- **后端**：Node.js, Express, ioredis。
- **包管理器**：pnpm (Monorepo workspace)。

### 快速开始

#### 前置要求

- Node.js (v18+)
- pnpm
- 运行中的 Redis 服务器

#### 安装

1. 克隆仓库：

   ```bash
   git clone <repository-url>
   cd redis-web-manager
   ```

2. 安装依赖：
   ```bash
   pnpm install
   ```

#### 启动开发服务器

同时启动前端和后端开发模式：

```bash
pnpm dev
```

- **前端地址**: http://localhost:5173
- **后端 API**: http://localhost:3000

#### Docker 部署

你可以使用 Docker Compose 运行整个应用程序。

1. 构建并启动容器：

   ```bash
   docker-compose up -d --build
   ```

2. 访问应用：

   - **前端**: http://localhost:8080
   - **后端 API**: http://localhost:3000
   - **Redis**: 暴露在端口 6379

**注意**：要从 Web 界面连接到内置的 Redis 实例，请添加新连接：
- **Host**: `redis-db`
- **Port**: `6379`

如果你在 Docker 环境里填了 `127.0.0.1:6379`，后端容器会把它当成“容器自身”，因此会出现 `ECONNREFUSED 127.0.0.1:6379`。请使用 `redis-db`（Docker Compose 的服务名）作为 Host。

---
