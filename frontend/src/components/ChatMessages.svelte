<script lang="ts">
  import ChatMessage from './ChatMessage.svelte';
  import type { Message } from '$lib/types';

  interface Props {
    messages: Message[];
    isLoading?: boolean;
    emptyState?: boolean;
  }

  let { messages, isLoading = false, emptyState = false }: Props = $props();

  let messagesContainer: HTMLDivElement;

  // 自动滚动到底部
  $effect(() => {
    if (messagesContainer && messages.length > 0) {
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 0);
    }
  });
</script>

<div
  bind:this={messagesContainer}
  class="flex-1 overflow-y-auto p-6 space-y-4"
>
  {#if emptyState}
    <div class="text-gray-400 text-center mt-20">
      <div class="text-4xl mb-4">👋</div>
      <div class="text-lg">选择一个会话或创建新会话开始聊天</div>
    </div>
  {:else if messages.length === 0}
    <div class="text-gray-400 text-center mt-10">开始对话...</div>
  {:else}
    {#each messages as msg (msg.id)}
      <ChatMessage message={msg} />
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
