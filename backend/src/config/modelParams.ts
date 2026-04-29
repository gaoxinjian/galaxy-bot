/**
 * 模型参数配置管理
 * 从 JSON 文件加载通用参数和模型专用参数
 */

import modelParamsJson from './modelParams.json';

// 参数定义接口
export interface ParameterDef {
  type: 'float' | 'int' | 'string';
  default: number | string;
  min?: number;
  max?: number;
  step?: number;
  description?: string;
}

// 模型配置接口
export interface ModelConfig {
  displayName: string;
  parameters: Record<string, Partial<ParameterDef>>;
}

// 完整配置结构
interface ModelParamsConfig {
  common: Record<string, ParameterDef>;
  models: Record<string, ModelConfig>;
}

const config = modelParamsJson as ModelParamsConfig;

/**
 * 获取通用参数定义
 */
export function getCommonParameters(): Record<string, ParameterDef> {
  return config.common;
}

/**
 * 获取特定模型的完整参数配置
 * 合并通用参数 + 模型专用覆盖
 */
export function getModelParameters(modelName: string): Record<string, ParameterDef> {
  const common = { ...config.common };
  const modelSpecific = config.models[modelName];

  if (!modelSpecific) {
    // 模型未配置，返回通用参数
    return common;
  }

  // 合并参数：通用参数为基础，模型专用参数覆盖
  const merged: Record<string, ParameterDef> = {};

  // 先加入所有通用参数
  for (const [key, def] of Object.entries(common)) {
    merged[key] = { ...def };
  }

  // 用模型专用参数覆盖
  for (const [key, override] of Object.entries(modelSpecific.parameters)) {
    if (merged[key]) {
      // 覆盖现有参数的部分属性
      merged[key] = { ...merged[key], ...override };
    } else {
      // 新增参数（完整定义）
      merged[key] = override as ParameterDef;
    }
  }

  return merged;
}

/**
 * 获取模型的显示名称
 */
export function getModelDisplayName(modelName: string): string {
  return config.models[modelName]?.displayName || modelName;
}

/**
 * 检查模型是否有专用配置
 */
export function hasModelConfig(modelName: string): boolean {
  return modelName in config.models;
}

/**
 * 构建传递给 Ollama 的 options 对象
 */
export function buildOllamaOptions(
  modelName: string,
  userOverrides: Record<string, number> = {}
): Record<string, number> {
  const params = getModelParameters(modelName);
  const options: Record<string, number> = {};

  for (const [key, def] of Object.entries(params)) {
    // 用户覆盖 > 模型默认 > 通用默认
    if (userOverrides[key] !== undefined) {
      options[key] = userOverrides[key];
    } else if (def.default !== undefined && typeof def.default === 'number') {
      options[key] = def.default;
    }
  }

  return options;
}

export default config;
