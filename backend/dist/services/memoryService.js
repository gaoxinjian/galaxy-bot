import db from '../db';
const TOKEN_LIMIT = 6000;
const KEEP_RECENT_TOKENS = 2000;
const COMPRESS_TOKENS = 4000;
export class MemoryService {
    // 获取下一个序列号
    static getNextSeq(sessionId) {
        const counter = db.prepare('SELECT current_seq FROM session_counters WHERE session_id = ?').get(sessionId);
        if (!counter) {
            db.prepare('INSERT INTO session_counters (session_id, current_seq) VALUES (?, 1)').run(sessionId);
            return 1;
        }
        const nextSeq = counter.current_seq + 1;
        db.prepare('UPDATE session_counters SET current_seq = ? WHERE session_id = ?').run(nextSeq, sessionId);
        return nextSeq;
    }
    // 估算token数（简单版：字符数/4）
    static estimateTokens(text) {
        return Math.ceil(text.length / 4);
    }
    // 添加消息（带seq和token_count）
    static addMessage(sessionId, role, content) {
        const seq = this.getNextSeq(sessionId);
        const tokenCount = this.estimateTokens(content);
        const result = db.prepare(`INSERT INTO messages (session_id, role, content, token_count, seq, is_archived) 
       VALUES (?, ?, ?, ?, ?, 0)`).run(sessionId, role, content, tokenCount, seq);
        return { id: result.lastInsertRowid, seq };
    }
    // 检查是否需要压缩
    static shouldCompress(sessionId) {
        const result = db.prepare(`SELECT COALESCE(SUM(token_count), 0) as total 
       FROM messages 
       WHERE session_id = ? AND is_archived = 0`).get(sessionId);
        return result.total > TOKEN_LIMIT;
    }
    // 获取需要压缩的消息范围
    static getCompressionRange(sessionId) {
        // 获取所有未归档的消息，按seq倒序
        const messages = db.prepare(`SELECT seq, role, content, token_count 
       FROM messages 
       WHERE session_id = ? AND is_archived = 0 
       ORDER BY seq DESC`).all(sessionId);
        let tokenSum = 0;
        const keepMessages = [];
        const compressMessages = [];
        for (const msg of messages) {
            if (tokenSum < KEEP_RECENT_TOKENS) {
                keepMessages.unshift(msg);
                tokenSum += msg.token_count;
            }
            else {
                compressMessages.unshift(msg);
            }
        }
        return { keepMessages, compressMessages };
    }
    // 生成摘要（调用Ollama）
    static async generateSummary(messages) {
        const prompt = `请将以下对话内容总结为简洁的摘要，保留关键信息，去除冗余细节：

    ${messages.map(m => `${m.role}: ${m.content}`).join('\n')}

    请用一段话总结主要内容：`;
        const axios = (await import('axios')).default;
        const { OLLAMA_API, buildOllamaOptions } = await import('../config');
        const response = await axios.post(`${OLLAMA_API}/generate`, {
            model: 'qwen:9b',
            prompt,
            stream: false,
            ...buildOllamaOptions('qwen:9b', {})
        });
        return response.data.response.trim();
    }
    // 执行压缩
    static async compressSession(sessionId) {
        const { keepMessages, compressMessages } = this.getCompressionRange(sessionId);
        if (compressMessages.length === 0)
            return;
        // 生成摘要
        const summaryContent = await this.generateSummary(compressMessages);
        const wrappedSummary = `<summary>${summaryContent}</summary>`;
        const summaryTokens = this.estimateTokens(wrappedSummary);
        const maxSeq = compressMessages[compressMessages.length - 1].seq;
        // 保存摘要
        db.prepare(`INSERT INTO summaries (session_id, role, content, covered_seq_start, covered_seq_end, token_count, seq, is_archived)
       VALUES (?, 'system', ?, ?, ?, ?, ?, 0)`).run(sessionId, wrappedSummary, compressMessages[0].seq, compressMessages[compressMessages.length - 1].seq, summaryTokens, maxSeq);
        // 标记原始消息为已归档
        for (const msg of compressMessages) {
            db.prepare('UPDATE messages SET is_archived = 1 WHERE session_id = ? AND seq = ?').run(sessionId, msg.seq);
        }
        // 归档旧摘要
        this.archiveOldSummaries(sessionId);
    }
    // 归档旧摘要（只保留最新的一个活跃摘要）
    static archiveOldSummaries(sessionId) {
        const summaries = db.prepare(`SELECT * FROM summaries 
       WHERE session_id = ? AND is_archived = 0 
       ORDER BY seq DESC`).all(sessionId);
        if (summaries.length > 1) {
            for (let i = 1; i < summaries.length; i++) {
                const old = summaries[i];
                db.prepare(`INSERT INTO archives (session_id, type, content, covered_seq_start, covered_seq_end)
           VALUES (?, 'summary', ?, ?, ?)`).run(sessionId, old.content, old.covered_seq_start, old.covered_seq_end);
                db.prepare('UPDATE summaries SET is_archived = 1 WHERE id = ?').run(old.id);
            }
        }
    }
    // 获取给LLM的上下文消息
    static getContextMessages(sessionId) {
        const summaries = db.prepare(`SELECT content, seq FROM summaries 
       WHERE session_id = ? AND is_archived = 0 
       ORDER BY seq ASC`).all(sessionId);
        const messages = db.prepare(`SELECT role, content, seq FROM messages 
       WHERE session_id = ? AND is_archived = 0 
       ORDER BY seq ASC`).all(sessionId);
        const all = [
            ...summaries.map(s => ({ role: 'system', content: s.content, seq: s.seq })),
            ...messages.map(m => ({
                role: m.role,
                content: m.content,
                seq: m.seq
            }))
        ];
        return all.sort((a, b) => a.seq - b.seq);
    }
}
//# sourceMappingURL=memoryService.js.map