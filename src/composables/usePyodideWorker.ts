import { ref, onUnmounted } from 'vue'
import type { WorkerToMain } from '../types/messages'
import { useOutputLog } from './useOutputLog'

// SharedArrayBuffer sizes
const INPUT_SAB_SIZE = 8192  // 4 bytes semaphore + 8188 bytes for string
const INTERRUPT_SAB_SIZE = 4 // 1 byte used (index 0)

export type RunnerStatus = 'idle' | 'loading' | 'running' | 'awaiting-input' | 'error'

export function usePyodideWorker() {
  const { segments, append, clear } = useOutputLog()

  const status = ref<RunnerStatus>('idle')
  const inputPrompt = ref('')
  const awaitingInput = ref(false)
  const executionTime = ref<number | null>(null)
  const pyodideReady = ref(false)

  // SharedArrayBuffers — allocated once, shared with worker
  const inputSab = new SharedArrayBuffer(INPUT_SAB_SIZE)
  const inputI32 = new Int32Array(inputSab)
  const inputU8 = new Uint8Array(inputSab)

  const interruptSab = new SharedArrayBuffer(INTERRUPT_SAB_SIZE)

  // Create worker
  const worker = new Worker(
    new URL('../workers/pyodide.worker.ts', import.meta.url),
    { type: 'module' }
  )

  // Handle messages from worker
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

      case 'INPUT_REQUEST':
        status.value = 'awaiting-input'
        awaitingInput.value = true
        inputPrompt.value = msg.prompt
        break

      case 'DONE':
        status.value = 'idle'
        awaitingInput.value = false
        executionTime.value = msg.durationMs
        break

      case 'ERROR':
        append('stderr', msg.text + '\n')
        // status handled by subsequent DONE message
        break
    }
  }

  worker.onerror = (e) => {
    append('stderr', `Worker error: ${e.message}\n`)
    status.value = 'error'
  }

  // Send INIT with SABs
  worker.postMessage({ type: 'INIT', inputSab, interruptSab })

  // ─── Public API ───────────────────────────────────────────────────────────

  function run(code: string) {
    if (!pyodideReady.value) {
      append('system', 'Python runtime is still loading...\n')
      return
    }
    if (status.value === 'running' || status.value === 'awaiting-input') return

    clear()
    executionTime.value = null
    status.value = 'running'
    worker.postMessage({ type: 'RUN', code })
  }

  function cancel() {
    if (status.value !== 'running' && status.value !== 'awaiting-input') return
    worker.postMessage({ type: 'CANCEL' })
    // Also unblock any stuck Atomics.wait
    Atomics.store(inputI32, 0, -1)
    Atomics.notify(inputI32, 0)
    append('system', '\nExecution cancelled.\n')
    status.value = 'idle'
    awaitingInput.value = false
  }

  function submitInput(value: string) {
    if (!awaitingInput.value) return

    // Echo the input to stdout (as a real terminal would)
    append('stdout', value + '\n')

    awaitingInput.value = false
    status.value = 'running'

    // Encode value into SAB bytes 4..end
    inputU8.fill(0, 4) // clear old data
    const encoded = new TextEncoder().encode(value)
    const maxLen = INPUT_SAB_SIZE - 4
    inputU8.set(encoded.slice(0, maxLen), 4)

    // Set semaphore to 1 (ready) and notify
    Atomics.store(inputI32, 0, 1)
    Atomics.notify(inputI32, 0)
  }

  onUnmounted(() => {
    worker.terminate()
  })

  return {
    segments,
    status,
    inputPrompt,
    awaitingInput,
    executionTime,
    pyodideReady,
    run,
    cancel,
    submitInput,
    clearOutput: clear,
  }
}
