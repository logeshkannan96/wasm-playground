// Classic Web Worker — loaded as a Blob URL so importScripts() works.
// Do NOT add ES import statements here.

const CDN = 'https://binji.github.io/wasm-clang/';

let api = null;
let warmupDone = false;

// Tracks whether we are in 'compiling', 'running', or 'idle' phase.
// Used by hostWrite to route output to the right channel.
let phase = 'idle';
let suppressOutput = false;

function post(msg) {
  self.postMessage(msg);
}

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*[mGKHF]/g, '');
}

// Called by wasm-clang for ALL output (compiler messages + program stdout/stderr).
// We differentiate based on phase and presence of ANSI escape codes.
function hostWrite(text) {
  if (suppressOutput) return;

  if (phase === 'running') {
    // Program is executing — all output is stdout
    post({ type: 'STDOUT', text });
    return;
  }

  // Compilation / linking phase:
  // ANSI color codes = diagnostics (errors/warnings) → stderr (red)
  // Plain text = compiler progress ("Compiling test.cc...") → system (yellow)
  if (text.includes('\x1b[')) {
    const clean = stripAnsi(text);
    if (clean.trim()) post({ type: 'STDERR', text: clean });
  } else {
    if (text.trim()) post({ type: 'SYSTEM', text });
  }
}

async function warmup() {
  post({ type: 'LOADING', text: 'Downloading C/C++ compiler (wasm-clang, ~60 MB first load)...' });

  // Load shared.js from wasm-clang CDN — defines the `API` class as a global.
  importScripts(CDN + 'shared.js');

  api = new API({                                         // eslint-disable-line no-undef
    readBuffer: async (name) => {
      const r = await fetch(CDN + name);
      return r.arrayBuffer();
    },
    compileStreaming: async (name) => {
      return WebAssembly.compileStreaming(fetch(CDN + name));
    },
    hostWrite,
  });

  // Trigger a silent warm-up compile so all WASM modules (clang ~31MB, lld ~19MB,
  // sysroot ~9MB) are downloaded and cached before the user's first real run.
  suppressOutput = true;
  try {
    await api.compileLinkRun('int main() { return 0; }');
  } catch (_) {
    // Ignore — proc_exit(0) throws in wasm-clang, that's expected.
  }
  suppressOutput = false;
  warmupDone = true;

  post({ type: 'READY' });
}

self.onmessage = async (e) => {
  const msg = e.data;

  if (msg.type === 'INIT') {
    warmup().catch((err) => {
      post({ type: 'ERROR', text: 'Failed to load wasm-clang: ' + String(err) });
    });
    return;
  }

  if (msg.type === 'RUN') {
    if (!warmupDone) {
      post({ type: 'ERROR', text: 'Compiler is still loading, please wait...' });
      return;
    }

    const start = performance.now();
    const isC = msg.language === 'c';
    const inputFile = isC ? 'test.c' : 'test.cc';
    const objFile = 'test.o';
    const wasmFile = 'test.wasm';

    // Reset memfs state from any previous run
    try { api.memfs.setStdinStr(''); } catch (_) { /* not yet initialized */ }

    phase = 'compiling';

    try {
      // Step 1: Compile source → object file
      await api.compile({ input: inputFile, contents: msg.code, obj: objFile });

      // Step 2: Set stdin now that memfs is initialized
      const stdinStr = (msg.stdin || '');
      api.memfs.setStdinStr(stdinStr.endsWith('\n') ? stdinStr : stdinStr + '\n');

      // Step 3: Link object → WASM binary
      await api.link(objFile, wasmFile);

      // Step 4: Compile the linked WASM and run it
      const buffer = api.memfs.getFileContents(wasmFile);
      const wasmMod = await WebAssembly.compile(buffer);

      phase = 'running';
      await api.run(wasmMod, wasmFile);

    } catch (err) {
      const errMsg = err && err.message ? err.message : String(err);
      // proc_exit is expected (program called exit() or returned from main)
      if (!errMsg.includes('proc_exit') && !errMsg.includes('unreachable')) {
        post({ type: 'STDERR', text: errMsg + '\n' });
      }
    }

    phase = 'idle';
    post({ type: 'DONE', durationMs: Math.round(performance.now() - start) });
    return;
  }
};

// Kick off on worker start
warmup().catch((err) => {
  post({ type: 'ERROR', text: 'Failed to load wasm-clang: ' + String(err) });
});
