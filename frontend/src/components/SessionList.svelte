<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    sessions, 
    currentSession, 
    fetchSessions, 
    createSession, 
    loadSession, 
    deleteSession,
    updateSessionTitle,
    type Session 
  } from '$lib/sessionStore';

  // 自动聚焦动作
  function focusOnMount(node: HTMLInputElement) {
    node.focus();
    return {
      destroy() {}
    };
  }

  let editingId: string | null = $state(null);
  let editingTitle = $state('');
  let isCreating = $state(false);
  let newSessionTitle = $state('');

  onMount(() => {
    fetchSessions();
  });

  function selectSession(session: Session) {
    loadSession(session.id);
  }

  async function handleCreateSession() {
    if (!newSessionTitle.trim()) return;
    const session = await createSession(newSessionTitle.trim());
    newSessionTitle = '';
    isCreating = false;
    await loadSession(session.id);
  }

  async function handleDeleteSession(e: Event, sessionId: string) {
    e.stopPropagation();
    if (!confirm('确定要删除这个会话吗？')) return;
    await deleteSession(sessionId);
    if ($currentSession?.id === sessionId) {
      currentSession.set(null);
    }
  }

  function startEditing(session: Session) {
    editingId = session.id;
    editingTitle = session.title;
  }

  async function handleUpdateTitle(sessionId: string) {
    if (!editingTitle.trim()) {
      editingId = null;
      return;
    }
    await updateSessionTitle(sessionId, editingTitle.trim());
    editingId = null;
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  }
</script>

<div class="flex flex-col h-full">
  <!-- 头部 -->
  <div class="p-4 border-b border-cyan-500/20">
    <div class="flex items-center gap-3 mb-4">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center neon-glow">
        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
        </svg>
      </div>
      <div>
        <h1 class="font-bold text-lg text-white">Galaxy Bot</h1>
        <p class="text-xs text-cyan-400">CYBERPUNK MODE</p>
      </div>
    </div>

    <button
      onclick={() => isCreating = true}
      class="w-full px-4 py-3 bg-gradient-to-r from-cyan-600/80 to-purple-600/80 hover:from-cyan-500 hover:to-purple-500
             text-white rounded-xl flex items-center justify-center gap-2 transition-all neon-glow"
      aria-label="新建会话"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
      </svg>
      新建会话
    </button>
  </div>

  <!-- 新建会话输入框 -->
  {#if isCreating}
    <div class="p-4 border-b border-cyan-500/20 bg-cyan-500/5">
      <label for="new-session-title" class="sr-only">会话名称</label>
      <input
        id="new-session-title"
        type="text"
        bind:value={newSessionTitle}
        placeholder="输入会话名称..."
        onkeydown={(e) => e.key === 'Enter' && handleCreateSession()}
        class="w-full px-4 py-3 bg-black/40 border border-cyan-500/30 rounded-xl text-white placeholder-gray-500
               focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
        use:focusOnMount
      />
      <div class="flex gap-2 mt-3">
        <button
          onclick={handleCreateSession}
          class="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-lg transition-colors"
        >
          创建
        </button>
        <button
          onclick={() => { isCreating = false; newSessionTitle = ''; }}
          class="flex-1 px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 text-white text-sm rounded-lg transition-colors"
        >
          取消
        </button>
      </div>
    </div>
  {/if}

  <!-- 会话列表 -->
  <div class="flex-1 overflow-y-auto p-2">
    {#if $sessions.length === 0}
      <div class="p-4 text-gray-500 text-center text-sm">
        暂无会话，点击上方新建
      </div>
    {:else}
      {#each $sessions as session}
        <div
          class="group relative p-3 mx-1 my-1.5 rounded-xl cursor-pointer transition-all duration-200
            {$currentSession?.id === session.id 
              ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/40 neon-glow' 
              : 'hover:bg-white/5 border border-transparent'}"
          onclick={() => selectSession(session)}
          onkeydown={(e) => e.key === 'Enter' && selectSession(session)}
          role="button"
          tabindex="0"
          aria-label="选择会话: {session.title}"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="flex-1 min-w-0">
              {#if editingId === session.id}
                <input
                  type="text"
                  bind:value={editingTitle}
                  onkeydown={(e) => e.key === 'Enter' && handleUpdateTitle(session.id)}
                  onblur={() => handleUpdateTitle(session.id)}
                  class="w-full px-3 py-1.5 bg-black/50 border border-cyan-500/50 rounded-lg text-white text-sm focus:outline-none"
                  use:focusOnMount
                />
              {:else}
                <div class="font-medium text-sm text-gray-200 truncate">{session.title}</div>
                <div class="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  {formatDate(session.updated_at)}
                </div>
              {/if}
            </div>

            <!-- 操作按钮 -->
            <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onclick={(e) => { e.stopPropagation(); startEditing(session); }}
                class="p-1.5 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                title="重命名"
                aria-label="重命名会话"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </button>
              <button
                onclick={(e) => handleDeleteSession(e, session.id)}
                class="p-1.5 text-gray-400 hover:text-pink-400 hover:bg-pink-500/10 rounded-lg transition-colors"
                title="删除"
                aria-label="删除会话"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>
