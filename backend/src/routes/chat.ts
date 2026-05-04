import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import axios from 'axios';
import { SessionService } from '../services/sessionService';
import { MemoryService } from '../services/memoryService';
import { /* OLLAMA_API, */ MLX_API,  buildOllamaOptions } from '../config';

const chat = new Hono();

// POST /api/chat - 带会话的生成回复
chat.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { message, model, sessionId, think = false, options: userOptions } = body;

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
      
      // 获取上下文消息（传入当前消息以计算token限制）
      const context = MemoryService.getContextMessages(sessionId, { role: 'user', content: message });
      messages = context.map(m => ({ role: m.role, content: m.content }));
      
      // 添加当前用户消息
      messages.push({ role: 'user', content: message });
      
      // 保存用户消息
      MemoryService.addMessage(sessionId, 'user', message);
    } else {
      messages.push({ role: 'user', content: message });
    }

    // 流式调用 Ollama
    c.header('Content-Type', 'text/plain; charset=utf-8');
    return stream(c, async (writer) => {
      let fullResponse = '';

      try {
        // 构建 Ollama 参数：用户传入的 options 覆盖配置文件默认值
        const ollamaOptions = buildOllamaOptions(model, userOptions || {});
        
        console.info('MLX_API messages:', messages);

        const response = await axios.post(
          // `${OLLAMA_API}/chat`,
          `${MLX_API}/v1/chat/completions`,
          {
            model,
            messages,
            think,
            stream: true,
            ...ollamaOptions,
          },
          { responseType: 'stream' }
        );

        await new Promise<void>((resolve, reject) => {
          response.data.on('data', async (chunk: Buffer) => {
            try {
              const lines = chunk.toString().split('\n');
              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                
                // OpenAI SSE format: data: {...}
                if (trimmed.startsWith('data: ')) {
                  const dataStr = trimmed.slice(6); // remove 'data: '
                  
                  // End marker
                  if (dataStr === '[DONE]') {
                    resolve();
                    return;
                  }
                  
                  const json = JSON.parse(dataStr);
                  const content = json.choices?.[0]?.delta?.content;
                  const finishReason = json.choices?.[0]?.finish_reason;
                  
                  if (content) {
                    fullResponse += content;
                    await writer.write(new TextEncoder().encode(content));
                  }
                  
                  if (finishReason === 'stop' || finishReason === 'length') {
                    resolve();
                    return;
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

        // 保存 AI 回复（使用 MemoryService）
        if (sessionId && fullResponse) {
          MemoryService.addMessage(sessionId, 'assistant', fullResponse);
        }

        await writer.write(new TextEncoder().encode('\n'));
        
        // 流结束后异步检查是否需要压缩（延迟执行，避免阻塞）
        if (sessionId) {
          setImmediate(() => {
            if (MemoryService.shouldCompress(sessionId)) {
              MemoryService.compressSession(sessionId).catch(err => {
                console.error('Compression failed:', err);
              });
            }
          });
        }
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
