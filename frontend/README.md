# Galaxy Bot Frontend

Svelte 5 + Tailwind CSS 前端界面。

## 启动

```bash
npm install
npm run dev    # 开发服务器
```

## 构建

```bash
npm run build
npm run preview
```

## 技术要点

- **Svelte 5**: 使用 `$state()` 响应式语法
- **流式渲染**: 通过 `ReadableStream` 逐字显示 AI 回复
- **代理配置**: 开发时请求转发到 http://localhost:3001

## 项目结构

```
src/
├── routes/
│   └── +page.svelte    # 主聊天界面
├── store/
│   └── chat.ts         # 状态管理（预留）
└── app.html
```

## 注意事项

- 确保后端已启动在 3001 端口
- 浏览器需支持 `ReadableStream` 和 `TextDecoder`
