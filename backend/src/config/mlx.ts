/**
 * MLX API 配置
 */

// MLX API 地址
export const MLX_API = 'http://localhost:8830';

// 模型配置
export const modelConfigs: Record<string, any> = {
  'qwen3.5:9b': {
    displayName: 'Qwen 3.5 9B (快速)',
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
  },
  'qwen3.5:35b-a3b': {
    displayName: 'Qwen 3.5 35B-A3B (精准)',
    temperature: 0.6,
    topP: 0.95,
    topK: 50,
  },
};

export default { MLX_API, modelConfigs };
