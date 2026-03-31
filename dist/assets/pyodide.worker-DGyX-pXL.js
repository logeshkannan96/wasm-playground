const u="https://cdn.jsdelivr.net/pyodide/v0.27.3/full/";let p,r,o,l,a,s=null;function i(n){self.postMessage(n)}function y(){i({type:"INPUT_REQUEST",prompt:""}),Atomics.wait(r,0,0);const n=Atomics.load(r,0);if(Atomics.store(r,0,0),n===-1)return null;let t=4;for(;t<8192&&o[t]!==0;)t++;const e=o.slice(4,t),d=new TextDecoder().decode(e);return o.fill(0,4),d+`
`}async function m(n){p=n.inputSab,r=new Int32Array(p),o=new Uint8Array(p),l=n.interruptSab,a=new Uint8Array(l),i({type:"LOADING",text:"Loading Python runtime (Pyodide)..."}),s=await(await import(u+"pyodide.mjs")).loadPyodide({indexURL:u}),s.setInterruptBuffer(a),s.setStdout({raw:e=>{i({type:"STDOUT",text:String.fromCharCode(e)})}}),s.setStderr({raw:e=>{i({type:"STDERR",text:String.fromCharCode(e)})}}),s.runPython(`
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
`),globalThis.__worker_stdin__=y,i({type:"READY"})}async function _(n){if(!s){i({type:"ERROR",text:"Pyodide not initialized."});return}Atomics.store(a,0,0);const t=performance.now();try{await s.loadPackagesFromImports(n),await s.runPythonAsync(n);const e=Math.round(performance.now()-t);i({type:"DONE",durationMs:e})}catch(e){const d=Math.round(performance.now()-t),c=(e==null?void 0:e.message)??String(e);c.includes("KeyboardInterrupt")?i({type:"ERROR",text:"KeyboardInterrupt: execution stopped."}):i({type:"ERROR",text:c}),i({type:"DONE",durationMs:d})}}self.onmessage=async n=>{const t=n.data;switch(t.type){case"INIT":await m(t);break;case"RUN":await _(t.code);break;case"CANCEL":Atomics.store(a,0,2),Atomics.store(r,0,-1),Atomics.notify(r,0);break}};
