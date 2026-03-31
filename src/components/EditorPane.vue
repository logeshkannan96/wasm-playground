<template>
  <div ref="containerRef" class="editor-container">
    <div v-if="!editorReady" class="editor-loading">Loading editor...</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import loader from '@monaco-editor/loader'
import type * as Monaco from 'monaco-editor'

const props = defineProps<{
  modelValue: string
  language?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'run': []
}>()

const containerRef = ref<HTMLElement | null>(null)
const editorReady = ref(false)
let editor: Monaco.editor.IStandaloneCodeEditor | null = null
let monaco: typeof Monaco | null = null

onMounted(async () => {
  if (!containerRef.value) return

  // Load Monaco from CDN (jsDelivr) — avoids worker bundling complexity
  monaco = await loader.init()

  editor = monaco.editor.create(containerRef.value, {
    value: props.modelValue,
    language: props.language ?? 'python',
    theme: 'vs-dark',
    fontSize: 14,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    minimap: { enabled: false },
    automaticLayout: true,
    scrollBeyondLastLine: false,
    lineNumbers: 'on',
    renderLineHighlight: 'line',
    tabSize: 4,
    insertSpaces: true,
    padding: { top: 12, bottom: 12 },
    smoothScrolling: true,
  })

  editorReady.value = true

  // Sync editor → parent
  editor.onDidChangeModelContent(() => {
    emit('update:modelValue', editor!.getValue())
  })

  // Ctrl+Enter or Cmd+Enter → run
  editor.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
    () => emit('run')
  )
})

// Sync parent → editor (when code is changed externally)
watch(() => props.modelValue, (newVal) => {
  if (editor && editor.getValue() !== newVal) {
    editor.setValue(newVal)
  }
})

watch(() => props.disabled, (disabled) => {
  editor?.updateOptions({ readOnly: !!disabled })
})

// Switch Monaco language when the language prop changes
watch(() => props.language, (lang) => {
  if (editor && monaco && lang) {
    const model = editor.getModel()
    if (model) monaco.editor.setModelLanguage(model, lang)
  }
})

onBeforeUnmount(() => {
  editor?.dispose()
})
</script>

<style scoped>
.editor-container {
  width: 100%;
  height: 100%;
  min-height: 0;
  position: relative;
}

.editor-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #555;
  font-size: 13px;
  font-style: italic;
  background: #1e1e1e;
}
</style>
