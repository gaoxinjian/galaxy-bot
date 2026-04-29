export interface Session {
    id: string;
    title: string;
    model: string;
    created_at: string;
    updated_at: string;
}
export interface Message {
    id: number;
    session_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at: string;
}
export declare class SessionService {
    static createSession(title: string, model?: string): Session;
    static getSession(id: string): Session | null;
    static getAllSessions(): Session[];
    static updateTitle(id: string, title: string): void;
    static deleteSession(id: string): void;
    static addMessage(sessionId: string, role: 'user' | 'assistant' | 'system', content: string): Message;
    static getMessages(sessionId: string): Message[];
    static getRecentMessages(sessionId: string, limit?: number): Message[];
    static clearMessages(sessionId: string): void;
}
//# sourceMappingURL=sessionService.d.ts.map