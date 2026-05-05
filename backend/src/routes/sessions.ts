import { Hono } from 'hono';
import { SessionService } from '../services/sessionService';

const sessions = new Hono();

// GET /api/sessions - 获取所有会话
sessions.get('/', (c) => {
  try {
    const sessionList = SessionService.getAllSessions();
    return c.json({ sessions: sessionList });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to get sessions' },
      { status: 500 }
    );
  }
});

// POST /api/sessions - 创建新会话
sessions.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { title, model } = body;

    if (!title) {
      return c.json({ error: 'title is required' }, { status: 400 });
    }

    const session = SessionService.createSession(title, model || 'mlx-community/Qwen3.5-9B-MLX-4bit');
    return c.json({ session }, { status: 201 });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to create session' },
      { status: 500 }
    );
  }
});

// PATCH /api/sessions/:id/parameters - 更新会话参数（必须放在 /:id 之前）
sessions.patch('/:id/parameters', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { parameters } = body;

    if (!parameters || typeof parameters !== 'object') {
      return c.json({ error: 'parameters is required' }, { status: 400 });
    }

    const session = SessionService.getSession(id);
    if (!session) {
      return c.json({ error: 'Session not found' }, { status: 404 });
    }

    SessionService.updateParameters(id, parameters);
    return c.json({ success: true });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to update session parameters' },
      { status: 500 }
    );
  }
});

// GET /api/sessions/:id - 获取单个会话（包含消息）
sessions.get('/:id', (c) => {
  try {
    const id = c.req.param('id');
    const session = SessionService.getSession(id);

    if (!session) {
      return c.json({ error: 'Session not found' }, { status: 404 });
    }

    const messages = SessionService.getMessages(id);
    return c.json({ session, messages });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to get session' },
      { status: 500 }
    );
  }
});

// DELETE /api/sessions/:id - 删除会话
sessions.delete('/:id', (c) => {
  try {
    const id = c.req.param('id');
    const session = SessionService.getSession(id);

    if (!session) {
      return c.json({ error: 'Session not found' }, { status: 404 });
    }

    SessionService.deleteSession(id);
    return c.json({ success: true });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to delete session' },
      { status: 500 }
    );
  }
});

// PATCH /api/sessions/:id - 更新会话标题
sessions.patch('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { title } = body;

    if (!title) {
      return c.json({ error: 'title is required' }, { status: 400 });
    }

    const session = SessionService.getSession(id);
    if (!session) {
      return c.json({ error: 'Session not found' }, { status: 404 });
    }

    SessionService.updateTitle(id, title);
    return c.json({ success: true });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to update session' },
      { status: 500 }
    );
  }
});

// GET /api/sessions/:id/messages - 获取会话消息
sessions.get('/:id/messages', (c) => {
  try {
    const id = c.req.param('id');
    const session = SessionService.getSession(id);

    if (!session) {
      return c.json({ error: 'Session not found' }, { status: 404 });
    }

    const messages = SessionService.getMessages(id);
    return c.json({ messages });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to get messages' },
      { status: 500 }
    );
  }
});

// DELETE /api/sessions/:id/messages - 清空会话消息
sessions.delete('/:id/messages', (c) => {
  try {
    const id = c.req.param('id');
    const session = SessionService.getSession(id);

    if (!session) {
      return c.json({ error: 'Session not found' }, { status: 404 });
    }

    SessionService.clearMessages(id);
    return c.json({ success: true });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to clear messages' },
      { status: 500 }
    );
  }
});

export default sessions;
