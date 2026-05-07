<script lang="ts">
  import type { Message } from '$lib/types';

  interface Props {
    message: Message;
  }

  let { message }: Props = $props();

  let isUser = $derived(message.role === 'user');
</script>

<div class="flex {isUser ? 'justify-end' : 'justify-start'}">
  <div class="flex items-start gap-3 max-w-3xl {isUser ? 'flex-row-reverse' : ''}">
    <!-- 头像 -->
    <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 {isUser ? 'bg-gradient-to-br from-cyan-500 to-blue-600' : 'bg-gradient-to-br from-purple-500 to-pink-600'}">
      {#if isUser}
        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
        </svg>
      {:else}
        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
        </svg>
      {/if}
    </div>

    <!-- 消息气泡 -->
    <div
      class="px-5 py-3 rounded-2xl {isUser
        ? 'bg-gradient-to-r from-cyan-600/80 to-blue-600/80 text-white rounded-br-md border border-cyan-400/30'
        : 'bg-black/40 text-gray-100 rounded-bl-md border border-purple-500/30'}"
    >
      <div class="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
    </div>
  </div>
</div>
