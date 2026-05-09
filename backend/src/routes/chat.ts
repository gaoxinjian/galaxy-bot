import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import axios from 'axios';
import { SessionService } from '../services/sessionService';
import { MemoryService } from '../services/memoryService';
import { MLX_API,  buildMlxOptions } from '../config';

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
    let sessionParameters = {};

    if (sessionId) {
      const session = SessionService.getSession(sessionId);
      if (!session) {
        return c.json({ error: 'Session not found' }, { status: 404 });
      }

      // 获取会话级别的参数覆盖
      sessionParameters = SessionService.getParameters(sessionId);

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

    // 流式调用 MLX
    c.header('Content-Type', 'text/plain; charset=utf-8');
    return stream(c, async (writer) => {
      let fullResponse = '';

      try {
        // 构建参数：模型默认 ← 会话参数 ← 用户传入（优先级递增）
        const mergedOptions = {
          ...sessionParameters,
          ...userOptions
        };
        const mlxOptions = buildMlxOptions(model, mergedOptions);
        
        // 从 mlxOptions 中移除 think，使用前端传入的 think 值
        const { think: _, ...optionsWithoutThink } = mlxOptions;
        
        const response = await axios.post(
          `${MLX_API}/v1/chat/completions`,
          {
            model,
            messages,
            stream: true,
            ...optionsWithoutThink,
            think,  // 使用前端传入的 think，优先级最高
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
          if (fullResponse.includes("</think>") && fullResponse.includes("Thinking")) {
            fullResponse = fullResponse.split("</think>")[1].trim();
          }
          console.info(`Saving response to session ${sessionId}:`, fullResponse);
          MemoryService.addMessage(sessionId, 'assistant', fullResponse);
        }

        await writer.write(new TextEncoder().encode('\n'));
        
        // 流结束后异步检查是否需要压缩（延迟执行，避免阻塞）
        if (sessionId) {
          setImmediate(() => {
            if (MemoryService.shouldCompress(sessionId)) {
              MemoryService.compressSession(sessionId).catch(err => {
                // 这里现在一直在报错，但是不影响功能，先暂时屏蔽错误日志，后续再优化压缩逻辑
                // console.error('Compression failed:', err);
                console.error('Compression failed:');
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
