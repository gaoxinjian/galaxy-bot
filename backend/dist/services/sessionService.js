import db from '../db';
export class SessionService {
    // 创建会话
    static createSession(title, model = 'qwen:9b') {
        const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const stmt = db.prepare('INSERT INTO sessions (id, title, model) VALUES (?, ?, ?)');
        stmt.run(id, title, model);
        return this.getSession(id);
    }
    // 获取单个会话
    static getSession(id) {
        const stmt = db.prepare('SELECT * FROM sessions WHERE id = ?');
        return stmt.get(id);
    }
    // 获取所有会话（按更新时间倒序）
    static getAllSessions() {
        const stmt = db.prepare('SELECT * FROM sessions ORDER BY updated_at DESC');
        return stmt.all();
    }
    // 更新会话标题
    static updateTitle(id, title) {
        const stmt = db.prepare('UPDATE sessions SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        stmt.run(title, id);
    }
    // 删除会话
    static deleteSession(id) {
        const stmt = db.prepare('DELETE FROM sessions WHERE id = ?');
        stmt.run(id);
    }
    // 添加消息
    static addMessage(sessionId, role, content) {
        const stmt = db.prepare('INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)');
        const result = stmt.run(sessionId, role, content);
        // 更新会话的 updated_at
        db.prepare('UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(sessionId);
        return {
            id: result.lastInsertRowid,
            session_id: sessionId,
            role,
            content,
            created_at: new Date().toISOString(),
        };
    }
    // 获取会话的所有消息
    static getMessages(sessionId) {
        const stmt = db.prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC');
        return stmt.all(sessionId);
    }
    // 获取最近 N 条消息（用于上下文）
    static getRecentMessages(sessionId, limit = 10) {
        const stmt = db.prepare(`SELECT * FROM messages 
       WHERE session_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`);
        return stmt.all(sessionId, limit).reverse();
    }
    // 清空会话消息
    static clearMessages(sessionId) {
        const stmt = db.prepare('DELETE FROM messages WHERE session_id = ?');
        stmt.run(sessionId);
    }
}
//# sourceMappingURL=sessionService.js.map