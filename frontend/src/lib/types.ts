/**
 * 全局类型定义
 * 与后端保持一致
 */

// 参数定义
export interface ParameterDef {
  type: 'float' | 'int' | 'string';
  default: number | string;
  min?: number;
  max?: number;
  step?: number;
  description?: string;
}

// 模型配置
export interface ModelConfig {
  displayName: string;
  parameters: Record<string, ParameterDef>;
}

// 模型
export interface Model {
  name: string;
  config: ModelConfig;
}

// 消息（与后端 sessionService.ts 保持一致）
export interface Message {
  id: number;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

// 会话（与后端 sessionService.ts 保持一致）
export interface Session {
  id: string;
  title: string;
  model: string;
  parameters?: string;  // JSON 字符串
  created_at: string;
  updated_at: string;
}
