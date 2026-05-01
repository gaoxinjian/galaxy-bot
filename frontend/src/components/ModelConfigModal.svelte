<script lang="ts">
  import { 
    models, 
    selectedModel, 
    paramValues, 
    isLoadingModels, 
    modelError, 
    updateParamValue,
    resetModelParams 
  } from '$lib/modelStore';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
  }

  let { isOpen, onClose }: Props = $props();

  // 获取当前选中的模型对象
  let currentModel = $derived($models.find(m => m.name === $selectedModel));

  // 点击遮罩层关闭
  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  // 阻止事件冒泡
  function stopPropagation(e: Event) {
    e.stopPropagation();
  }
</script>

{#if isOpen}
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    onclick={handleBackdropClick}
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
  >
    <div 
      class="glass-card w-full max-w-md mx-4 p-6 neon-glow"
      onclick={stopPropagation}
    >
      <!-- 头部 -->
      <div class="flex items-center justify-between mb-6">
        <h2 id="modal-title" class="text-xl font-bold neon-text flex items-center gap-2">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
          模型配置
        </h2>
        <button 
          onclick={onClose}
          class="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          aria-label="关闭"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- 模型选择 -->
      <div class="mb-6">
        <label for="modal-model-select" class="block text-sm font-medium mb-2 text-cyan-300">
          选择模型
        </label>
        
        {#if $isLoadingModels}
          <div class="text-gray-400 text-sm py-2">加载中...</div>
        {:else if $modelError}
          <div class="text-red-400 text-sm py-2">{$modelError}</div>
        {:else if $models.length === 0}
          <div class="text-gray-400 text-sm py-2">暂无可用模型</div>
        {:else}
          <div class="relative">
            <select
              id="modal-model-select"
              bind:value={$selectedModel}
              class="w-full px-4 py-3 bg-black/40 border border-cyan-500/30 rounded-lg text-white 
                     focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20
                     appearance-none cursor-pointer transition-all"
            >
              {#each $models as model}
                <option value={model.name}>{model.config.displayName}</option>
              {/each}
            </select>
            <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-cyan-400">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
          </div>
        {/if}
      </div>

      <!-- 分隔线 -->
      <div class="h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent mb-6"></div>

      <!-- 模型参数 -->
      {#if currentModel}
        <div class="space-y-5">
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-pink-400 flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
              </svg>
              参数配置
            </h3>
            <button
              onclick={resetModelParams}
              class="text-xs text-gray-400 hover:text-cyan-400 transition-colors flex items-center gap-1"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              重置
            </button>
          </div>

          {#each Object.entries(currentModel.config.parameters) as [key, param]}
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label for="modal-param-{key}" class="text-sm font-medium text-gray-300" title={param.description}>
                  {key}
                </label>
                <span class="text-xs font-mono bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded">
                  {($paramValues[key] ?? param.default).toFixed(param.type === 'float' ? 2 : 0)}
                </span>
              </div>

              {#if param.type === 'float' || param.type === 'int'}
                <div class="relative">
                  <input
                    type="range"
                    id="modal-param-{key}"
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    value={$paramValues[key] ?? param.default}
                    oninput={(e) => {
                      updateParamValue(key, parseFloat(e.currentTarget.value));
                    }}
                    class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
                           accent-cyan-400 hover:accent-cyan-300"
                    aria-label="{key} 参数滑块"
                  />
                  <div class="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{param.min}</span>
                    <span>{param.max}</span>
                  </div>
                </div>
              {:else}
                <input
                  type="number"
                  id="modal-param-{key}"
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  value={$paramValues[key] ?? param.default}
                  oninput={(e) => {
                    updateParamValue(key, parseFloat(e.currentTarget.value) || 0);
                  }}
                  class="w-full px-3 py-2 bg-black/40 border border-cyan-500/30 rounded-lg text-white text-sm
                         focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                  aria-label="{key} 参数输入"
                />
              {/if}

              {#if param.description}
                <p class="text-xs text-gray-500">{param.description}</p>
              {/if}
            </div>
          {/each}
        </div>
      {:else}
        <div class="text-gray-500 text-sm text-center py-4">
          选择模型查看参数配置
        </div>
      {/if}

      <!-- 底部关闭按钮 -->
      <div class="mt-6 pt-4 border-t border-cyan-500/20">
        <button
          onclick={onClose}
          class="w-full py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500
                 text-white font-medium rounded-lg transition-all neon-glow"
        >
          确认
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* 自定义滑块样式 */
  input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    background: linear-gradient(135deg, #00d4ff, #8b5cf6);
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
    transition: transform 0.1s;
  }

  input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.2);
  }

  input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: linear-gradient(135deg, #00d4ff, #8b5cf6);
    border-radius: 50%;
    cursor: pointer;
    border: none;
    box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
  }
</style>
