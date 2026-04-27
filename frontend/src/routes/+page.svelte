<script lang="ts">
  import { onMount } from 'svelte';
  import SessionList from '../components/SessionList.svelte';
  import { 
    currentSession, 
    sessionMessages, 
    createSession,
    loadSession,
    type Message 
  } from '$lib/sessionStore';

  interface Model {
    name: string;
    config: {
      displayName: string;
      temperature: number;
      topP: number;
      topK: number;
    };
  }

  let messages: Message[] = $state([]);
  let input = $state('');
  let models: Model[] = $state([]);
  let selectedModel = $state('');
  let isLoading = $state(false);
  let messagesContainer: HTMLDivElement;
  let error = $state('');

  // 同步 store 中的消息到本地
  $effect(() => {
    messages = $sessionMessages;
  });

  // 获取可用模型
  onMount(async () => {
    try {
      const response = await fetch('http://localhost:3001/api/models');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      models = data.models;
      if (models.length > 0) {
        selectedModel = models[0].name;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  });

  // 自动滚动到底部
  $effect(() => {
    if (messagesContainer) {
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 0);
    }
  });

  async function sendMessage() {
    if (!input.trim() || !selectedModel) return;

    // 如果没有选中会话，自动创建一个
    if (!$currentSession) {
      const title = input.trim().slice(0, 20) + (input.trim().length > 20 ? '...' : '');
      await createSession(title, selectedModel);
    }

    const userMessage = input.trim();
    input = '';
    isLoading = true;
    error = '';

    // 添加用户消息到本地显示
    sessionMessages.update(msgs => [...msgs, {
      id: Date.now(),
      session_id: $currentSession!.id,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    }]);

    try {
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          model: selectedModel,
          sessionId: $currentSession?.id,
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

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }
</script>

<div class="flex h-screen bg-gray-100">
  <!-- 左侧会话列表 -->
  <aside class="w-64 bg-gray-900 text-white flex flex-col border-r border-gray-800">
    <SessionList />
  </aside>

  <!-- 中间模型选择栏 -->
  <aside class="w-64 bg-gray-800 text-white p-4 flex flex-col border-r border-gray-700">
    <h2 class="text-lg font-semibold mb-4">设置</h2>

    {#if error}
      <div class="mb-4 p-3 bg-red-600 rounded text-sm">
        {error}
      </div>
    {/if}

    <div class="mb-6">
      <label class="block text-sm font-medium mb-2">选择模型</label>
      {#if models.length === 0}
        <div class="text-gray-400 text-sm">加载中...</div>
      {:else}
        <select
          bind:value={selectedModel}
          disabled={isLoading}
          class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
        >
          {#each models as model}
            <option value={model.name}>{model.config.displayName}</option>
          {/each}
        </select>
      {/if}
    </div>

    <div class="space-y-4 text-sm">
      <div>
        <label class="block font-medium mb-1">Temperature</label>
        <input type="range" min="0" max="2" step="0.1" class="w-full" disabled={isLoading} />
      </div>
      <div>
        <label class="block font-medium mb-1">Top P</label>
        <input type="range" min="0" max="1" step="0.01" class="w-full" disabled={isLoading} />
      </div>
      <div>
        <label class="block font-medium mb-1">Top K</label>
        <input type="range" min="0" max="100" step="1" class="w-full" disabled={isLoading} />
      </div>
    </div>
  </aside>

  <!-- 主聊天区域 -->
  <main class="flex-1 flex flex-col bg-white">
    <!-- 消息区域 -->
    <div
      bind:this={messagesContainer}
      class="flex-1 overflow-y-auto p-6 space-y-4"
    >
      {#if !$currentSession}
        <div class="text-gray-400 text-center mt-20">
          <div class="text-4xl mb-4">👋</div>
          <div class="text-lg">选择一个会话或创建新会话开始聊天</div>
        </div>
      {:else if messages.length === 0}
        <div class="text-gray-400 text-center mt-10">
          开始对话...
        </div>
      {:else}
        {#each messages as msg}
          <div class="flex {msg.role === 'user' ? 'justify-end' : 'justify-start'}">
            <div
              class="max-w-3xl px-4 py-3 rounded-2xl {msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-md'
                : 'bg-gray-100 text-gray-900 rounded-bl-md border border-gray-200'}"
            >
              <div class="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        {/each}
      {/if}

      {#if isLoading}
        <div class="flex justify-start">
          <div class="bg-gray-100 px-4 py-2 rounded-2xl rounded-bl-md">
            <div class="flex gap-1">
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- 输入区域 -->
    <div class="border-t border-gray-200 bg-white p-4">
      <div class="flex gap-2 max-w-4xl mx-auto">
        <input
          type="text"
          bind:value={input}
          placeholder={$currentSession ? '输入消息...' : '请先选择或创建会话'}
          disabled={isLoading || models.length === 0}
          onkeydown={handleKeyDown}
          class="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
        />
        <button
          onclick={sendMessage}
          disabled={isLoading || !input.trim() || models.length === 0}
          class="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
          </svg>
        </button>
      </div>
    </div>
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
      'Helvetica Neue', Arial, sans-serif;
  }
</style>
