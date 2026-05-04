<script lang="ts">
  import { onMount } from 'svelte';
  import SessionList from '../components/SessionList.svelte';
  import ChatMessages from '../components/ChatMessages.svelte';
  import ChatInput from '../components/ChatInput.svelte';
  import ModelConfigModal from '../components/ModelConfigModal.svelte';
  import {
    currentSession,
    sessionMessages,
    createSession,
    type Message
  } from '$lib/sessionStore';
  import {
    fetchModels,
    models as modelsStore,
    selectedModel
  } from '$lib/modelStore';
  import type { Model } from '$lib/types';

  // 本地状态
  let input = $state('');
  let isLoading = $state(false);
  let error = $state('');
  let isModelModalOpen = $state(false);

  // 订阅 models store
  let models = $state<Model[]>([]);
  modelsStore.subscribe(m => models = m);

  // 获取当前模型显示名称
  let currentModelDisplayName = $derived(() => {
    const model = models.find(m => m.name === $selectedModel);
    return model?.config.displayName || $selectedModel || '选择模型';
  });

  // 初始化
  onMount(() => {
    fetchModels();
  });

  /**
   * 发送消息
   */
  async function sendMessage(message: string) {
    if (!$selectedModel) return;

    // 如果没有选中会话，自动创建一个
    if (!$currentSession) {
      const title = message.slice(0, 20) + (message.length > 20 ? '...' : '');
      await createSession(title, $selectedModel);
    }

    isLoading = true;
    error = '';

    // 添加用户消息到本地显示
    sessionMessages.update(msgs => [...msgs, {
      id: Date.now(),
      session_id: $currentSession!.id,
      role: 'user',
      content: message,
      created_at: new Date().toISOString()
    }]);

    try {
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          model: $selectedModel,
          sessionId: $currentSession?.id,
          think: false, // 目前不启用 think 模式
          // 不传 options，让后端使用会话参数
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.body) throw new Error('No response body');

      const streamReader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      // 添加空的 AI 消息占位
      sessionMessages.update(msgs => [...msgs, {
        id: Date.now() + 1,
        session_id: $currentSession!.id,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString()
      }]);

      try {
        while (true) {
          const { done, value } = await streamReader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          assistantContent += chunk;

          // 更新最后一条消息
          sessionMessages.update(msgs => {
            const newMsgs = [...msgs];
            if (newMsgs.length > 0) {
              newMsgs[newMsgs.length - 1] = {
                ...newMsgs[newMsgs.length - 1],
                content: assistantContent
              };
            }
            return newMsgs;
          });
        }
      } finally {
        streamReader.releaseLock();
      }
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      sessionMessages.update(msgs => [...msgs, {
        id: Date.now(),
        session_id: $currentSession!.id,
        role: 'assistant',
        content: `Error: ${error}`,
        created_at: new Date().toISOString()
      }]);
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="flex h-screen overflow-hidden px-[150px]">
  <!-- 左侧会话列表 -->
  <aside class="w-72 glass-card my-3 mr-3 flex flex-col overflow-hidden">
    <SessionList />
  </aside>

  <!-- 主聊天区域 -->
  <main class="flex-1 flex flex-col my-3 glass-card overflow-hidden">
    <!-- 顶部模型选择栏 -->
    <header class="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20">
      <div class="flex items-center gap-3">
        <div class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
        <span class="text-sm text-gray-400">MODEL:</span>
        <button
          onclick={() => isModelModalOpen = true}
          class="flex items-center gap-2 px-4 py-2 bg-black/30 border border-cyan-500/30 rounded-lg
                 hover:border-cyan-400 hover:bg-cyan-500/10 transition-all group"
        >
          <span class="font-medium text-cyan-300">{currentModelDisplayName()}</span>
          <svg class="w-4 h-4 text-gray-500 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
      </div>

      <!-- 右侧状态指示 -->
      <div class="flex items-center gap-4">
        {#if error}
          <div class="flex items-center gap-2 text-red-400 text-sm">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>{error}</span>
          </div>
        {:else}
          <div class="flex items-center gap-2 text-emerald-400 text-sm">
            <div class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <span>就绪</span>
          </div>
        {/if}
      </div>
    </header>

    <!-- 聊天消息区域 -->
    <ChatMessages
      messages={$sessionMessages}
      isLoading={isLoading}
      emptyState={!$currentSession}
    />

    <!-- 输入区域 -->
    <ChatInput
      bind:value={input}
      disabled={isLoading}
      placeholder={$currentSession ? '输入消息...' : '请先选择或创建会话'}
      onSend={sendMessage}
    />
  </main>
</div>

<!-- 模型配置弹窗 -->
<ModelConfigModal
  isOpen={isModelModalOpen}
  onClose={() => isModelModalOpen = false}
/>
