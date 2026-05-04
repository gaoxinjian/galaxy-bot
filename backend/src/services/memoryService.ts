import db from '../db';

const TOKEN_LIMIT = 4096; // 上下文token限制
const KEEP_RECENT_TOKENS = 2048; // 压缩时保留最近的2048个token，剩余的进行摘要

export interface ContextMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  seq: number;
}

export class MemoryService {
  // 获取下一个序列号
  static getNextSeq(sessionId: string): number {
    const counter = db.prepare(
      'SELECT current_seq FROM session_counters WHERE session_id = ?'
    ).get(sessionId) as { current_seq: number } | undefined;

    if (!counter) {
      db.prepare(
        'INSERT INTO session_counters (session_id, current_seq) VALUES (?, 1)'
      ).run(sessionId);
      return 1;
    }

    const nextSeq = counter.current_seq + 1;
    db.prepare(
      'UPDATE session_counters SET current_seq = ? WHERE session_id = ?'
    ).run(nextSeq, sessionId);

    return nextSeq;
  }

  // 估算token数（简单版：字符数/4）
  static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  // 添加消息（带seq和token_count）
  static addMessage(
    sessionId: string,
    role: 'user' | 'assistant' | 'system',
    content: string
  ): { id: number; seq: number } {
    const seq = this.getNextSeq(sessionId);
    const tokenCount = this.estimateTokens(content);

    const result = db.prepare(
      `INSERT INTO messages (session_id, role, content, token_count, seq, is_archived) 
       VALUES (?, ?, ?, ?, ?, 0)`
    ).run(sessionId, role, content, tokenCount, seq);

    return { id: result.lastInsertRowid as number, seq };
  }

  // 检查是否需要压缩
  static shouldCompress(sessionId: string): boolean {
    const result = db.prepare(
      `SELECT COALESCE(SUM(token_count), 0) as total 
       FROM messages 
       WHERE session_id = ? AND is_archived = 0`
    ).get(sessionId) as { total: number };

    return result.total > TOKEN_LIMIT;
  }

  // 获取需要压缩的消息范围
  static getCompressionRange(sessionId: string): {
    keepMessages: Array<{ seq: number; content: string; role: string; token_count: number }>;
    compressMessages: Array<{ seq: number; content: string; role: string; token_count: number }>;
  } {
    // 获取所有未归档的消息，按seq倒序
    const messages = db.prepare(
      `SELECT seq, role, content, token_count 
       FROM messages 
       WHERE session_id = ? AND is_archived = 0 
       ORDER BY seq DESC`
    ).all(sessionId) as Array<{ seq: number; role: string; content: string; token_count: number }>;

    let tokenSum = 0;
    const keepMessages: typeof messages = [];
    const compressMessages: typeof messages = [];

    for (const msg of messages) {
      if (tokenSum < KEEP_RECENT_TOKENS) {
        keepMessages.unshift(msg);
        tokenSum += msg.token_count;
      } else {
        compressMessages.unshift(msg);
      }
    }

    return { keepMessages, compressMessages };
  }

  // 生成摘要（调用Ollama）
  static async generateSummary(messages: Array<{ role: string; content: string }>): Promise<string> {
    const prompt = `请将以下对话内容总结为简洁的摘要，保留关键信息，去除冗余细节：\n\n${messages.map(m => `${m.role}: ${m.content}`).join('\n')}\n\n请用一段话总结主要内容：`;

    const axios = (await import('axios')).default;
    const { /* OLLAMA_API, */ MLX_API, buildOllamaOptions } = await import('../config');

    const response = await axios.post(`${MLX_API}/v1/chat/completions`, {
      model: 'qwen3.5:9b',
      prompt,
      stream: false,
      think: false,
      ...buildOllamaOptions('qwen3.5:9b', {})
    });

    return response.data.response?.trim() || '';
  }

  // 执行压缩
  static async compressSession(sessionId: string): Promise<void> {
    const { keepMessages, compressMessages } = this.getCompressionRange(sessionId);

    if (compressMessages.length === 0) return;

    // 生成摘要
    const summaryContent = await this.generateSummary(compressMessages);
    const wrappedSummary = `<summary>${summaryContent}</summary>`;
    const summaryTokens = this.estimateTokens(wrappedSummary);

    const maxSeq = compressMessages[compressMessages.length - 1].seq;

    // 保存摘要
    db.prepare(
      `INSERT INTO summaries (session_id, role, content, covered_seq_start, covered_seq_end, token_count, seq, is_archived)
       VALUES (?, 'system', ?, ?, ?, ?, ?, 0)`
    ).run(
      sessionId,
      wrappedSummary,
      compressMessages[0].seq,
      compressMessages[compressMessages.length - 1].seq,
      summaryTokens,
      maxSeq
    );

    // 标记原始消息为已归档
    for (const msg of compressMessages) {
      db.prepare(
        'UPDATE messages SET is_archived = 1 WHERE session_id = ? AND seq = ?'
      ).run(sessionId, msg.seq);
    }

    // 归档旧摘要
    this.archiveOldSummaries(sessionId);
  }

  // 归档旧摘要（只保留最新的一个活跃摘要）
  static archiveOldSummaries(sessionId: string): void {
    const summaries = db.prepare(
      `SELECT * FROM summaries 
       WHERE session_id = ? AND is_archived = 0 
       ORDER BY seq DESC`
    ).all(sessionId) as Array<{
      id: number; content: string; covered_seq_start: number;
      covered_seq_end: number; seq: number
    }>;

    if (summaries.length > 1) {
      for (let i = 1; i < summaries.length; i++) {
        const old = summaries[i];

        db.prepare(
          `INSERT INTO archives (session_id, type, content, covered_seq_start, covered_seq_end)
           VALUES (?, 'summary', ?, ?, ?)`
        ).run(sessionId, old.content, old.covered_seq_start, old.covered_seq_end);

        db.prepare(
          'UPDATE summaries SET is_archived = 1 WHERE id = ?'
        ).run(old.id);
      }
    }
  }

  // 获取给LLM的上下文消息（包含摘要+消息，消息长度控制在TOKEN_LIMIT内，摘要不计入）
  static getContextMessages(sessionId: string, currentMessage?: { role: string; content: string }): ContextMessage[] {
    // 获取最新的一条摘要
    const summary = db.prepare(
      `SELECT content, seq FROM summaries 
       WHERE session_id = ? AND is_archived = 0 
       ORDER BY seq DESC LIMIT 1`
    ).get(sessionId) as { content: string; seq: number } | undefined;

    // 获取所有未归档的消息
    const messages = db.prepare(
      `SELECT role, content, seq, token_count FROM messages 
       WHERE session_id = ? AND is_archived = 0 
       ORDER BY seq DESC`
    ).all(sessionId) as Array<{ role: string; content: string; seq: number; token_count: number }>;

    // 计算当前消息token
    const currentTokenCount = currentMessage ? this.estimateTokens(currentMessage.content) : 0;
    
    // 可用token数 = TOKEN_LIMIT - 当前消息（摘要不计入）
    const availableTokens = TOKEN_LIMIT - currentTokenCount;
    
    // 从历史消息中选取，直到达到可用token限制
    let tokenSum = 0;
    const selectedMessages: typeof messages = [];
    
    for (const msg of messages) {
      if (tokenSum + msg.token_count <= availableTokens) {
        selectedMessages.push(msg);
        tokenSum += msg.token_count;
      } else {
        break;
      }
    }
    
    // 按顺序组装上下文
    const result: ContextMessage[] = [];
    
    // 先加摘要（如果有）
    if (summary) {
      result.push({ role: 'system', content: summary.content, seq: summary.seq });
    }
    
    // 再加选中的历史消息（按seq正序）
    selectedMessages.reverse().forEach(m => {
      result.push({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
        seq: m.seq
      });
    });
    
    return result;
  }
}
