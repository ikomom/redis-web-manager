这是一个更新后的开发计划，已将 UI 库替换为 **shadcn/ui** 并指定使用 **pnpm** 进行包管理。

**注意**：由于浏览器安全限制，仍需保留轻量级 Node.js 后端作为 Redis 的连接代理。

# Redis 管理工具开发计划 (shadcn/ui + pnpm)

## 1. 项目初始化 (使用 pnpm)
- **环境准备**: 确保使用 `pnpm` 管理依赖。
- **目录结构**:
  - `/server`: Node.js + Express + TypeScript
  - `/client`: React + Vite + TypeScript
- **pnpm 配置**: 使用 pnpm workspace 管理前后端（可选）或分别初始化。

## 2. 前端开发 (Client)
- **基础搭建**:
  - 初始化 Vite + React + TS 项目。
  - 配置 Tailwind CSS (shadcn/ui 前置依赖)。
  - 初始化 shadcn/ui: `npx shadcn-ui@latest init`。
- **组件安装**:
  - 安装所需组件: `Button`, `Input`, `Dialog`, `Table`, `Select`, `Card`, `Textarea` 等。
  - 安装图标库: `lucide-react`。
- **功能模块**:
  - **连接管理**: 使用 Shadcn Dialog 和 Form 制作连接配置弹窗，侧边栏展示连接列表。
  - **键值浏览器**: 使用 Table 组件展示 Key 列表。
  - **编辑器**: 根据 Key 类型 (String/Hash/List) 渲染不同的编辑视图。

## 3. 后端开发 (Server)
- **技术栈**: Express, TypeScript, ioredis, cors, body-parser。
- **API 接口**:
  - `POST /connect`: 测试连接。
  - `GET /keys`: 扫描 Key。
  - `GET /value`: 获取 Value (带类型解析)。
  - `POST /value`: 设置 Value。
  - `DELETE /key`: 删除 Key。
- **类型定义**: 严格定义 Redis 数据结构接口，避免使用 `any`。

## 4. 联调与优化
- 确保前后端接口对接顺畅。
- 添加代码注释。
- 最终验证所有增删改查功能。

准备好后，我将首先使用 pnpm 初始化项目结构。