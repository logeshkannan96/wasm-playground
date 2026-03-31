import { ref, onUnmounted } from 'vue'
import type { WorkerToMain } from '../types/messages'
import { useOutputLog } from './useOutputLog'

export type WasmRunnerStatus = 'idle' | 'loading' | 'running' | 'error'

type WorkerFactory = () => Worker

export function useWasmRunner(workerFactory: WorkerFactory) {
  const { segments, append, clear } = useOutputLog()
  const status = ref<WasmRunnerStatus>('idle')
  const executionTime = ref<number | null>(null)
  const runtimeReady = ref(false)

  const worker = workerFactory()

  worker.onmessage = (e: MessageEvent<WorkerToMain>) => {
    const msg = e.data
    switch (msg.type) {
      case 'LOADING':
        status.value = 'loading'
        append('system', msg.text + '\n')
        break
      case 'READY':
        runtimeReady.value = true
        status.value = 'idle'
        append('system', 'Runtime ready.\n')
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

  // Kick off runtime load immediately
  worker.postMessage({ type: 'INIT' })

  function run(code: string, stdin: string) {
    if (!runtimeReady.value) {
      append('system', 'Runtime is still loading...\n')
      return
    }
    if (status.value === 'running') return
    clear()
    executionTime.value = null
    status.value = 'running'
    worker.postMessage({ type: 'RUN', code, stdin })
  }

  function cancel() {
    // No fine-grained interrupt for these runtimes — terminate & restart
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
