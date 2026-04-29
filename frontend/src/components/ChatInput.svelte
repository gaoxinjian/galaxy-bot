<script lang="ts">
  interface Props {
    value?: string;
    disabled?: boolean;
    placeholder?: string;
    onSend?: (message: string) => void;
  }

  let {
    value = $bindable(''),
    disabled = false,
    placeholder = '输入消息...',
    onSend
  }: Props = $props();

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend?.(trimmed);
    value = '';
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }
</script>

<div class="border-t border-gray-200 bg-white p-4">
  <div class="flex gap-2 max-w-4xl mx-auto">
    <input
      type="text"
      bind:value
      {placeholder}
      {disabled}
      onkeydown={handleKeyDown}
      class="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
    />
    <button
      onclick={handleSend}
      {disabled}
      aria-label="发送消息"
      class="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
      </svg>
    </button>
  </div>
</div>
