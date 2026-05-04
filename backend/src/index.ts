import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import axios from 'axios';
import { PORT, getModelParameters, getModelDisplayName } from './config';
import sessions from './routes/sessions';
import chat from './routes/chat';

const app = new Hono();

// 启用 CORS
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type'],
  allowMethods: ['GET', 'POST', 'OPTIONS', 'OPTIONS'],
  credentials: false,
}));

// GET /api/models - 获取可用模型（包含完整参数配置）
app.get('/api/models', async (c) => {
  try {
    const response = await axios.get(`${process.env.MLX_API || 'http://localhost:8830'}/api/modellist`);
    console.info('MLX_API models response:', response.data);
    const models = response.data || [];

    return c.json({
      models: models.map((m: any) => {
        const modelName = m;
        const parameters = getModelParameters(modelName);

        return {
          name: modelName,
          config: {
            displayName: getModelDisplayName(modelName),
            parameters,
          },
        };
      }),
    });
  } catch (error) {
    return c.json({ error: 'Failed to fetch models' }, { status: 500 });
  }
});

// POST /api/chat - 带会话的生成回复
app.route('/api/chat', chat);

// 会话路由
app.route('/api/sessions', sessions);

// 健康检查
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// 启动服务器
serve({
  fetch: app.fetch,
  port: PORT,
}, (info) => {
  console.log(`Server running on http://localhost:${PORT}`);
});
