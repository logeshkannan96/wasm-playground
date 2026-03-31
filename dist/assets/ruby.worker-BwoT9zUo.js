const o="https://cdn.jsdelivr.net/npm/@ruby/head-wasm-wasi@latest/dist/ruby+stdlib.wasm";let n=null;function s(t){self.postMessage(t)}async function c(){s({type:"LOADING",text:"Loading Ruby runtime (ruby.wasm)..."});try{const{DefaultRubyVM:t}=await import("./index-DBXZO9LW.js"),r=await(await fetch(o)).arrayBuffer(),a=await WebAssembly.compile(r);({vm:n}=await t(a)),n.eval("require 'stringio'"),s({type:"READY"})}catch(t){s({type:"ERROR",text:`Failed to load Ruby: ${t}`})}}async function d(t,e){const r=performance.now();try{n.eval(`
$stdout = StringIO.new
$stderr = StringIO.new
$stdin  = StringIO.new(${JSON.stringify(e+(e.endsWith(`
`)?"":`
`))})
`),n.eval(t)}catch{}const a=n.eval("$stdout.string").toString(),i=n.eval("$stderr.string").toString();a&&s({type:"STDOUT",text:a}),i&&s({type:"STDERR",text:i}),s({type:"DONE",durationMs:Math.round(performance.now()-r)})}self.onmessage=async t=>{const e=t.data;e.type==="INIT"?await c():e.type==="RUN"&&await d(e.code,e.stdin??"")};
