# Galaxy Bot

本地 AI 聊天工具，基于 Ollama + Svelte 5。

## 架构

```
galaxy-bot/
├── backend/     # Hono + Node.js 服务端
└── frontend/    # Svelte 5 + Tailwind CSS 前端
```

## 快速开始

### 1. 启动 Ollama

确保本地 Ollama 已安装并运行：
```bash
ollama serve
```

### 2. 启动后端

```bash
cd backend
npm install
npm run dev
```

后端运行在 http://localhost:3001

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端运行在 http://localhost:5173

### 4. 打开浏览器

访问 http://localhost:5173 开始聊天。

## 功能

- 流式对话（逐字显示）
- 模型切换（从 Ollama 自动获取列表）
- 参数调节（Temperature、Top P、Top K）

## 技术栈

- **后端**: Hono, Axios, TypeScript
- **前端**: Svelte 5, Tailwind CSS, Vite

## 待办

- [ ] 文件/图片上传
- [ ] 聊天记录保存
- [ ] 多会话管理
