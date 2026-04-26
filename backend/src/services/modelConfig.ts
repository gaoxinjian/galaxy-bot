// backend/src/services/modelConfig.ts
interface ModelConfig {
  name: string;
  displayName: string;
  defaultSettings: {
    temperature: number;
    topP: number;
    topK: number;
    numPredict?: number;
    repeatPenalty?: number;
  };
  maxTokens: number;
  description: string;
}

const MODELS_CONFIG: Record<string, ModelConfig> = {
  'qwen:9b': {
    name: 'qwen:9b',
    displayName: 'Qwen 3.5 9B (快速)',
    defaultSettings: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      numPredict: 512,
    },
    maxTokens: 512,
    description: '快速、轻量，适合日常聊天和代码补全',
  },
  'qwen:35b-a3b': {
    name: 'qwen:35b-a3b',
    displayName: 'Qwen 3.6 35B-A3B (精准)',
    defaultSettings: {
      temperature: 0.6,
      topP: 0.95,
      topK: 50,
      numPredict: 2000,
    },
    maxTokens: 2000,
    description: '强大的推理能力，适合复杂任务',
  },
};

export const modelConfigService = {
  getConfig(modelName: string): ModelConfig {
    return MODELS_CONFIG[modelName] || MODELS_CONFIG['qwen:9b'];
  },

  getAllModels(): ModelConfig[] {
    return Object.values(MODELS_CONFIG);
  },

  updateConfig(modelName: string, config: Partial<ModelConfig>) {
    if (MODELS_CONFIG[modelName]) {
      MODELS_CONFIG[modelName] = {
        ...MODELS_CONFIG[modelName],
        ...config,
      };
    }
  },
};