/// <reference lib="webworker" />
import type { WorkerToMain } from '../types/messages'

declare const self: DedicatedWorkerGlobalScope

// Ruby+stdlib WASM binary (~38 MB, includes StringIO, etc.)
const RUBY_WASM_URL = 'https://cdn.jsdelivr.net/npm/@ruby/head-wasm-wasi@latest/dist/ruby+stdlib.wasm'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let vm: any = null

function post(msg: WorkerToMain) {
  self.postMessage(msg)
}

async function init() {
  post({ type: 'LOADING', text: 'Loading Ruby runtime (ruby.wasm)...' })
  try {
    const { DefaultRubyVM } = await import('@ruby/wasm-wasi/dist/browser')
    const response = await fetch(RUBY_WASM_URL)
    const buffer = await response.arrayBuffer()
    const mod = await WebAssembly.compile(buffer)
    ;({ vm } = await DefaultRubyVM(mod))

    // One-time setup: load StringIO (part of stdlib)
    vm.eval(`require 'stringio'`)
    post({ type: 'READY' })
  } catch (err) {
    post({ type: 'ERROR', text: `Failed to load Ruby: ${err}` })
  }
}

async function runCode(code: string, stdin: string) {
  const start = performance.now()
  try {
    // Redirect $stdout / $stderr / $stdin each run so state is clean
    vm.eval(`
$stdout = StringIO.new
$stderr = StringIO.new
$stdin  = StringIO.new(${JSON.stringify(stdin + (stdin.endsWith('\n') ? '' : '\n'))})
`)

    // Run the user code — any uncaught exception bubbles as a JS error
    vm.eval(code)
  } catch (_) {
    // Ruby exceptions are exposed via $stderr when they propagate;
    // ruby.wasm also writes the backtrace to $stderr automatically.
    // Swallow the JS wrapper error here — we read $stderr below.
  }

  // Collect captured output
  const stdout = vm.eval('$stdout.string').toString()
  const stderr = vm.eval('$stderr.string').toString()

  if (stdout) post({ type: 'STDOUT', text: stdout })
  if (stderr) post({ type: 'STDERR', text: stderr })

  post({ type: 'DONE', durationMs: Math.round(performance.now() - start) })
}

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data
  if (msg.type === 'INIT') await init()
  else if (msg.type === 'RUN') await runCode(msg.code, msg.stdin ?? '')
}
