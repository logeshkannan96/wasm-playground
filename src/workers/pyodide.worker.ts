/// <reference lib="webworker" />

import type { MainToWorker, WorkerToMain } from '../types/messages'

declare const self: DedicatedWorkerGlobalScope

const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.27.3/full/'

// SharedArrayBuffer layout:
//   Int32Array view  → index 0 = semaphore (0=waiting, 1=ready, -1=cancelled)
//   Uint8Array view  → bytes 4..end = UTF-8 encoded input string
const INPUT_SAB_SIZE = 8192

let inputSab: SharedArrayBuffer
let inputI32: Int32Array
let inputU8: Uint8Array

let interruptSab: SharedArrayBuffer
let interruptU8: Uint8Array

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pyodide: any = null

function post(msg: WorkerToMain) {
  self.postMessage(msg)
}

// ─── Pyodide stdin callback (runs synchronously inside worker thread) ─────────
function stdinCallback(): string | null {
  // Signal main thread we need input
  post({ type: 'INPUT_REQUEST', prompt: '' })

  // Block this worker thread until main thread writes to the SAB
  Atomics.wait(inputI32, 0, 0)

  const flag = Atomics.load(inputI32, 0)

  // Reset semaphore
  Atomics.store(inputI32, 0, 0)

  if (flag === -1) {
    // Cancelled
    return null
  }

  // Decode the string from bytes 4 onward
  // Find null terminator or use full buffer
  let end = 4
  while (end < INPUT_SAB_SIZE && inputU8[end] !== 0) end++
  const bytes = inputU8.slice(4, end)
  const text = new TextDecoder().decode(bytes)

  // Clear the buffer
  inputU8.fill(0, 4)

  return text + '\n'
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init(msg: { inputSab: SharedArrayBuffer; interruptSab: SharedArrayBuffer }) {
  inputSab = msg.inputSab
  inputI32 = new Int32Array(inputSab)
  inputU8 = new Uint8Array(inputSab)

  interruptSab = msg.interruptSab
  interruptU8 = new Uint8Array(interruptSab)

  post({ type: 'LOADING', text: 'Loading Python runtime (Pyodide)...' })

  // Dynamic import works in module workers (importScripts does not)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pyodideModule: any = await import(/* @vite-ignore */ PYODIDE_CDN + 'pyodide.mjs')
  pyodide = await pyodideModule.loadPyodide({ indexURL: PYODIDE_CDN })

  // Wire up interrupt buffer so Ctrl+C / Stop works
  pyodide.setInterruptBuffer(interruptU8)

  // Wire stdout → raw callback (fires on every write, preserves prompt text)
  pyodide.setStdout({
    raw: (charCode: number) => {
      post({ type: 'STDOUT', text: String.fromCharCode(charCode) })
    },
  })

  pyodide.setStderr({
    raw: (charCode: number) => {
      post({ type: 'STDERR', text: String.fromCharCode(charCode) })
    },
  })

  // Patch Python's builtins.input to use our SAB-backed stdin
  // We replace input() with a version that writes the prompt to stdout first,
  // then reads from our custom stdin.
  pyodide.runPython(`
import sys
import builtins

class _WasmStdin:
    def readline(self):
        import js
        return js.__worker_stdin__()

_wasm_stdin = _WasmStdin()

def _patched_input(prompt=''):
    if prompt:
        sys.stdout.write(prompt)
        sys.stdout.flush()
    line = _wasm_stdin.readline()
    if line is None:
        raise EOFError('Input cancelled')
    return line.rstrip('\\n')

builtins.input = _patched_input
sys.stdin = _wasm_stdin
`)

  // Expose the JS stdin callback to Python via js module
  // We attach it to globalThis so Python's `js` module can see it
  ;(globalThis as any).__worker_stdin__ = stdinCallback

  post({ type: 'READY' })
}

// ─── Run ──────────────────────────────────────────────────────────────────────
async function runCode(code: string) {
  if (!pyodide) {
    post({ type: 'ERROR', text: 'Pyodide not initialized.' })
    return
  }

  // Reset interrupt buffer before each run
  Atomics.store(interruptU8, 0, 0)

  const start = performance.now()

  try {
    // Auto-install any imports found in the code
    await pyodide.loadPackagesFromImports(code)
    await pyodide.runPythonAsync(code)
    const duration = Math.round(performance.now() - start)
    post({ type: 'DONE', durationMs: duration })
  } catch (err: any) {
    const duration = Math.round(performance.now() - start)
    const msg = err?.message ?? String(err)
    // Don't show KeyboardInterrupt as an error — it's expected from Stop
    if (msg.includes('KeyboardInterrupt')) {
      post({ type: 'ERROR', text: 'KeyboardInterrupt: execution stopped.' })
    } else {
      post({ type: 'ERROR', text: msg })
    }
    post({ type: 'DONE', durationMs: duration })
  }
}

// ─── Message handler ──────────────────────────────────────────────────────────
self.onmessage = async (event: MessageEvent<MainToWorker>) => {
  const msg = event.data
  switch (msg.type) {
    case 'INIT':
      await init(msg)
      break
    case 'RUN':
      await runCode(msg.code)
      break
    case 'CANCEL':
      // Write 2 to interrupt buffer → raises KeyboardInterrupt in Python
      Atomics.store(interruptU8, 0, 2)
      // Also unblock any pending Atomics.wait in the stdin callback
      Atomics.store(inputI32, 0, -1)
      Atomics.notify(inputI32, 0)
      break
  }
}
