import { writable } from 'svelte/store';
import type { Session, Message } from './types';

// 重新导出类型，保持兼容性
export type { Session, Message };

// 当前选中的会话
export const currentSession = writable<Session | null>(null);

// 会话列表
export const sessions = writable<Session[]>([]);

// 当前会话的消息
export const sessionMessages = writable<Message[]>([]);

const API_BASE = 'http://localhost:3001';

// 获取所有会话
export async function fetchSessions(): Promise<Session[]> {
  const response = await fetch(`${API_BASE}/api/sessions`);
  if (!response.ok) throw new Error('Failed to fetch sessions');
  const data = await response.json();
  sessions.set(data.sessions);
  return data.sessions;
}

// 创建新会话
export async function createSession(title: string, model: string = 'qwen:9b'): Promise<Session> {
  const response = await fetch(`${API_BASE}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, model }),
  });
  if (!response.ok) throw new Error('Failed to create session');
  const data = await response.json();
  await fetchSessions(); // 刷新列表
  return data.session;
}

// 获取会话详情（包含消息）
export async function loadSession(sessionId: string): Promise<{ session: Session; messages: Message[] }> {
  const response = await fetch(`${API_BASE}/api/sessions/${sessionId}`);
  if (!response.ok) throw new Error('Failed to load session');
  const data = await response.json();
  currentSession.set(data.session);
  sessionMessages.set(data.messages);
  return data;
}

// 删除会话
export async function deleteSession(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/sessions/${sessionId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete session');
  await fetchSessions(); // 刷新列表
}

// 更新会话标题
export async function updateSessionTitle(sessionId: string, title: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/sessions/${sessionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!response.ok) throw new Error('Failed to update session');
  await fetchSessions(); // 刷新列表
}

// 清空会话消息
export async function clearSessionMessages(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/sessions/${sessionId}/messages`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to clear messages');
  sessionMessages.set([]);
}
