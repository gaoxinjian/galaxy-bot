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
- 多会话管理（SQLite 持久化）
- 聊天记录保存（自动保存到数据库）

## 技术栈

- **后端**: Hono, Axios, TypeScript, SQLite
- **前端**: Svelte 5, Tailwind CSS, Vite

## Todo List

### Phase 1: 现有功能前端完善
- [ ] **API 地址环境变量** - 支持配置后端地址，避免硬编码
- [ ] **错误处理优化** - 网络错误、模型加载失败等提示

### Phase 2: 记忆功能升级
- [ ] **调研记忆方案** - 评估向量数据库、LLM 摘要、结构化记忆等方案
- [ ] **实现 LLM 摘要** - 每 N 轮对话生成摘要，替代简单的 10 条历史记录
- [ ] **记忆管理** - 支持查看、编辑、删除记忆

### Phase 3: 文件上传
- [ ] **后端接入 fileHandler** - 把现有的文件处理代码接入路由
- [ ] **前端文件选择 UI** - 支持拖拽/选择文件
- [ ] **文件内容处理** - 支持文本、图片、PDF 等格式

### Phase 4: 界面优化
- [ ] **交互细节** - 动画、加载状态、空状态优化

### Phase 5: 简单对话
- [ ] **简单对话** - 有时候可能只是问模型一两个简单问题，查询资料，并不需要长记忆，需要模型快速给出回复。

### Phase 6: skills
- [ ] **技能实现** - 尝试做本地文件处理的能力

### Phase 7: 知识库

## 已完成

- [x] 流式对话
- [x] 模型切换
- [x] 多会话管理
- [x] 聊天记录保存
- [x] 模型参数配置
- [x] 背景图片、风格调整
