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
  let scrollFrameId: number;

  // 使用 requestAnimationFrame 防止掉帧
  $effect(() => {
    if (messagesContainer && messages.length > 0) {
      // 取消上一帧的滚动请求
      if (scrollFrameId) cancelAnimationFrame(scrollFrameId);
      
      scrollFrameId = requestAnimationFrame(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      });
    }
  });

  // 清理
  $effect(() => {
    return () => {
      if (scrollFrameId) cancelAnimationFrame(scrollFrameId);
    };
  });
</script>

<div
  bind:this={messagesContainer}
  class="flex-1 overflow-y-auto p-6 space-y-4"
  style="transform: translateZ(0); will-change: scroll-position; contain: layout style paint;"
>
  {#if emptyState}
    <div class="flex flex-col items-center justify-center h-full text-center">
      <div class="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center mb-6 neon-glow">
        <svg class="w-12 h-12 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
        </svg>
      </div>
      <h3 class="text-xl font-semibold text-white mb-2">开始你的对话</h3>
      <p class="text-gray-400 max-w-sm">选择一个会话或创建新会话，开始与 AI 助手交流</p>
    </div>
  {:else if messages.length === 0}
    <div class="flex flex-col items-center justify-center h-full text-center">
      <div class="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-cyan-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
        </svg>
      </div>
      <p class="text-gray-400">发送消息开始对话...</p>
    </div>
  {:else}
    {#each messages as msg (msg.id)}
      <ChatMessage message={msg} />
    {/each}
  {/if}

  {#if isLoading}
    <div class="flex justify-start">
      <div class="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 px-4 py-3 rounded-2xl rounded-bl-md backdrop-blur-sm">
        <div class="flex gap-1.5">
          <div class="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
          <div class="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
          <div class="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
        </div>
      </div>
    </div>
  {/if}
</div>
