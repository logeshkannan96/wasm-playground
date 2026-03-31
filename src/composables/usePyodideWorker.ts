import { ref, onUnmounted } from 'vue'
import type { WorkerToMain } from '../types/messages'
import { useOutputLog } from './useOutputLog'

export type RunnerStatus = 'idle' | 'loading' | 'running' | 'error'

export function usePyodideWorker() {
  const { segments, append, clear } = useOutputLog()

  const status = ref<RunnerStatus>('idle')
  const executionTime = ref<number | null>(null)
  const pyodideReady = ref(false)

  const interruptSab = new SharedArrayBuffer(4)
  const interruptU8 = new Uint8Array(interruptSab)

  const worker = new Worker(
    new URL('../workers/pyodide.worker.ts', import.meta.url),
    { type: 'module' }
  )

  worker.onmessage = (event: MessageEvent<WorkerToMain>) => {
    const msg = event.data

    switch (msg.type) {
      case 'LOADING':
        status.value = 'loading'
        append('system', msg.text + '\n')
        break
      case 'READY':
        pyodideReady.value = true
        status.value = 'idle'
        append('system', 'Python runtime ready.\n')
        break
      case 'STDOUT':
        append('stdout', msg.text)
        break
      case 'STDERR':
        append('stderr', msg.text)
        break
      case 'DONE':
        status.value = 'idle'
        executionTime.value = msg.durationMs
        break
      case 'ERROR':
        append('stderr', msg.text + '\n')
        break
    }
  }

  worker.onerror = (e) => {
    append('stderr', `Worker error: ${e.message}\n`)
    status.value = 'error'
  }

  worker.postMessage({ type: 'INIT', interruptSab })

  function run(code: string, stdin: string) {
    if (!pyodideReady.value) {
      append('system', 'Python runtime is still loading...\n')
      return
    }
    if (status.value === 'running') return
    clear()
    executionTime.value = null
    status.value = 'running'
    worker.postMessage({ type: 'RUN', code, stdin })
  }

  function cancel() {
    if (status.value !== 'running') return
    Atomics.store(interruptU8, 0, 2)
    append('system', '\nExecution cancelled.\n')
    status.value = 'idle'
  }

  onUnmounted(() => worker.terminate())

  return {
    segments,
    status,
    executionTime,
    pyodideReady,
    run,
    cancel,
    clearOutput: clear,
  }
}
