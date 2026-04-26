// backend/src/routes/chat.ts
import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import { ollamaService } from '../services/ollama';
import { fileHandler } from '../services/fileHandler';
import { modelConfigService } from '../services/modelConfig';

const router = new Hono();

router.post('/chat', async (c) => {
  try {
    // 直接从Hono获取FormData（Hono已内置支持）
    const formData = await c.req.formData();
    
    const message = formData.get('message') as string;
    const model = formData.get('model') as string;
    const settings = JSON.parse(formData.get('settings') as string);
    
    // 获取文件
    const filesArray = formData.getAll('files') as File[];

    // 获取该模型的配置
    const modelConfig = modelConfigService.getConfig(model);
    
    // 合并用户设置和默认配置
    const finalSettings = {
      ...modelConfig.defaultSettings,
      ...settings,
    };

    // 处理上传的文件
    let fileContext = '';
    if (filesArray && filesArray.length > 0) {
      fileContext = await fileHandler.processFiles(filesArray);
    }

    // 构建完整的prompt
    const fullPrompt = fileContext 
      ? `${fileContext}\n\n用户: ${message}`
      : message;

    // 流式调用Ollama
    return stream(c, async (writer) => {
      await ollamaService.generateStream(
        model,
        fullPrompt,
        finalSettings,
        async (chunk: string) => {
          await writer.write(chunk);
        }
      );
    });

  } catch (error) {
    return c.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
});

export default router;