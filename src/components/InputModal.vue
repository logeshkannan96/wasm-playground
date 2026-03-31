<template>
  <Transition name="modal">
    <div v-if="show" class="modal-overlay" @keydown.esc="onCancel">
      <div class="modal-box">
        <div class="modal-header">
          <span class="modal-icon">⌨</span>
          <span class="modal-title">Python is waiting for input</span>
        </div>

        <div v-if="prompt" class="modal-prompt">{{ prompt }}</div>

        <div class="modal-input-row">
          <input
            ref="inputRef"
            v-model="value"
            type="text"
            class="modal-input"
            placeholder="Type your input and press Enter..."
            @keydown.enter="onSubmit"
            @keydown.esc="onCancel"
          />
          <button class="btn-submit" @click="onSubmit">Send</button>
        </div>

        <div class="modal-hint">Press <kbd>Enter</kbd> to submit · <kbd>Esc</kbd> to cancel</div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = defineProps<{
  show: boolean
  prompt?: string
}>()

const emit = defineEmits<{
  submit: [value: string]
  cancel: []
}>()

const value = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

// Autofocus when shown, clear value
watch(() => props.show, async (visible) => {
  if (visible) {
    value.value = ''
    await nextTick()
    inputRef.value?.focus()
  }
})

function onSubmit() {
  emit('submit', value.value)
  value.value = ''
}

function onCancel() {
  emit('cancel')
  value.value = ''
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(3px);
}

.modal-box {
  background: #1e1e2e;
  border: 1px solid #3d3d5c;
  border-radius: 12px;
  padding: 24px 28px;
  width: 480px;
  max-width: 90vw;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.modal-icon {
  font-size: 20px;
}

.modal-title {
  font-size: 15px;
  font-weight: 600;
  color: #e0e0e0;
}

.modal-prompt {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 8px 12px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: #ffd93d;
  margin-bottom: 14px;
  white-space: pre-wrap;
}

.modal-input-row {
  display: flex;
  gap: 8px;
}

.modal-input {
  flex: 1;
  background: #0d1117;
  border: 1px solid #444;
  border-radius: 6px;
  color: #e0e0e0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  padding: 8px 12px;
  outline: none;
  transition: border-color 0.2s;
}

.modal-input:focus {
  border-color: #6c63ff;
}

.btn-submit {
  background: #6c63ff;
  border: none;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  padding: 8px 16px;
  transition: background 0.2s;
}

.btn-submit:hover {
  background: #7c74ff;
}

.modal-hint {
  margin-top: 10px;
  font-size: 11px;
  color: #555;
}

kbd {
  background: #2a2a3e;
  border: 1px solid #444;
  border-radius: 3px;
  font-size: 11px;
  padding: 1px 5px;
  color: #aaa;
}

/* Transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
</style>
