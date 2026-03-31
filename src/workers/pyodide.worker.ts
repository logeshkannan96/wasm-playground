/// <reference lib="webworker" />

import type { MainToWorker, WorkerToMain } from '../types/messages'

declare const self: DedicatedWorkerGlobalScope

const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.27.3/full/'

let interruptSab: SharedArrayBuffer
let interruptU8: Uint8Array

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pyodide: any = null

function post(msg: WorkerToMain) {
  self.postMessage(msg)
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init(msg: { interruptSab: SharedArrayBuffer }) {
  interruptSab = msg.interruptSab
  interruptU8 = new Uint8Array(interruptSab)

  post({ type: 'LOADING', text: 'Loading Python runtime (Pyodide)...' })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pyodideModule: any = await import(/* @vite-ignore */ PYODIDE_CDN + 'pyodide.mjs')
  pyodide = await pyodideModule.loadPyodide({ indexURL: PYODIDE_CDN })

  pyodide.setInterruptBuffer(interruptU8)

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

  // Define a helper that wires sys.stdin / builtins.input to a StringIO per run.
  // Called at the start of each runCode() with the user's stdin string.
  pyodide.runPython(`
import sys, io, builtins

def _setup_stdin(text):
    _io = io.StringIO(text)
    sys.stdin = _io
    def _input(prompt=''):
        if prompt:
            sys.stdout.write(prompt)
            sys.stdout.flush()
        return _io.readline().rstrip('\\n')
    builtins.input = _input
`)

  post({ type: 'READY' })
}

// ─── Run ──────────────────────────────────────────────────────────────────────
async function runCode(code: string, stdin: string) {
  if (!pyodide) {
    post({ type: 'ERROR', text: 'Pyodide not initialized.' })
    return
  }

  // Reset interrupt buffer before each run
  Atomics.store(interruptU8, 0, 0)

  // Wire stdin for this run
  pyodide.globals.set('__stdin_str__', stdin || '')
  pyodide.runPython('_setup_stdin(__stdin_str__)')

  const start = performance.now()

  try {
    await pyodide.loadPackagesFromImports(code)
    await pyodide.runPythonAsync(code)
    post({ type: 'DONE', durationMs: Math.round(performance.now() - start) })
  } catch (err: any) {
    const msg = err?.message ?? String(err)
    if (msg.includes('KeyboardInterrupt')) {
      post({ type: 'ERROR', text: 'KeyboardInterrupt: execution stopped.' })
    } else {
      post({ type: 'ERROR', text: msg })
    }
    post({ type: 'DONE', durationMs: Math.round(performance.now() - start) })
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
      await runCode(msg.code, msg.stdin ?? '')
      break
    case 'CANCEL':
      Atomics.store(interruptU8, 0, 2)
      break
  }
}
