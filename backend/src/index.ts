import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { stream } from 'hono/streaming';
import axios from 'axios';
import sessions from './routes/sessions';
import { SessionService } from './services/sessionService';

const app = new Hono();

// 启用CORS
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  credentials: false,
}));

const OLLAMA_API = 'http://localhost:11434/api';

// 模型配置
const modelConfigs: Record<string, any> = {
  'qwen:9b': {
    displayName: 'Qwen 3.5 9B (快速)',
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
  },
  'qwen:35b-a3b': {
    displayName: 'Qwen 3.6 35B-A3B (精准)',
    temperature: 0.6,
    topP: 0.95,
    topK: 50,
  },
};

// GET /api/models - 获取可用模型
app.get('/api/models', async (c) => {
  try {
    const response = await axios.get(`${OLLAMA_API}/tags`);
    const models = response.data.models || [];
    
    return c.json({
      models: models.map((m: any) => ({
        name: m.name,
        config: modelConfigs[m.name] || {
          displayName: m.name,
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
        },
      })),
    });
  } catch (error) {
    return c.json({ error: 'Failed to fetch models' }, { status: 500 });
  }
});

// POST /api/chat - 流式聊天（支持会话上下文）
app.post('/api/chat', async (c) => {
  try {
    const body = await c.req.json();
    const { message, model, sessionId, temperature, topP, topK } = body;

    if (!message || !model) {
      return c.json(
        { error: 'message and model are required' },
        { status: 400 }
      );
    }

    // 验证会话是否存在
    let session = null;
    if (sessionId) {
      session = SessionService.getSession(sessionId);
      if (!session) {
        return c.json({ error: 'Session not found' }, { status: 404 });
      }
    }

    // 保存用户消息
    if (sessionId) {
      SessionService.addMessage(sessionId, 'user', message);
    }

    // 构建消息历史（用于上下文）
    const messages: Array<{ role: string; content: string }> = [];
    if (sessionId) {
      const history = SessionService.getRecentMessages(sessionId, 10);
      messages.push(...history.map(m => ({ role: m.role, content: m.content })));
    } else {
      messages.push({ role: 'user', content: message });
    }

    // 流式调用Ollama（使用 /api/chat 接口支持多轮对话）
    c.header('Content-Type', 'text/plain; charset=utf-8');
    return stream(c, async (writer) => {
      let fullResponse = '';

      try {
        const response = await axios.post(
          `${OLLAMA_API}/chat`,
          {
            model,
            messages,
            stream: true,
            temperature: temperature ?? modelConfigs[model]?.temperature ?? 0.7,
            top_p: topP ?? modelConfigs[model]?.topP ?? 0.9,
            top_k: topK ?? modelConfigs[model]?.topK ?? 40,
          },
          {
            responseType: 'stream',
          }
        );

        await new Promise<void>((resolve, reject) => {
          response.data.on('data', async (chunk: Buffer) => {
            try {
              const lines = chunk.toString().split('\n');
              for (const line of lines) {
                if (line.trim()) {
                  const json = JSON.parse(line);
                  if (json.message?.content) {
                    fullResponse += json.message.content;
                    await writer.write(new TextEncoder().encode(json.message.content));
                  }
                  if (json.done) {
                    resolve();
                  }
                }
              }
            } catch (error) {
              console.error('Error parsing chunk:', error);
            }
          });

          response.data.on('end', () => {
            resolve();
          });

          response.data.on('error', (error: Error) => {
            console.error('Stream error:', error);
            reject(error);
          });
        });

        // 保存AI回复
        if (sessionId && fullResponse) {
          SessionService.addMessage(sessionId, 'assistant', fullResponse);
        }

        await writer.write(new TextEncoder().encode('\n'));
      } catch (error) {
        console.error('Request error:', error);
        await writer.write(new TextEncoder().encode(
          `\n[Error: ${error instanceof Error ? error.message : 'Unknown error'}]\n`
        ));
      }
    });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});

// 会话路由
app.route('/api/sessions', sessions);

// 健康检查
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// 启动服务器
const port = 3001;
console.log(`Server running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`Server running on http://localhost:${port}`);
});
