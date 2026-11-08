import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {chromium} from '@playwright/test';

const root=process.cwd(),out=path.join(root,'test-results/vibe-basketball');
await fs.mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.glb':'model/gltf-binary','.jpg':'image/jpeg','.txt':'text/plain'};
const server=http.createServer(async(req,res)=>{
 try{
  let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/statoz-games-web(?=\/)/,'');
  if(pathname.endsWith('/'))pathname+='index.html';
  const filename=path.resolve(root,'public','.'+pathname);
  if(!filename.startsWith(path.join(root,'public')+path.sep)){res.writeHead(403);res.end();return;}
  res.setHeader('content-type',mime[path.extname(filename)]||'application/octet-stream');res.end(await fs.readFile(filename));
 }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const chrome=process.env.VIBE_CHROMIUM||'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser=await chromium.launch({executablePath:chrome,headless:true,args:['--enable-unsafe-swiftshader']});
const evidence=[],errors=[];
async function settled(page){await page.waitForFunction(()=>document.getElementById('loading').classList.contains('done'));await page.waitForTimeout(650);}
async function start(page,url){await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__VIBE_HOST__&&document.getElementById('loading').classList.contains('done'),null,{timeout:120000});await settled(page);}
async function bounds(page){return page.evaluate(()=>({width:innerWidth,height:innerHeight,scroll:document.documentElement.scrollWidth}));}
try{
 for(const [width,height] of [[1440,900],[320,740],[390,844],[844,390],[667,375]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true});
  page.on('pageerror',error=>errors.push(error.message));
  const requested=[];page.on('request',request=>requested.push(request.url()));
  const base=origin+'/statoz-games-web/embedded-games/vibe-basketball/index.html';
  await start(page,base+'?lite=1');
  await page.screenshot({path:path.join(out,`${width}x${height}-menu.png`)});
  assert.ok((await bounds(page)).scroll<=width,'Horizontal menu overflow');
  await page.locator('#mode-how-to').click();await page.locator('#how-to-back').scrollIntoViewIfNeeded();await page.locator('#how-to-back').click();
  await page.locator('#mode-1v1').click();await page.waitForFunction(()=>window.__game?.players?.length===2);
  await page.waitForFunction(()=>!document.getElementById('vibe-touch').hidden);
  await settled(page);
  await page.screenshot({path:path.join(out,`${width}x${height}-1v1.png`)});
  const boxes=await page.locator('#vibe-touch button,#vibe-joystick').evaluateAll(nodes=>nodes.filter(node=>getComputedStyle(node).display!=='none').map(node=>{const r=node.getBoundingClientRect();return {label:node.textContent.trim(),x:r.x,y:r.y,width:r.width,height:r.height};}));
  for(const box of boxes){assert.ok(box.width>=44&&box.height>=44,box.label+' touch target');assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=width+1&&box.y+box.height<=height+1,box.label+' outside screen');}
  // Independent real touch pointers: left joystick + right hold/release shot.
  const stick=await page.locator('#vibe-joystick').boundingBox(),shoot=await page.locator('#vibe-shoot').boundingBox();
  const session=await page.context().newCDPSession(page);
  const left={x:stick.x+stick.width*.75,y:stick.y+stick.height*.35,id:1};
  const right={x:shoot.x+shoot.width/2,y:shoot.y+shoot.height/2,id:2};
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[left]});
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[left,right]});
  // The engine commits a held shot on its next frames; software WebGL can run them at a few frames per second.
  await page.waitForFunction(()=>window.__input.shootCommitted,null,{timeout:15000}).catch(()=>{});
  const held=await page.evaluate(()=>({move:window.__VIBE_HOST__.move,shoot:window.__input.keys.has('Space'),committed:window.__input.shootCommitted}));
  assert.ok(held.move?.x>0&&held.shoot&&held.committed,'Simultaneous movement and held shot');
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForFunction(()=>!window.__input.keys.has('Space'));
  // Canceled input must clear all source state and never become a shot release.
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[left,right]});
  await session.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  await page.waitForFunction(()=>window.__input.keys.size===0);
  await page.locator('[data-command=pause]').click();
  const before=await page.evaluate(()=>JSON.parse(window.render_game_to_text()));
  await page.waitForTimeout(200);
  const after=await page.evaluate(()=>JSON.parse(window.render_game_to_text()));
  assert.deepEqual(after,before,'Pause freezes the simulation');
  await page.locator('[data-command=resume]').click();
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  assert.equal(await page.evaluate(()=>window.__VIBE_HOST__.paused),true,'Backgrounding pauses');
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  assert.equal(await page.evaluate(()=>window.__VIBE_HOST__.paused),true,'Returning requires explicit resume');
  await page.locator('[data-command=resume]').click();
  if(width===390){
   await page.setViewportSize({width:844,height:390});await page.evaluate(()=>window.dispatchEvent(new Event('orientationchange')));
   assert.equal(await page.evaluate(()=>window.__input.keys.size),0,'Rotation clears input');
   await page.locator('[data-command=resume]').click();
   await page.setViewportSize({width,height});await page.evaluate(()=>window.dispatchEvent(new Event('orientationchange')));await page.locator('[data-command=resume]').click();
  }
  await page.locator('#vibe-toolbar [data-command=pause]').click();await page.locator('#vibe-pause [data-command=menu]').click();await page.locator('#mode-three-point').click();
  await page.waitForFunction(()=>window.__game?.mode==='three-point');
  await settled(page);
  await page.screenshot({path:path.join(out,`${width}x${height}-contest-setup.png`)});
  await page.locator('[data-player-count="4"]').click();
  await page.locator('[data-rack="top"]').click();
  await page.waitForFunction(()=>!document.getElementById('vibe-touch').hidden);
  await page.screenshot({path:path.join(out,`${width}x${height}-contest.png`)});
  assert.ok(requested.some(url=>url.endsWith('vibe-contest-props.glb')),'Local contest GLB loaded');
  assert.ok(requested.every(url=>url.startsWith(origin)),'No remote runtime dependencies');
  assert.ok(requested.some(url=>/\/models\/athletes\/athlete-(male|female)\.glb$/.test(url)),'Verified local athlete GLBs loaded');
  assert.ok(!requested.some(url=>/\/animations?\//i.test(url)),'Basketball takes remain locally authored, without downloaded animation packs');
  evidence.push({width,height,bounds:await bounds(page),touchTargets:boxes.length,simultaneousTouch:true,paused:true,localModel:true});
  await page.close();
 }
 assert.deepEqual(errors,[]);
 // Run the upstream comprehensive contest probe against the imported build.
 const original=await fs.readFile(path.join(root,'src/features/games/vibe-basketball/source/tools/three_point_contest_probe.mjs'),'utf8');
 const probe=original.replace("from 'playwright'","from "+JSON.stringify(pathToFileURL(path.join(root,'node_modules/@playwright/test/index.mjs')).href))
  .replace('player.rig.meshJersey?.material.color.getHexString()','player.rig.config.jersey.toString(16)')
  .replace('headless: true,','headless: true, executablePath: '+JSON.stringify(chrome)+',')
  .replace("['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist']","['--enable-unsafe-swiftshader']")
  .replace("path.resolve('output/three-point-probe')",JSON.stringify(path.join(out,'upstream-contest')));
 const probePath=path.join(root,'.cache/vibe-contest-probe.mjs');await fs.writeFile(probePath,probe);
 await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[probePath],{cwd:root,env:{...process.env,GAME_URL:origin+'/embedded-games/vibe-basketball'},stdio:['ignore','pipe','pipe']});let log='';child.stdout.on('data',data=>{log+=data;process.stdout.write(data);});child.stderr.on('data',data=>{log+=data;process.stderr.write(data);});child.on('error',reject);child.on('exit',async code=>{await fs.writeFile(path.join(out,'upstream-contest.log'),log);if(code===0)resolve();else reject(Error('Upstream contest probe failed: '+code));});});
 await fs.writeFile(path.join(out,'validation.json'),JSON.stringify({evidence,errors,upstreamContest:true,physicalDevices:false},null,2));
 console.log('Vibe Basketball responsive, multitouch, pause and upstream contest checks passed.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
