import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import axios from 'axios';
import { SessionService } from '../services/sessionService';
import { OLLAMA_API, modelConfigs } from '../config';

const chat = new Hono();

// POST /api/chat - 带会话的生成回复
chat.post('/', async (c) => {
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
    let messages: Array<{ role: string; content: string }> = [];
    
    if (sessionId) {
      const session = SessionService.getSession(sessionId);
      if (!session) {
        return c.json({ error: 'Session not found' }, { status: 404 });
      }
      
      // 保存用户消息
      SessionService.addMessage(sessionId, 'user', message);
      
      // 构建消息历史
      const history = SessionService.getRecentMessages(sessionId, 10);
      messages.push(...history.map(m => ({ role: m.role, content: m.content })));
    } else {
      messages.push({ role: 'user', content: message });
    }

    // 流式调用 Ollama
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
          { responseType: 'stream' }
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

        // 保存 AI 回复
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

export default chat;
