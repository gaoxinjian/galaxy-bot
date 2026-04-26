# Galaxy Bot Backend

Hono + Node.js 服务端，为前端提供 Ollama 代理服务。

## 启动

```bash
npm install
npm run dev    # 开发模式（热重载）
```

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| GET | `/api/models` | 获取可用模型列表 |
| POST | `/api/chat` | 流式聊天 |

### POST /api/chat

**请求体**:
```json
{
  "message": "你好",
  "model": "qwen:9b",
  "temperature": 0.7,
  "topP": 0.9,
  "topK": 40
}
```

**响应**: text/plain 流式输出

## 配置

模型默认参数在 `src/config/model.json`（如存在）或代码中的 `modelConfigs` 对象。

## 依赖

- Ollama 运行在 http://localhost:11434
