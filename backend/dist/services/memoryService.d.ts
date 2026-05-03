export interface ContextMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    seq: number;
}
export declare class MemoryService {
    static getNextSeq(sessionId: string): number;
    static estimateTokens(text: string): number;
    static addMessage(sessionId: string, role: 'user' | 'assistant' | 'system', content: string): {
        id: number;
        seq: number;
    };
    static shouldCompress(sessionId: string): boolean;
    static getCompressionRange(sessionId: string): {
        keepMessages: Array<{
            seq: number;
            content: string;
            role: string;
            token_count: number;
        }>;
        compressMessages: Array<{
            seq: number;
            content: string;
            role: string;
            token_count: number;
        }>;
    };
    static generateSummary(messages: Array<{
        role: string;
        content: string;
    }>): Promise<string>;
    static compressSession(sessionId: string): Promise<void>;
    static archiveOldSummaries(sessionId: string): void;
    static getContextMessages(sessionId: string): ContextMessage[];
}
//# sourceMappingURL=memoryService.d.ts.map