<template>
  <div class="stdin-panel">
    <div class="stdin-label">
      <span>stdin</span>
      <span class="stdin-hint">Provide input before running — one value per line</span>
      <button class="btn-clear-stdin" @click="emit('update:modelValue', '')">Clear</button>
    </div>
    <textarea
      class="stdin-input"
      :value="modelValue"
      placeholder="e.g.&#10;Alice&#10;42"
      spellcheck="false"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<style scoped>
.stdin-panel {
  display: flex;
  flex-direction: column;
  border-top: 1px solid #21262d;
  height: 140px;
  flex-shrink: 0;
}

.stdin-label {
  align-items: center;
  background: #161b22;
  border-bottom: 1px solid #21262d;
  color: #8b949e;
  display: flex;
  font-size: 11px;
  font-weight: 600;
  gap: 8px;
  letter-spacing: 0.05em;
  padding: 5px 14px;
  text-transform: uppercase;
  flex-shrink: 0;
}

.stdin-hint {
  color: #444;
  font-weight: 400;
  font-size: 10px;
  text-transform: none;
  letter-spacing: 0;
  flex: 1;
}

.btn-clear-stdin {
  background: transparent;
  border: 1px solid #30363d;
  border-radius: 4px;
  color: #555;
  cursor: pointer;
  font-size: 10px;
  padding: 2px 8px;
  transition: color 0.15s, border-color 0.15s;
}

.btn-clear-stdin:hover {
  border-color: #555;
  color: #aaa;
}

.stdin-input {
  background: #0d1117;
  border: none;
  color: #9ecbff;
  flex: 1;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 13px;
  line-height: 1.6;
  outline: none;
  padding: 8px 14px;
  resize: none;
  width: 100%;
}

.stdin-input::placeholder {
  color: #333;
}
</style>
