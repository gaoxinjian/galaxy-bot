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

  let textareaRef: HTMLTextAreaElement | undefined = $state();
  const MAX_HEIGHT = 150; // 最大高度 150px

  function adjustHeight() {
    console.log("调整输入框高度:", textareaRef);
    if (!textareaRef) return;
    // 先重置高度，以便获得正确的 scrollHeight
    textareaRef.style.height = 'auto';
    const scrollHeight = textareaRef.scrollHeight;
    console.log('调整高度，内容高度:', scrollHeight);
    const newHeight = Math.min(scrollHeight, MAX_HEIGHT);
    textareaRef.style.height = `${newHeight}px`;
    // 如果内容高度超过最大高度，显示滚动条，否则隐藏
    textareaRef.style.overflowY = scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden';
  }

  function handleInput() {
    adjustHeight();
  }

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend?.(trimmed);
    value = '';
    adjustHeight();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      adjustHeight();
    }
  }
</script>

<div class="border-t border-cyan-500/20 p-4">
  <div class="flex gap-3 max-w-4xl mx-auto justify-center items-center">
    <div class="flex-1 relative flex items-center justify-center">
      <textarea
        bind:this={textareaRef}
        bind:value
        {placeholder}
        {disabled}
        onkeydown={handleKeyDown}
        oninput={handleInput}
        rows="1"
        class="flex-1 max-h-150 px-5 py-4 bg-black/40 border border-cyan-500/30 rounded-md 
              resize-none overflow-auto text-sm
              text-white placeholder-gray-500
              focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20
              disabled:bg-black/20 disabled:cursor-not-allowed
              transition-all"
      ></textarea>
      <div class="m-2 text-xs text-gray-500">
        Enter 发送 <br />
        Shift + Enter 换行
      </div>
    </div>
    <button
      onclick={handleSend}
      {disabled}
      aria-label="发送消息"
      class="h-15 px-6 py-4 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500
             text-white rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed 
             transition-all neon-glow flex items-center justify-center"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
      </svg>
    </button>
  </div>
  
  <!-- 底部提示 -->
  <div class="text-center mt-3">
    <p class="text-xs text-gray-500">
      AI 生成的内容可能存在错误，请核实重要信息。
      <span class="text-cyan-500/60">GALAXY BOT v1.0.0</span>
    </p>
  </div>
</div>
