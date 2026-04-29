/**
 * 模型参数配置管理
 * 从 JSON 文件加载通用参数和模型专用参数
 */
export interface ParameterDef {
    type: 'float' | 'int' | 'string';
    default: number | string;
    min?: number;
    max?: number;
    step?: number;
    description?: string;
}
export interface ModelConfig {
    displayName: string;
    parameters: Record<string, Partial<ParameterDef>>;
}
interface ModelParamsConfig {
    common: Record<string, ParameterDef>;
    models: Record<string, ModelConfig>;
}
declare const config: ModelParamsConfig;
/**
 * 获取通用参数定义
 */
export declare function getCommonParameters(): Record<string, ParameterDef>;
/**
 * 获取特定模型的完整参数配置
 * 合并通用参数 + 模型专用覆盖
 */
export declare function getModelParameters(modelName: string): Record<string, ParameterDef>;
/**
 * 获取模型的显示名称
 */
export declare function getModelDisplayName(modelName: string): string;
/**
 * 检查模型是否有专用配置
 */
export declare function hasModelConfig(modelName: string): boolean;
/**
 * 构建传递给 Ollama 的 options 对象
 */
export declare function buildOllamaOptions(modelName: string, userOverrides?: Record<string, number>): Record<string, number>;
export default config;
//# sourceMappingURL=modelParams.d.ts.map