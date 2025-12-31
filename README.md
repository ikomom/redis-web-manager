# Redis Web Manager

[中文](README_zh.md)

## 🇬🇧 English

### Introduction

A modern, web-based Redis management tool built with React and Express. It provides a user-friendly interface to manage multiple Redis connections, explore keys in a tree view, and edit values with specialized editors for various Redis data types.

### Features

- **Multi-Connection Management**: Easily switch between different Redis servers and databases.
- **Key Explorer**: Hierarchical tree view for keys using colon (`:`) separators.
- **Rich Value Editor**:
  - **String**: Text, JSON, Hex, Base64 views.
  - **Hash/List/Set**: Dedicated table/list editors with pagination for large collections.
  - **HyperLogLog**: View count and merge operations.
  - **JSON**: Native JSON editing support (ReJSON).
- **Internationalization**: Support for multiple languages (English/Chinese).
- **Modern UI**: Built with Shadcn/UI, TailwindCSS, and Radix UI.

### Tech Stack

- **Frontend**: React 19, Vite, TypeScript, TailwindCSS, Zustand, Radix UI, Monaco Editor.
- **Backend**: Node.js, Express, ioredis.
- **Package Manager**: pnpm (Monorepo workspace).

### Getting Started

#### Prerequisites

- Node.js (v18+)
- pnpm
- A running Redis server

#### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd redis-web-manager
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

#### Running Development Server

Start both client and server in development mode:

```bash
pnpm dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000

#### Docker Deployment

You can run the entire application using Docker Compose.

1. Build and run the containers:

   ```bash
   docker-compose up -d --build
   ```

2. Access the application:

   - **Frontend**: http://localhost:8080
   - **Backend API**: http://localhost:3000
   - **Redis**: Exposed on port 6379

**Note**: To connect to the built-in Redis instance from the web interface, add a new connection with:
- **Host**: `redis-db`
- **Port**: `6379`

If you use `127.0.0.1:6379` while running with Docker, the backend container will treat it as the container itself, which results in `ECONNREFUSED 127.0.0.1:6379`. Use `redis-db` (the Docker Compose service name) instead.
