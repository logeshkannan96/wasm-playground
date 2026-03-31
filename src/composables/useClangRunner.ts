import { ref, onUnmounted } from 'vue'
import type { WorkerToMain } from '../types/messages'
import { useOutputLog } from './useOutputLog'
import type { Language } from '../types/runner'

// Load the worker JS as a raw string so we can create a classic Blob worker.
// This avoids Vite trying to bundle it as a module worker (which would break
// importScripts() used to load shared.js from the wasm-clang CDN).
import clangWorkerCode from '../workers/clang.worker.js?raw'

export type ClangStatus = 'idle' | 'loading' | 'running' | 'error'

// Extend WorkerToMain for the SYSTEM message type used by the clang worker
interface SystemMessage { type: 'SYSTEM'; text: string }
type ClangWorkerMsg = WorkerToMain | SystemMessage

function createClangWorker(): Worker {
  const blob = new Blob([clangWorkerCode], { type: 'application/javascript' })
  return new Worker(URL.createObjectURL(blob))
}

export function useClangRunner() {
  const { segments, append, clear } = useOutputLog()
  const status = ref<ClangStatus>('idle')
  const executionTime = ref<number | null>(null)
  const runtimeReady = ref(false)

  const worker = createClangWorker()

  worker.onmessage = (e: MessageEvent<ClangWorkerMsg>) => {
    const msg = e.data
    switch (msg.type) {
      case 'LOADING':
        status.value = 'loading'
        append('system', msg.text + '\n')
        break
      case 'READY':
        runtimeReady.value = true
        status.value = 'idle'
        append('system', 'Compiler ready.\n')
        break
      case 'STDOUT':
        append('stdout', msg.text)
        break
      case 'STDERR':
        append('stderr', msg.text)
        break
      case 'SYSTEM':
        append('system', msg.text)
        break
      case 'ERROR':
        append('stderr', msg.text + '\n')
        status.value = 'error'
        break
      case 'DONE':
        executionTime.value = msg.durationMs
        status.value = 'idle'
        break
    }
  }

  worker.onerror = (e) => {
    append('stderr', `Worker error: ${e.message}\n`)
    status.value = 'error'
  }

  // Worker auto-starts warmup on creation (see clang.worker.js bottom)
  // No explicit INIT message needed — worker calls warmup() immediately.

  function run(code: string, language: Language, stdin: string) {
    if (!runtimeReady.value) {
      append('system', 'Compiler is still loading, please wait...\n')
      return
    }
    if (status.value === 'running') return
    clear()
    executionTime.value = null
    status.value = 'running'
    worker.postMessage({ type: 'RUN', code, language, stdin })
  }

  function cancel() {
    // wasm-clang runs synchronously in the worker — only hard terminate works
    worker.terminate()
    append('system', '\nExecution cancelled.\n')
    status.value = 'idle'
  }

  onUnmounted(() => worker.terminate())

  return {
    segments,
    status,
    executionTime,
    runtimeReady,
    run,
    cancel,
    clearOutput: clear,
  }
}
