import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';

const root = process.cwd(), output = path.join(root, 'test-results/shootout-import');
await fs.mkdir(output, { recursive: true });
const entry = `
import { ShootoutScene } from './src/features/games/penalty-shootout/rendering/scene';
import { ShootoutSimulation, initializePhysics } from './src/features/games/penalty-shootout/engine/simulation';
import { emptyInput } from './src/features/games/penalty-shootout/game-types';
(async () => {
 await initializePhysics();
 const scene = new ShootoutScene(document.querySelector('#stage'),()=>{},()=>{}); await scene.load();
 let sim;
 const reset = role => { sim?.dispose(); sim = new ShootoutSimulation(role,6,42); };
 const step = (n,input=emptyInput()) => { for(let i=0;i<n;i++)sim.step(input); };
 const render = () => {const f=sim.frame(); scene.render(f,null,1,sim.snapshot(),false); return {tick:f.tick,striker:document.querySelector('#stage').dataset.strikerFrame,keeper:document.querySelector('#stage').dataset.keeperAnimation,keeperFrame:document.querySelector('#stage').dataset.keeperFrame};};
 window.review = {
  shot(age) { reset('shooting'); step(60,{...emptyInput(),shoot:true}); step(1); step(Math.round(age*120)); return render(); },
  keeper(age,x=1,y=0) { reset('keeping'); step(1,{...emptyInput(),dive:{x:-x,y}}); step(Math.round(age*120));return render(); },
  async play(role) { reset(role); for(let i=0;i<420;i++) {for(let j=0;j<2;j++){const tick=sim.tick;sim.step({...emptyInput(),shoot:role==='shooting' && tick<60,dive:role==='keeping' && tick===340?{x:-1,y:1}:null});}render();await new Promise(requestAnimationFrame);} },
  dispose() {sim?.dispose();scene.dispose();}
 };
 window.review.shot(0); window.ready=true;
})().catch(error=>{window.failure=String(error);});`;
const bundled = await build({ stdin: { contents: entry, resolveDir: root, loader: 'ts' }, bundle: true, write: false, format: 'iife', platform: 'browser', target: 'es2020', define: { 'process.env.NEXT_PUBLIC_BASE_PATH': '""', 'process.env.NODE_ENV': '"production"' }, tsconfig: path.join(root, 'tsconfig.json') });
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (url.pathname === '/') { response.setHeader('Content-Type','text/html');response.end('<!doctype html><html><style>html,body,#stage{width:100%;height:100%;margin:0;overflow:hidden}canvas{width:100%;height:100%}</style><div id="stage"></div><script src="/review.js"></script></html>');return; }
    if (url.pathname === '/review.js') {response.setHeader('Content-Type','text/javascript');response.end(bundled.outputFiles[0].contents);return;}
    const file = path.resolve(root,'public','.'+decodeURIComponent(url.pathname));
    if (!file.startsWith(path.join(root,'public')+path.sep)) throw Error('Out of asset scope');
    const body=await fs.readFile(file);response.setHeader('Content-Type',file.endsWith('.webp')?'image/webp':file.endsWith('.json')?'application/json':'application/octet-stream');response.end(body);
  } catch {response.statusCode=404;response.end('Not found');}
});
await new Promise(resolve=>server.listen(3142,'127.0.0.1',resolve));
let browser;
try {
  browser=await chromium.launch({headless:true,...(process.env.SHOOTOUT_CHROMIUM?{executablePath:process.env.SHOOTOUT_CHROMIUM}:{})});
  const context=await browser.newContext({viewport:{width:1280,height:800},recordVideo:{dir:output,size:{width:1280,height:800}}});
  const page=await context.newPage(), errors=[];page.on('pageerror',error=>errors.push(String(error)));
  await page.goto('http://127.0.0.1:3142');await page.waitForFunction(()=>window.ready||window.failure);
  const failure=await page.evaluate(()=>window.failure);if(failure)throw Error(failure);
  const captures=[];
  for(const [name,kind,age,x,y] of [['striker-ready','shot',0],['striker-contact','shot',1],['striker-follow-through','shot',1.25],['striker-settled','shot',3.2],['keeper-left','keeper',.6,-1,0],['keeper-right-high','keeper',.6,1,1],['keeper-low','keeper',.6,1,-1],['keeper-recovered','keeper',2.75,1,0]]) {
    const metadata=await page.evaluate(({kind,age,x,y})=>window.review[kind](age,x,y),{kind,age,x,y});
    await page.screenshot({path:path.join(output,name+'.png')});captures.push({name,...metadata});
  }
  await page.evaluate(()=>window.review.play('shooting'));await page.evaluate(()=>window.review.play('keeping'));
  const video=page.video();await page.evaluate(()=>window.review.dispose());await context.close();await video.saveAs(path.join(output,'character-actions.webm'));
  await fs.writeFile(path.join(output,'review.json'),JSON.stringify({captures,errors},null,2));
  if(errors.length)throw Error(errors.join('\n'));
  console.log('Character screenshots and full action video: '+output);
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
