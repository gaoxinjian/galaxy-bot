<script lang="ts">
  import type { Message } from '$lib/types';

  interface Props {
    message: Message;
  }

  let { message }: Props = $props();

  let isUser = $derived(message.role === 'user');
</script>

<div class="flex {isUser ? 'justify-end' : 'justify-start'}">
  <div
    class="max-w-3xl px-4 py-3 rounded-2xl {isUser
      ? 'bg-blue-600 text-white rounded-br-md'
      : 'bg-gray-100 text-gray-900 rounded-bl-md border border-gray-200'}"
  >
    <div class="whitespace-pre-wrap">{message.content}</div>
  </div>
</div>
