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
  <div class="p-4 border-b border-gray-800">
    <button
      onclick={() => isCreating = true}
      class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
      </svg>
      新建会话
    </button>
  </div>

  <!-- 新建会话输入框 -->
  {#if isCreating}
    <div class="p-4 border-b border-gray-800 bg-gray-800/50">
      <input
        type="text"
        bind:value={newSessionTitle}
        placeholder="输入会话名称..."
        onkeydown={(e) => e.key === 'Enter' && handleCreateSession()}
        class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
        autofocus
      />
      <div class="flex gap-2 mt-2">
        <button
          onclick={handleCreateSession}
          class="flex-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
        >
          创建
        </button>
        <button
          onclick={() => { isCreating = false; newSessionTitle = ''; }}
          class="flex-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
        >
          取消
        </button>
      </div>
    </div>
  {/if}

  <!-- 会话列表 -->
  <div class="flex-1 overflow-y-auto">
    {#if $sessions.length === 0}
      <div class="p-4 text-gray-500 text-center text-sm">
        暂无会话，点击上方新建
      </div>
    {:else}
      {#each $sessions as session}
        <div
          class="group relative p-3 mx-2 my-1 rounded-lg cursor-pointer transition-colors
            {$currentSession?.id === session.id 
              ? 'bg-gray-700 text-white' 
              : 'hover:bg-gray-800 text-gray-300'}"
          onclick={() => selectSession(session)}
        >
          <div class="flex items-center justify-between">
            <div class="flex-1 min-w-0">
              {#if editingId === session.id}
                <input
                  type="text"
                  bind:value={editingTitle}
                  onkeydown={(e) => e.key === 'Enter' && handleUpdateTitle(session.id)}
                  onblur={() => handleUpdateTitle(session.id)}
                  class="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none"
                  autofocus
                />
              {:else}
                <div class="font-medium truncate">{session.title}</div>
                <div class="text-xs text-gray-500 mt-0.5">
                  {formatDate(session.updated_at)}
                </div>
              {/if}
            </div>

            <!-- 操作按钮 -->
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onclick={(e) => { e.stopPropagation(); startEditing(session); }}
                class="p-1.5 text-gray-400 hover:text-white hover:bg-gray-600 rounded"
                title="重命名"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </button>
              <button
                onclick={(e) => handleDeleteSession(e, session.id)}
                class="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded"
                title="删除"
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
