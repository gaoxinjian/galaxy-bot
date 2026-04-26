// backend/src/services/ollama.ts
import axios from 'axios';

const OLLAMA_API = 'http://localhost:11434/api';

export const ollamaService = {
  async generateStream(
    model: string,
    prompt: string,
    settings: any,
    onChunk: (chunk: string) => Promise<void>
  ) {
    const response = await axios.post(
      `${OLLAMA_API}/generate`,
      {
        model,
        prompt,
        stream: true,
        // 传递��细化参数
        temperature: settings.temperature,
        top_p: settings.topP,
        top_k: settings.topK,
        num_predict: settings.numPredict,
      },
      {
        responseType: 'stream',
      }
    );

    return new Promise((resolve, reject) => {
      response.data.on('data', async (chunk: Buffer) => {
        try {
          const lines = chunk.toString().split('\n');
          for (const line of lines) {
            if (line.trim()) {
              const json = JSON.parse(line);
              if (json.response) {
                await onChunk(json.response);
              }
            }
          }
        } catch (error) {
          reject(error);
        }
      });

      response.data.on('end', resolve);
      response.data.on('error', reject);
    });
  },

  async listModels() {
    const response = await axios.get(`${OLLAMA_API}/tags`);
    return response.data.models;
  },
};