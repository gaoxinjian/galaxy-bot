import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import axios from 'axios';
import { SessionService } from '../services/sessionService';
import { MemoryService } from '../services/memoryService';
import { OLLAMA_API, buildOllamaOptions } from '../config';
const chat = new Hono();
// POST /api/chat - 带会话的生成回复
chat.post('/', async (c) => {
    try {
        const body = await c.req.json();
        const { message, model, sessionId, think = false, options: userOptions } = body;
        if (!message || !model) {
            return c.json({ error: 'message and model are required' }, { status: 400 });
        }
        // 验证会话是否存在
        let messages = [];
        if (sessionId) {
            const session = SessionService.getSession(sessionId);
            if (!session) {
                return c.json({ error: 'Session not found' }, { status: 404 });
            }
            // 保存用户消息（使用 MemoryService）
            MemoryService.addMessage(sessionId, 'user', message);
            // 检查是否需要压缩
            if (MemoryService.shouldCompress(sessionId)) {
                await MemoryService.compressSession(sessionId);
            }
            // 获取上下文消息
            const context = MemoryService.getContextMessages(sessionId);
            messages = context.map(m => ({ role: m.role, content: m.content }));
        }
        else {
            messages.push({ role: 'user', content: message });
        }
        // 流式调用 Ollama
        c.header('Content-Type', 'text/plain; charset=utf-8');
        return stream(c, async (writer) => {
            let fullResponse = '';
            try {
                // 构建 Ollama 参数：用户传入的 options 覆盖配置文件默认值
                const ollamaOptions = buildOllamaOptions(model, userOptions || {});
                console.info('Web messages:', messages);
                console.info('Web think:', think);
                console.info('Ollama options:', ollamaOptions);
                const response = await axios.post(`${OLLAMA_API}/chat`, {
                    model,
                    messages,
                    think,
                    stream: true,
                    ...ollamaOptions,
                }, { responseType: 'stream' });
                await new Promise((resolve, reject) => {
                    response.data.on('data', async (chunk) => {
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
                        }
                        catch (error) {
                            console.error('Error parsing chunk:', error);
                        }
                    });
                    response.data.on('end', () => {
                        resolve();
                    });
                    response.data.on('error', (error) => {
                        console.error('Stream error:', error);
                        reject(error);
                    });
                });
                // 保存 AI 回复（使用 MemoryService）
                if (sessionId && fullResponse) {
                    MemoryService.addMessage(sessionId, 'assistant', fullResponse);
                }
                await writer.write(new TextEncoder().encode('\n'));
            }
            catch (error) {
                console.error('Request error:', error);
                await writer.write(new TextEncoder().encode(`\n[Error: ${error instanceof Error ? error.message : 'Unknown error'}]\n`));
            }
        });
    }
    catch (error) {
        return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
});
export default chat;
//# sourceMappingURL=chat.js.map