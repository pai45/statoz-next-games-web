import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export function createYorkerServer(root=process.cwd()) {
 const publicRoot=path.resolve(root,'public');
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.mp3':'audio/mpeg','.json':'application/json','.glb':'model/gltf-binary','.woff2':'font/woff2','.wasm':'application/wasm','.data':'application/octet-stream','.bundle':'application/octet-stream'};
 return http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://127.0.0.1');const pathname=decodeURIComponent(url.pathname).replace(/^\/statoz-games-web(?=\/)/,'');
  if(pathname==='/fixture'){
   res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html><style>html,body,iframe{margin:0;width:100%;height:100%;border:0;overflow:hidden;background:#070d18}</style><iframe title="Yorker" allow="autoplay; fullscreen"></iframe><script>
   const account=new URLSearchParams(location.search).get('account')||'qa-a',key='yorker.fixture.'+account,session=crypto.randomUUID();let state;try{state=JSON.parse(localStorage.getItem(key)||'null')}catch{}state=state||{schemaVersion:1,stores:{},resultIds:[]};const frame=document.querySelector('iframe');window.__STATOZ_BUNDLE_BOOT__=(s,w)=>s===session&&w===frame.contentWindow?JSON.stringify({...state,origin:location.origin,sessionId:session,assetRoot:location.pathname.startsWith('/statoz-games-web/')?'/statoz-games-web/games/yorker/':'/games/yorker/'}):null;addEventListener('message',e=>{if(e.source!==frame.contentWindow||e.origin!==location.origin||e.data?.sessionId!==session||e.data?.gameId!=='yorker')return;if(e.data.type==='save'){state=e.data.payload;localStorage.setItem(key,JSON.stringify(state));}if(e.data.type==='exit')document.body.dataset.exited='true';});frame.src=(location.pathname.startsWith('/statoz-games-web/')?'/statoz-games-web':'')+'/embedded-games/yorker/index.html?session='+session+(new URLSearchParams(location.search).has('manual')?'&clock=manual':'');</script></html>`);return;
  }
  let file=path.resolve(publicRoot,'.'+pathname);if(file!==publicRoot&&!file.startsWith(publicRoot+path.sep))throw Error('Invalid path');if((await fs.stat(file)).isDirectory())file=path.join(file,'index.html');res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));
 }catch{res.writeHead(404).end('Not found');}});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const server=createYorkerServer();server.listen(Number(process.env.PORT)||5258,'127.0.0.1',()=>console.log(`Yorker local preview: http://127.0.0.1:${server.address().port}/fixture`));
}
