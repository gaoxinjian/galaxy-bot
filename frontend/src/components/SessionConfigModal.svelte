<script lang="ts">
  import { onMount } from 'svelte';
  import type { ParameterDef } from '$lib/types';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (params: Record<string, number>) => void;
    initialParams?: Record<string, number>;
  }

  let { isOpen, onClose, onSave, initialParams = {} }: Props = $props();

  const API_BASE = 'http://localhost:3001';

  // 通用参数定义
  let commonParams = $state<Record<string, ParameterDef>>({});
  let isLoading = $state(false);

  // 本地参数值状态
  let localValues = $state<Record<string, number>>({});

  // 加载通用参数
  async function loadCommonParameters() {
    if (!isOpen) return;
    
    isLoading = true;
    try {
      const response = await fetch(`${API_BASE}/api/models`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      
      if (data.models && data.models.length > 0) {
        // 过滤掉 think 参数（模型层配置，不在会话层配置）
        const allParams = data.models[0].config.parameters;
        const filteredParams: Record<string, ParameterDef> = {};
        for (const [key, param] of Object.entries(allParams)) {
          if (key !== 'think') {
            filteredParams[key] = param;
          }
        }
        commonParams = filteredParams;
        
        // 初始化本地值
        const defaults: Record<string, number> = {};
        for (const [key, param] of Object.entries(filteredParams)) {
          defaults[key] = initialParams[key] ?? (param.default as number);
        }
        localValues = defaults;
      }
    } catch (err) {
      console.error('Failed to load common parameters:', err);
    } finally {
      isLoading = false;
    }
  }

  // 当弹窗打开时加载参数
  $effect(() => {
    if (isOpen) {
      loadCommonParameters();
    }
  });

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

  // 更新参数值
  function updateValue(key: string, value: number) {
    localValues = { ...localValues, [key]: value };
  }

  // 重置为默认值
  function resetParams() {
    const defaults: Record<string, number> = {};
    for (const [key, param] of Object.entries(commonParams)) {
      defaults[key] = param.default as number;
    }
    localValues = defaults;
  }

  // 保存
  function handleSave() {
    onSave({ ...localValues });
    onClose();
  }
</script>

{#if isOpen}
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
    onclick={handleBackdropClick}
    role="dialog"
    aria-modal="true"
    aria-labelledby="session-config-title"
  >
    <div 
      class="glass-card w-full max-w-lg mx-4 max-h-[80vh] flex flex-col neon-glow"
      onclick={stopPropagation}
    >
      <!-- 头部 -->
      <div class="flex items-center justify-between p-6 border-b border-cyan-500/20">
        <h2 id="session-config-title" class="text-xl font-bold neon-text flex items-center gap-2">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          会话参数配置
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

      <!-- 可滚动内容区 -->
      <div class="flex-1 overflow-y-auto px-6 py-4">
        {#if isLoading}
          <div class="text-gray-400 text-sm text-center py-4">加载中...</div>
        {:else if Object.keys(commonParams).length === 0}
          <div class="text-gray-500 text-sm text-center py-4">
            暂无可用参数配置
          </div>
        {:else}
          <div class="space-y-5">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-pink-400 flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
                </svg>
                参数配置
              </h3>
              <button
                onclick={resetParams}
                class="text-xs text-gray-400 hover:text-cyan-400 transition-colors flex items-center gap-1"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                重置
              </button>
            </div>

            {#each Object.entries(commonParams) as [key, param]}
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <label for="session-param-{key}" class="text-sm font-medium text-gray-300" title={param.description}>
                    {key}
                  </label>
                  <span class="text-xs font-mono bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded">
                    {(localValues[key] ?? param.default).toFixed(param.type === 'float' ? 2 : 0)}
                  </span>
                </div>

                {#if param.type === 'float' || param.type === 'int'}
                  <div class="relative">
                    <input
                      type="range"
                      id="session-param-{key}"
                      min={param.min}
                      max={param.max}
                      step={param.step}
                      value={localValues[key] ?? param.default}
                      oninput={(e) => {
                        updateValue(key, parseFloat(e.currentTarget.value));
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
                    id="session-param-{key}"
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    value={localValues[key] ?? param.default}
                    oninput={(e) => {
                      updateValue(key, parseFloat(e.currentTarget.value) || 0);
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
        {/if}
      </div>

      <!-- 底部按钮 -->
      <div class="p-4 border-t border-cyan-500/20 flex justify-end gap-2">
        <button
          onclick={onClose}
          class="px-4 py-1.5 text-sm bg-gray-700/50 hover:bg-gray-600/50 text-white rounded-lg transition-colors"
        >
          取消
        </button>
        <button
          onclick={handleSave}
          disabled={isLoading}
          class="px-4 py-1.5 text-sm bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500
                 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          保存
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
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
