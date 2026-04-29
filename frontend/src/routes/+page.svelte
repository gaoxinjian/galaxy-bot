<script lang="ts">
  import { onMount } from 'svelte';
  import SessionList from '../components/SessionList.svelte';
  import ModelSelector from '../components/ModelSelector.svelte';
  import ChatMessages from '../components/ChatMessages.svelte';
  import ChatInput from '../components/ChatInput.svelte';
  import {
    currentSession,
    sessionMessages,
    createSession,
    type Message
  } from '$lib/sessionStore';
  import {
    fetchModels,
    models as modelsStore,
    selectedModel,
    paramValues,
    getCurrentParamValues
  } from '$lib/modelStore';
  import type { Model } from '$lib/types';

  // 本地状态
  let input = $state('');
  let isLoading = $state(false);
  let error = $state('');

  // 订阅 models store
  let models = $state<Model[]>([]);
  modelsStore.subscribe(m => models = m);

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
      // 获取当前模型和参数值
      const currentModel = models.find(m => m.name === $selectedModel);
      const options = getCurrentParamValues(currentModel, $paramValues);

      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          model: $selectedModel,
          sessionId: $currentSession?.id,
          options,
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

    <div class="flex-1 overflow-y-auto">
      <ModelSelector disabled={isLoading} />
    </div>
  </aside>

  <!-- 主聊天区域 -->
  <main class="flex-1 flex flex-col bg-white">
    <ChatMessages
      messages={$sessionMessages}
      isLoading={isLoading}
      emptyState={!$currentSession}
    />

    <ChatInput
      bind:value={input}
      disabled={isLoading}
      placeholder={$currentSession ? '输入消息...' : '请先选择或创建会话'}
      onSend={sendMessage}
    />
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
