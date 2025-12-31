# 全面改造：基于本地文件的配置持久化方案

根据您的要求，我们将把 Redis 连接配置持久化存储在后端的本地文本文件中，并重构 API 以移除请求中的敏感信息。

## 1. 后端改造 (Server)

### 1.1 配置文件管理
- **文件存储**: 在 `server` 目录下创建一个 `connections.json` 文件来存储连接配置。
- **配置结构**:
  ```typescript
  interface StoredConnection {
    id: string;        // 唯一 ID (UUID)
    name: string;      // 连接名称
    host: string;
    port: number;
    password?: string;
    db?: number;
    createdAt: number;
  }
  ```
- **FileStore 类**: 创建一个 `FileStore` 类负责读写 `connections.json`。

### 1.2 API 接口重构
- **GET /api/connections**: 读取 `connections.json`，返回所有连接列表（**注意：返回给前端时必须剔除 password 字段**）。
- **POST /api/connections**:
  - 接收包含密码的完整配置。
  - 生成 UUID。
  - 验证连接有效性。
  - 将完整配置（含密码）写入 `connections.json`。
  - 返回不含密码的连接信息。
- **DELETE /api/connections/:id**: 从文件中删除指定 ID 的连接。
- **业务接口 (Keys, Value, Set, Delete)**:
  - 请求体不再包含 `config` 对象，而是只传 `connectionId`。
  - 后端根据 `connectionId` 从 `connections.json` (或内存缓存) 中读取完整配置（含密码），然后操作 Redis。

## 2. 前端改造 (Client)

### 2.1 状态管理 (`useStore`)
- **移除本地存储**: 不再将连接信息存储在浏览器的 `localStorage` 中（Zustand 的 persist 中间件可能需要调整或移除连接相关的持久化）。
- **初始化加载**: 应用启动时，调用 `GET /api/connections` 从后端获取已保存的连接列表。

### 2.2 交互流程
- **添加连接**: 用户填写表单 -> 调用 `POST /api/connections` -> 后端保存并返回 ID -> 前端更新列表。
- **业务操作**: 所有 Redis 操作（查询、设置等）均只发送 `connectionId`。

## 3. 实施步骤

1.  **后端**: 实现 `FileStore` 类用于管理 `connections.json`。
2.  **后端**: 改造 `RedisManager`，使其支持通过 ID 查找配置。
3.  **后端**: 重写 `/api/connect` 为 `/api/connections` (CRUD)。
4.  **后端**: 更新所有业务 API，接收 `connectionId` 并从后端获取配置。
5.  **前端**: 更新 `api.ts` 适配新接口。
6.  **前端**: 更新 `ConnectionManager` 和 `useStore`，对接后端配置管理接口。

这样，敏感信息（密码）只保存在服务器端的 `connections.json` 文件中，前端和网络传输中不再暴露密码。
