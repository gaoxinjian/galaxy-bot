<script lang="ts">
  import { onMount } from 'svelte';

  interface Message {
    role: 'user' | 'assistant';
    content: string;
  }

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
  let input = '';
  let models: Model[] = $state([]);  // ← 用 $state
  let selectedModel = $state('');     // ← 用 $state
  let isLoading = false;
  let messagesContainer: HTMLDivElement;
  let error = '';

  // 获取可用模型
  onMount(async () => {
    try {
      console.log('Fetching models...');
      const response = await fetch('http://localhost:3001/api/models');
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('Models data:', data);
      
      models = data.models;  // ← 这样赋值会立即更新UI
      console.log('Models updated:', models.length);
      
      if (models.length > 0) {
        selectedModel = models[0].name;
        console.log('Selected model:', selectedModel);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('Failed to fetch models:', errorMsg);
      error = `Error loading models: ${errorMsg}`;
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

    const userMessage = input.trim();
    input = '';
    isLoading = true;
    error = '';

    messages = [...messages, { role: 'user', content: userMessage }];

    try {
      console.log('Sending message:', { message: userMessage, model: selectedModel });
      
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          model: selectedModel,
        }),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const streamReader = response.body.getReader();
      const decoder = new TextDecoder();

      let assistantContent = '';
      messages = [...messages, { role: 'assistant', content: assistantContent }];

      try {
        while (true) {
          const { done, value } = await streamReader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          console.log('Chunk:', chunk);
          assistantContent += chunk;
          
          // 替换最后一条消息的内容
          messages = messages.map((m, i) => 
            i === messages.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
      } finally {
        streamReader.releaseLock();
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('Chat error:', errorMsg);
      error = `Error: ${errorMsg}`;
      messages = [
        ...messages,
        {
          role: 'assistant',
          content: `Error: ${errorMsg}`,
        },
      ];
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="flex h-screen bg-gray-100">
  <!-- 侧边栏 -->
  <aside class="w-64 bg-gray-900 text-white p-4 flex flex-col">
    <h1 class="text-2xl font-bold mb-6">AI Chat</h1>

    {#if error}
      <div class="mb-4 p-3 bg-red-600 rounded text-sm">
        {error}
      </div>
    {/if}

    <div class="mb-6">
      <label class="block text-sm font-medium mb-2">Select Model</label>
      {#if models.length === 0}
        <div class="text-gray-400 text-sm">Loading models...</div>
      {:else}
        <select
          bind:value={selectedModel}
          disabled={isLoading}
          class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
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
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          class="w-full"
          disabled={isLoading}
        />
      </div>
      <div>
        <label class="block font-medium mb-1">Top P</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          class="w-full"
          disabled={isLoading}
        />
      </div>
      <div>
        <label class="block font-medium mb-1">Top K</label>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          class="w-full"
          disabled={isLoading}
        />
      </div>
    </div>
  </aside>

  <!-- 主聊天区域 -->
  <main class="flex-1 flex flex-col">
    <!-- 消息区域 -->
    <div
      bind:this={messagesContainer}
      class="flex-1 overflow-y-auto p-6 space-y-4"
    >
      {#if messages.length === 0}
        <div class="text-gray-400 text-center mt-10">
          Start a conversation...
        </div>
      {/if}

      {#each messages as msg}
        <div
          class="flex {msg.role === 'user' ? 'justify-end' : 'justify-start'}"
        >
          <div
            class="max-w-2xl px-4 py-2 rounded-lg {msg.role === 'user'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-900 border border-gray-200'}"
          >
            {msg.content}
          </div>
        </div>
      {/each}

      {#if isLoading && messages[messages.length - 1]?.role === 'assistant'}
        <div class="flex justify-start">
          <div class="text-gray-500 italic">typing...</div>
        </div>
      {/if}
    </div>

    <!-- 输入区域 -->
    <div class="border-t bg-white p-4">
      <div class="flex gap-2">
        <input
          type="text"
          bind:value={input}
          placeholder="输入消息..."
          disabled={isLoading || models.length === 0}
          on:keydown={(e) => e.key === 'Enter' && sendMessage()}
          class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
        />
        <button
          on:click={sendMessage}
          disabled={isLoading || !input.trim() || models.length === 0}
          class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          Send
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