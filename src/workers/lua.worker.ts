/// <reference lib="webworker" />
import type { WorkerToMain } from '../types/messages'

declare const self: DedicatedWorkerGlobalScope

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let LuaFactory: any = null

function post(msg: WorkerToMain) {
  self.postMessage(msg)
}

async function init() {
  post({ type: 'LOADING', text: 'Loading Lua runtime (wasmoon)...' })
  try {
    const mod = await import('wasmoon')
    LuaFactory = mod.LuaFactory
    post({ type: 'READY' })
  } catch (err) {
    post({ type: 'ERROR', text: `Failed to load Lua: ${err}` })
  }
}

async function runCode(code: string, stdin: string) {
  const start = performance.now()

  // Create a fresh Lua state per run — clean globals, no bleed between runs
  const factory = new LuaFactory()
  const lua = await factory.createEngine({ openStandardLibs: true })

  try {
    // ── stdout: override print and io.write ──────────────────────────────────
    lua.global.set('print', (...args: unknown[]) => {
      post({ type: 'STDOUT', text: args.map(String).join('\t') + '\n' })
    })

    // Expose a raw write function that Lua io.write will call
    lua.global.set('__js_write__', (text: unknown) => {
      post({ type: 'STDOUT', text: String(text) })
    })

    // ── stdin: expose line-by-line reader ────────────────────────────────────
    const lines = stdin ? stdin.split('\n') : []
    let lineIdx = 0
    lua.global.set('__js_readline__', () => {
      if (lineIdx < lines.length) return lines[lineIdx++]
      return null // EOF
    })

    // Inject io overrides before user code runs
    await lua.doString(`
-- io.write streams directly to JS
io.write = function(...)
  for _, v in ipairs({...}) do
    __js_write__(tostring(v))
  end
end

-- io.read reads from pre-provided stdin lines
io.read = function(fmt)
  fmt = fmt or 'l'
  if fmt == '*l' or fmt == 'l' or fmt == 'L' or fmt == '*L' then
    local line = __js_readline__()
    if fmt == 'L' or fmt == '*L' then
      return line and (line .. '\\n') or nil
    end
    return line
  elseif fmt == '*n' or fmt == 'n' then
    local line = __js_readline__()
    return line and tonumber(line) or nil
  elseif fmt == '*a' or fmt == 'a' then
    local result = {}
    local line = __js_readline__()
    while line ~= nil do
      result[#result + 1] = line .. '\\n'
      line = __js_readline__()
    end
    return table.concat(result)
  end
  return nil
end
`)

    // Run user code
    await lua.doString(code)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    post({ type: 'STDERR', text: msg + '\n' })
  } finally {
    lua.global.close()
  }

  post({ type: 'DONE', durationMs: Math.round(performance.now() - start) })
}

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data
  if (msg.type === 'INIT') await init()
  else if (msg.type === 'RUN') await runCode(msg.code, msg.stdin ?? '')
}
