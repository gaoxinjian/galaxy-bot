import db from '../db';

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

export class SessionService {
  // 创建会话
  static createSession(title: string, model: string = 'qwen:9b'): Session {
    const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const stmt = db.prepare(
      'INSERT INTO sessions (id, title, model) VALUES (?, ?, ?)'
    );
    stmt.run(id, title, model);
    return this.getSession(id)!;
  }

  // 获取单个会话
  static getSession(id: string): Session | null {
    const stmt = db.prepare('SELECT * FROM sessions WHERE id = ?');
    return stmt.get(id) as Session | null;
  }

  // 获取所有会话（按更新时间倒序）
  static getAllSessions(): Session[] {
    const stmt = db.prepare(
      'SELECT * FROM sessions ORDER BY updated_at DESC'
    );
    return stmt.all() as Session[];
  }

  // 更新会话标题
  static updateTitle(id: string, title: string): void {
    const stmt = db.prepare(
      'UPDATE sessions SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    );
    stmt.run(title, id);
  }

  // 删除会话
  static deleteSession(id: string): void {
    const stmt = db.prepare('DELETE FROM sessions WHERE id = ?');
    stmt.run(id);
  }

  // 添加消息
  static addMessage(
    sessionId: string,
    role: 'user' | 'assistant' | 'system',
    content: string
  ): Message {
    const stmt = db.prepare(
      'INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)'
    );
    const result = stmt.run(sessionId, role, content);

    // 更新会话的 updated_at
    db.prepare(
      'UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(sessionId);

    return {
      id: result.lastInsertRowid as number,
      session_id: sessionId,
      role,
      content,
      created_at: new Date().toISOString(),
    };
  }

  // 获取会话的所有消息
  static getMessages(sessionId: string): Message[] {
    const stmt = db.prepare(
      'SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC'
    );
    return stmt.all(sessionId) as Message[];
  }

  // 获取最近 N 条消息（用于上下文）
  static getRecentMessages(sessionId: string, limit: number = 10): Message[] {
    const stmt = db.prepare(
      `SELECT * FROM messages 
       WHERE session_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`
    );
    return stmt.all(sessionId, limit).reverse() as Message[];
  }

  // 清空会话消息
  static clearMessages(sessionId: string): void {
    const stmt = db.prepare('DELETE FROM messages WHERE session_id = ?');
    stmt.run(sessionId);
  }
}
