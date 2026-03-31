import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    headers: {
      // Required for SharedArrayBuffer + Atomics (used for synchronous input() in Pyodide worker)
      'Cross-Origin-Opener-Policy': 'same-origin',
      // credentialless: allows SharedArrayBuffer (for Pyodide input())
      // while also permitting cross-origin resources without CORP headers
      // (needed to load wasm-clang assets from binji.github.io)
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
  worker: {
    format: 'es',   // required when multiple module workers share code-split chunks
  },
  optimizeDeps: {
    // Pyodide must NOT be pre-bundled — it loads itself from CDN inside the worker
    exclude: ['pyodide'],
  },
})
