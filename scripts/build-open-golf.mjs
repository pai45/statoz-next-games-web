import fs from 'node:fs/promises';
import path from 'node:path';

// The arcade shell (menus, HUD, results) is game-owned HTML over the upstream
// engine. The engine itself is the rebuilt golf-mobile runtime with the
// statoz_golf_* bridge; see scripts/rebuild-open-golf-mobile.py.
export async function buildOpenGolf({prelude}) {
 const root=path.join(process.cwd(),'src/features/games/open-golf/source');
 const feature=path.join(process.cwd(),'src/features/games/open-golf');
 const runtime=await fs.readFile(path.join(root,'golf-mobile.js'),'utf8');
 const wasm=(await fs.readFile(path.join(root,'golf-mobile.wasm'))).toString('base64');
 const notices=await fs.readFile(path.join(root,'THIRD-PARTY-NOTICES.txt'),'utf8');
 const font=(await fs.readFile(path.join(feature,'fonts/rubik-latin-wght-normal.woff2'))).toString('base64');
 const css=(await fs.readFile(path.join(feature,'shell/golf-shell.css'),'utf8')).replace('__RUBIK_WOFF2__','data:font/woff2;base64,'+font);
 const markup=await fs.readFile(path.join(feature,'shell/golf-shell.html'),'utf8');
 const shell=await fs.readFile(path.join(feature,'shell/golf-shell.js'),'utf8');
 const configuration=`
let paused=false,disposed=false,started=false;const waiting=new Map(),raf=requestAnimationFrame.bind(window),caf=cancelAnimationFrame.bind(window);
window.requestAnimationFrame=callback=>{let id;id=raf(time=>{if(disposed)return;if(paused)waiting.set(id,callback);else callback(time);});return id;};
window.cancelAnimationFrame=id=>{waiting.delete(id);caf(id);};
const shell=()=>window.OpenGolfShell;
const decode=text=>{const binary=atob(text),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes;};
var Module={canvas:document.getElementById('canvas'),preRun:[()=>{
  const mount=FS.mount.bind(FS);
  FS.mount=(type,options,target)=>mount(target==='/opengolf_persistent_data'?MEMFS:type,options,target);
  FS.syncfs=(populate,callback)=>{if(typeof populate==='function'){callback=populate;populate=false;}try{
    const file='/opengolf_persistent_data/storage.json';
    if(populate){const saved=localStorage.getItem('open-golf.storage');if(saved)FS.writeFile(file,saved);}
    else{try{localStorage.setItem('open-golf.storage',FS.readFile(file,{encoding:'utf8'}));}catch(e){if(e.errno!==44)throw e;}}
    callback(null);
  }catch(error){callback(error);}};
}],onRuntimeInitialized:()=>{window.__STATOZ_HOST__.emit('ready');shell()?.ready(Module);},onAbort:()=>{shell()?.fail();window.__STATOZ_HOST__.emit('error',{message:'Open Golf could not start.'});}};
window.__STATOZ_HOST__.command=command=>{if(command==='pause'){paused=true;Module._saudio_context?.suspend();shell()?.hostPause(true);}else if(command==='resume'){paused=false;for(const callback of waiting.values())raf(callback);waiting.clear();Module._saudio_context?.resume();shell()?.hostPause(false);}else if(command==='dispose'){disposed=true;waiting.clear();Module._saudio_context?.close();}};
document.getElementById('resume').onclick=()=>window.__STATOZ_HOST__.command('resume');
// Paint the splash first: decoding and compiling the engine blocks the page for a moment.
const startEngine=()=>{if(started||disposed)return;started=true;Module.wasmBinary=decode(document.getElementById('og-wasm').textContent);const engine=document.createElement('script');engine.textContent=document.getElementById('og-runtime').textContent;document.body.append(engine);};
const scheduleEngine=()=>raf(()=>setTimeout(startEngine,0));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scheduleEngine,{once:true});else scheduleEngine();
`;
 const escape=s=>s.replaceAll('</script','<\\/script');
 return `<!doctype html><html lang="en" data-game="open-golf"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Open Golf</title><style>html,body{margin:0;background:#04190f;width:100%;height:100%;overflow:hidden}canvas{position:absolute;width:100%;height:100%;display:block;touch-action:none}</style><style>${css}</style></head><body><canvas id="canvas" oncontextmenu="event.preventDefault()"></canvas>${markup}<script type="application/json" id="open-golf-credits">${escape(JSON.stringify(notices))}</script><script type="application/octet-stream" id="og-wasm">${wasm}</script><script type="text/plain" id="og-runtime">${escape(runtime)}</script>${prelude}<script>${escape(shell)}</script><script>${escape(configuration)}</script></body></html>`;
}
