<template>
  <div class="run-controls">
    <button
      v-if="status !== 'running'"
      class="btn btn-run"
      :disabled="status === 'loading' || !pyodideReady"
      @click="emit('run')"
      title="Run (Ctrl+Enter)"
    >
      <span v-if="status === 'loading'" class="spinner" />
      <span v-else class="icon">▶</span>
      <span>{{ status === 'loading' ? 'Loading...' : 'Run' }}</span>
    </button>

    <button
      v-else
      class="btn btn-stop"
      @click="emit('cancel')"
      title="Stop execution"
    >
      <span class="icon">■</span>
      <span>Stop</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { RunnerStatus } from '../composables/usePyodideWorker'

defineProps<{
  status: RunnerStatus
  pyodideReady: boolean
}>()

const emit = defineEmits<{
  run: []
  cancel: []
}>()
</script>

<style scoped>
.run-controls {
  display: flex;
  align-items: center;
}

.btn {
  display: flex;
  align-items: center;
  gap: 7px;
  border: none;
  border-radius: 7px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  padding: 8px 18px;
  transition: background 0.18s, transform 0.1s;
  user-select: none;
}

.btn:active {
  transform: scale(0.97);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-run {
  background: #4caf82;
  color: #0d1117;
}

.btn-run:hover:not(:disabled) {
  background: #5ccc96;
}

.btn-stop {
  background: #e05c5c;
  color: #fff;
}

.btn-stop:hover {
  background: #f06060;
}

.icon {
  font-size: 11px;
}

.spinner {
  width: 13px;
  height: 13px;
  border: 2px solid rgba(0, 0, 0, 0.25);
  border-top-color: #0d1117;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: inline-block;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
