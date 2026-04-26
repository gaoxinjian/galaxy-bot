// backend/src/services/fileHandler.ts
import sharp from 'sharp';

interface FileInfo {
  name: string;
  type: string;
  content: string;
}

export const fileHandler = {
  async processFiles(files: File[]): Promise<string> {
    const fileContents: FileInfo[] = [];

    for (const file of files) {
      try {
        const buffer = await file.arrayBuffer();
        const content = await this.extractContent(
          Buffer.from(buffer),
          file.type,
          file.name
        );

        fileContents.push({
          name: file.name,
          type: file.type,
          content,
        });
      } catch (error) {
        console.error(`处理文件 ${file.name} 失败:`, error);
      }
    }

    // 格式化为可读的context
    return fileContents
      .map(
        (f) => `【文件: ${f.name}】\n${f.content}`
      )
      .join('\n\n---\n\n');
  },

  private async extractContent(
    buffer: Buffer,
    mimeType: string,
    filename: string
  ): Promise<string> {
    // 处理文本文件
    if (
      mimeType === 'text/plain' ||
      mimeType === 'text/markdown' ||
      mimeType === 'application/json' ||
      filename.endsWith('.txt') ||
      filename.endsWith('.md') ||
      filename.endsWith('.json')
    ) {
      return buffer.toString('utf-8');
    }

    // 处理代码文件
    if (
      filename.endsWith('.js') ||
      filename.endsWith('.ts') ||
      filename.endsWith('.py') ||
      filename.endsWith('.java') ||
      filename.endsWith('.cpp') ||
      filename.endsWith('.go')
    ) {
      return buffer.toString('utf-8');
    }

    // 处理图片（提取metadata而不是二进制）
    if (mimeType.startsWith('image/')) {
      try {
        const metadata = await sharp(buffer).metadata();
        return `[图片信息] 宽度: ${metadata.width}, 高度: ${metadata.height}, 格式: ${metadata.format}`;
      } catch {
        return '[无法解析的图片]';
      }
    }

    // 处理PDF（简单版本，需要pdf-parse库）
    if (mimeType === 'application/pdf') {
      try {
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(buffer);
        // 返回前1000个字符
        return data.text.substring(0, 1000);
      } catch {
        return '[无法解析的PDF]';
      }
    }

    return '[不支持的文件类型]';
  },
};