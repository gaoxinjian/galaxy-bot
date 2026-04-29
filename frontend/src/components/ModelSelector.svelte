<script lang="ts">
  import { models, selectedModel, paramValues, isLoadingModels, modelError, updateParamValue } from '$lib/modelStore';

  interface Props {
    disabled?: boolean;
  }

  let { disabled = false }: Props = $props();

  // 获取当前选中的模型对象
  let currentModel = $derived($models.find(m => m.name === $selectedModel));
</script>

<div class="space-y-6">
  <!-- 模型选择 -->
  <div>
    {#if $isLoadingModels}
      <span class="block text-sm font-medium mb-2">选择模型</span>
      <div class="text-gray-400 text-sm">加载中...</div>
    {:else if $modelError}
      <span class="block text-sm font-medium mb-2">选择模型</span>
      <div class="text-red-400 text-sm">{$modelError}</div>
    {:else if $models.length === 0}
      <span class="block text-sm font-medium mb-2">选择模型</span>
      <div class="text-gray-400 text-sm">暂无可用模型</div>
    {:else}
      <label for="model-select" class="block text-sm font-medium mb-2">选择模型</label>
      <select
        id="model-select"
        bind:value={$selectedModel}
        {disabled}
        class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
      >
        {#each $models as model}
          <option value={model.name}>{model.config.displayName}</option>
        {/each}
      </select>
    {/if}
  </div>

  <!-- 模型参数配置 -->
  {#if currentModel}
    <div class="space-y-4 text-sm">
      <h3 class="font-semibold text-gray-300">模型参数</h3>

      {#each Object.entries(currentModel.config.parameters) as [key, param]}
        <div>
          <label for="param-{key}" class="block font-medium mb-1" title={param.description}>
            {key}
            <span class="text-gray-500 text-xs ml-1">
              ({$paramValues[key] ?? param.default})
            </span>
          </label>

          {#if param.type === 'float' || param.type === 'int'}
            <input
              type="range"
              id="param-{key}"
              min={param.min}
              max={param.max}
              step={param.step}
              value={$paramValues[key] ?? param.default}
              oninput={(e) => {
                updateParamValue(key, parseFloat(e.currentTarget.value));
              }}
              class="w-full"
              {disabled}
              aria-label="{key} 参数滑块"
            />
          {:else}
            <input
              type="text"
              id="param-{key}"
              value={$paramValues[key] ?? param.default}
              oninput={(e) => {
                updateParamValue(key, parseFloat(e.currentTarget.value) || 0);
              }}
              class="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded"
              {disabled}
              aria-label="{key} 参数输入"
            />
          {/if}

          {#if param.description}
            <p class="text-xs text-gray-500 mt-1">{param.description}</p>
          {/if}
        </div>
      {/each}
    </div>
  {:else}
    <div class="text-gray-500 text-sm">选择模型查看参数</div>
  {/if}
</div>
