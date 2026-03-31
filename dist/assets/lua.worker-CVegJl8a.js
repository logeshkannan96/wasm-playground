let l=null;function n(e){self.postMessage(e)}async function _(){n({type:"LOADING",text:"Loading Lua runtime (wasmoon)..."});try{l=(await import("./index-jWRydga5.js").then(function(t){return t.i})).LuaFactory,n({type:"READY"})}catch(e){n({type:"ERROR",text:`Failed to load Lua: ${e}`})}}async function c(e,t){const s=performance.now(),r=await new l().createEngine({openStandardLibs:!0});try{r.global.set("print",(...a)=>{n({type:"STDOUT",text:a.map(String).join("	")+`
`})}),r.global.set("__js_write__",a=>{n({type:"STDOUT",text:String(a)})});const i=t?t.split(`
`):[];let o=0;r.global.set("__js_readline__",()=>o<i.length?i[o++]:null),await r.doString(`
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
`),await r.doString(e)}catch(i){const o=i instanceof Error?i.message:String(i);n({type:"STDERR",text:o+`
`})}finally{r.global.close()}n({type:"DONE",durationMs:Math.round(performance.now()-s)})}self.onmessage=async e=>{const t=e.data;t.type==="INIT"?await _():t.type==="RUN"&&await c(t.code,t.stdin??"")};var f=Object.freeze({__proto__:null});export{f as _};
