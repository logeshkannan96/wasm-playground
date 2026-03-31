<template>
  <div class="app">
    <!-- Header -->
    <header class="header">
      <div class="header-left">
        <span class="title">Code Runner</span>
        <LanguageSelector v-model="language" />
        <span class="wasm-badge">100% WASM</span>
      </div>
      <div class="header-right">
        <span v-if="activeExecTime !== null" class="exec-time">
          Ran in {{ activeExecTime }}ms
        </span>
        <RunButton
          :status="activeStatus"
          :pyodideReady="activeReady"
          @run="handleRun"
          @cancel="handleCancel"
        />
        <button class="btn-clear" @click="handleClear">Clear</button>
      </div>
    </header>

    <!-- Main -->
    <main class="main">
      <!-- Left: Editor + optional stdin -->
      <div class="pane left-pane">
        <div class="pane-label">
          Editor
          <span class="hint">Ctrl+Enter to run</span>
          <span v-if="LANGUAGES[language].isClang" class="runtime-badge clang-badge">
            wasm-clang · C++17
          </span>
        </div>
        <div class="pane-body">
          <EditorPane
            v-model="code"
            :language="LANGUAGES[language].monacoId"
            :disabled="activeStatus === 'running'"
            @run="handleRun"
          />
        </div>

        <Transition name="slide">
          <StdinPanel v-model="stdin" />
        </Transition>
      </div>

      <div class="divider" />

      <!-- Right: Output -->
      <div class="pane right-pane">
        <div class="pane-label">
          Output
          <span class="status-dot" :class="statusClass" />
          <span class="status-label">{{ statusLabel }}</span>
        </div>
        <div class="pane-body">
          <OutputPane :segments="activeSegments" />
        </div>
      </div>
    </main>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import EditorPane from './components/EditorPane.vue'
import OutputPane from './components/OutputPane.vue'
import RunButton from './components/RunButton.vue'
import LanguageSelector from './components/LanguageSelector.vue'
import StdinPanel from './components/StdinPanel.vue'
import { usePyodideWorker } from './composables/usePyodideWorker'
import { useWasmRunner } from './composables/useWasmRunner'
import { useClangRunner } from './composables/useClangRunner'
import { LANGUAGES } from './types/runner'
import type { Language } from './types/runner'

// ─── Language + per-language code / stdin buffers ─────────────────────────────

const language = ref<Language>('python')
const stdin = ref('')

const codeBuffers = ref<Record<Language, string>>({
  python: LANGUAGES.python.defaultCode,
  ruby:   LANGUAGES.ruby.defaultCode,
  c:      LANGUAGES.c.defaultCode,
  cpp:    LANGUAGES.cpp.defaultCode,
})

const code = computed({
  get: () => codeBuffers.value[language.value],
  set: (val) => { codeBuffers.value[language.value] = val },
})

// ─── Runners — all created eagerly so runtimes preload in background ──────────

const pyodide = usePyodideWorker()

const ruby = useWasmRunner(
  () => new Worker(new URL('./workers/ruby.worker.ts', import.meta.url), { type: 'module' })
)

// C and C++ share one wasm-clang worker instance (same compiler, different file extension)
const clang = useClangRunner()

// ─── Unified view over whichever runner is active ────────────────────────────

const activeRunner = computed(() => {
  switch (language.value) {
    case 'ruby': return ruby
    case 'c':
    case 'cpp':  return clang
    default:     return pyodide
  }
})

const activeSegments = computed(() => activeRunner.value.segments.value)
const activeExecTime = computed(() => activeRunner.value.executionTime.value)
const activeStatus   = computed(() => activeRunner.value.status.value)
const activeReady    = computed(() => {
  switch (language.value) {
    case 'ruby': return ruby.runtimeReady.value
    case 'c':
    case 'cpp':  return clang.runtimeReady.value
    default:     return pyodide.pyodideReady.value
  }
})

// ─── Actions ──────────────────────────────────────────────────────────────────

function handleRun() {
  const lang = language.value
  if (lang === 'python') {
    pyodide.run(code.value, stdin.value)
  } else if (lang === 'ruby') {
    ruby.run(code.value, stdin.value)
  } else {
    // C or C++ — both use the same clang runner, language passed for file ext
    clang.run(code.value, lang, stdin.value)
  }
}

function handleCancel() { activeRunner.value.cancel() }
function handleClear()  { activeRunner.value.clearOutput() }

// ─── Status display ───────────────────────────────────────────────────────────

const statusLabel = computed(() => {
  const s = activeStatus.value
  if (s === 'idle')    return activeReady.value ? 'Ready' : 'Initializing...'
  if (s === 'loading') return 'Downloading runtime...'
  if (s === 'running') return (language.value === 'c' || language.value === 'cpp')
    ? 'Compiling & running...'
    : 'Running...'
  if (s === 'error')   return 'Error'
  return ''
})

const statusClass = computed(() => ({
  'dot-ready':   activeStatus.value === 'idle' && activeReady.value,
  'dot-loading': activeStatus.value === 'loading' || (activeStatus.value === 'idle' && !activeReady.value),
  'dot-running': activeStatus.value === 'running',
  'dot-error':   activeStatus.value === 'error',
}))
</script>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: #0d1117;
  color: #e0e0e0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  height: 100vh;
  overflow: hidden;
}
#app { height: 100vh; display: flex; flex-direction: column; }
</style>

<style scoped>
.app { display: flex; flex-direction: column; height: 100vh; }

/* ─── Header ─────────────────────────────────────────────────────────────────── */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #161b22;
  border-bottom: 1px solid #21262d;
  flex-shrink: 0;
  gap: 12px;
}

.header-left { display: flex; align-items: center; gap: 14px; }
.header-right { display: flex; align-items: center; gap: 10px; }

.title { font-size: 15px; font-weight: 700; color: #e0e0e0; white-space: nowrap; }

.wasm-badge {
  background: #0d2137;
  border: 1px solid #1a4060;
  border-radius: 20px;
  color: #4a9eff;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 2px 10px;
}

.exec-time { font-size: 12px; color: #6a9955; font-family: monospace; white-space: nowrap; }

.btn-clear {
  background: transparent;
  border: 1px solid #30363d;
  border-radius: 6px;
  color: #8b949e;
  cursor: pointer;
  font-size: 13px;
  padding: 6px 13px;
  transition: border-color 0.15s, color 0.15s;
}
.btn-clear:hover { border-color: #555; color: #e0e0e0; }

/* ─── Layout ─────────────────────────────────────────────────────────────────── */
.main { display: flex; flex: 1; min-height: 0; }
.pane { display: flex; flex-direction: column; flex: 1; min-width: 0; min-height: 0; }

.pane-label {
  align-items: center;
  background: #161b22;
  border-bottom: 1px solid #21262d;
  color: #8b949e;
  display: flex;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  gap: 8px;
  letter-spacing: 0.05em;
  padding: 5px 14px;
  text-transform: uppercase;
}

.hint { color: #333; font-size: 10px; font-weight: 400; letter-spacing: 0; text-transform: none; }

.runtime-badge {
  border-radius: 20px;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0;
  padding: 2px 9px;
  text-transform: none;
}

.clang-badge {
  background: #1a1a2e;
  border: 1px solid #2a2a4e;
  color: #7070cc;
}

.pane-body { flex: 1; min-height: 0; overflow: hidden; }
.divider { background: #21262d; flex-shrink: 0; width: 1px; }

/* ─── Status dot ─────────────────────────────────────────────────────────────── */
.status-dot { border-radius: 50%; display: inline-block; height: 7px; width: 7px; }
.dot-ready   { background: #4caf82; }
.dot-loading { background: #ffd93d; animation: pulse 1.2s ease-in-out infinite; }
.dot-running { background: #4a90e2; animation: pulse 0.8s ease-in-out infinite; }
.dot-error   { background: #e05c5c; }

.status-label { color: #555; font-size: 11px; font-weight: 400; letter-spacing: 0; text-transform: none; }

@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

/* ─── Stdin slide ─────────────────────────────────────────────────────────────── */
.slide-enter-active, .slide-leave-active {
  transition: height 0.2s ease, opacity 0.2s ease;
  overflow: hidden;
}
.slide-enter-from, .slide-leave-to { height: 0 !important; opacity: 0; }
</style>
