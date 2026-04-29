/**
 * 模型状态管理
 * 支持 LocalStorage 持久化参数配置
 */

import { writable, derived, get } from 'svelte/store';
import type { Model } from './types';

// LocalStorage key
const PARAMS_STORAGE_KEY = 'galaxy-bot:model-params';

// 模型列表
export const models = writable<Model[]>([]);

// 当前选中的模型
export const selectedModel = writable<string>('');

// 从 LocalStorage 加载保存的参数
function loadStoredParams(): Record<string, Record<string, number>> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(PARAMS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// 保存参数到 LocalStorage
function saveStoredParams(allParams: Record<string, Record<string, number>>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PARAMS_STORAGE_KEY, JSON.stringify(allParams));
  } catch (e) {
    console.error('Failed to save params to localStorage:', e);
  }
}

// 所有模型的参数值（按模型名存储）
const allModelParams = writable<Record<string, Record<string, number>>>(loadStoredParams());

// 当前选中模型的参数值（派生 store）
export const paramValues = derived(
  [selectedModel, allModelParams],
  ([$selectedModel, $allModelParams]) => {
    return $selectedModel ? ($allModelParams[$selectedModel] ?? {}) : {};
  }
);

// 更新当前模型的参数值
export function updateParamValue(key: string, value: number): void {
  const model = get(selectedModel);
  if (!model) return;

  allModelParams.update(params => {
    const newParams = {
      ...params,
      [model]: {
        ...(params[model] ?? {}),
        [key]: value
      }
    };
    saveStoredParams(newParams);
    return newParams;
  });
}

// 重置当前模型的参数为默认值
export function resetModelParams(): void {
  const model = get(selectedModel);
  if (!model) return;

  allModelParams.update(params => {
    const { [model]: _, ...rest } = params;
    saveStoredParams(rest);
    return rest;
  });
}

// 加载状态
export const isLoadingModels = writable<boolean>(false);
export const modelError = writable<string>('');

// API 基础地址
const API_BASE = 'http://localhost:3001';

/**
 * 获取可用模型列表
 */
export async function fetchModels(): Promise<void> {
  isLoadingModels.set(true);
  modelError.set('');

  try {
    const response = await fetch(`${API_BASE}/api/models`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    models.set(data.models);

    // 默认选中第一个模型
    if (data.models.length > 0) {
      selectedModel.set(data.models[0].name);
    }
  } catch (err) {
    modelError.set(err instanceof Error ? err.message : String(err));
  } finally {
    isLoadingModels.set(false);
  }
}

/**
 * 获取当前选中模型的参数值（合并默认值和用户调整）
 */
export function getCurrentParamValues(
  currentModel: Model | undefined,
  currentParamValues: Record<string, number>
): Record<string, number> {
  if (!currentModel) return {};

  const options: Record<string, number> = {};
  for (const [key, param] of Object.entries(currentModel.config.parameters)) {
    const value = currentParamValues[key] ?? param.default;
    if (typeof value === 'number') {
      options[key] = value;
    }
  }
  return options;
}
