import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const out=path.join(process.cwd(),'test-results/vibe-basketball/mobile-v3');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.VIBE_CHROMIUM||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']});
const errors=[],results=[];
let server;
if(!process.env.VIBE_GAME_URL){
 const root=path.join(process.cwd(),'public'),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.glb':'model/gltf-binary'};
 server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');let name=decodeURIComponent(url.pathname);if(name.endsWith('/'))name+='index.html';const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep))throw Error('path');res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
}
const base=process.env.VIBE_GAME_URL||'http://127.0.0.1:'+server.address().port+'/embedded-games/vibe-basketball/index.html';
const intersects=(a,b)=>a.x<b.x+b.width-1&&a.x+a.width>b.x+1&&a.y<b.y+b.height-1&&a.y+a.height>b.y+1;
async function ready(page){await page.waitForFunction(()=>document.getElementById('loading')?.classList.contains('done'));await page.waitForTimeout(650);}
async function boxes(page,selectors){return page.evaluate(selectors=>selectors.map(selector=>{const node=document.querySelector(selector);if(!node||node.hidden||getComputedStyle(node).display==='none')return null;const r=node.getBoundingClientRect();return {selector,x:r.x,y:r.y,width:r.width,height:r.height};}).filter(Boolean),selectors);}
function check(rects,width,height){for(const r of rects)assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=width+1&&r.y+r.height<=height+1,r.selector+' outside viewport');for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++)assert.ok(!intersects(rects[i],rects[j]),'Overlap: '+rects[i].selector+' / '+rects[j].selector);}
try{
 for(const [width,height] of [[320,740],[390,844],[667,375],[844,390],[932,430],[1024,768]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'?mode=three-point&touch=1');await ready(page);
  await page.screenshot({path:path.join(out,`${width}x${height}-setup.png`)});
  await page.locator('[data-player-count="4"]').click();await page.locator('[data-rack="top"]').click();
  await page.evaluate(()=>window.advanceTime(5000));await page.waitForFunction(()=>!document.getElementById('vibe-touch').hidden);
  const cdp=await page.context().newCDPSession(page),shoot=await page.locator('#vibe-shoot').boundingBox();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:shoot.x+shoot.width/2,y:shoot.y+shoot.height/2}]});
  await page.waitForTimeout(200);await page.evaluate(()=>window.advanceTime(200));
  await page.waitForFunction(()=>document.getElementById('shot-meter').classList.contains('show'));
  const contest=await boxes(page,['#vibe-toolbar [data-command=exit]','#vibe-toolbar [data-command=pause]','.contest-topline','.contest-progress','#vibe-shoot','#shot-meter']);check(contest,width,height);
  assert.ok(contest.find(r=>r.selector==='.contest-topline').height<=48,'Compact contest scoreboard');
  assert.ok(contest.find(r=>r.selector==='.contest-progress').width<=322,'Compact rack progress');
  await page.screenshot({path:path.join(out,`${width}x${height}-contest-shot.png`)});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.locator('#vibe-toolbar [data-command=pause]').click();await page.screenshot({path:path.join(out,`${width}x${height}-pause.png`)});await page.locator('#vibe-pause [data-command=menu]').click();
  await ready(page);await page.locator('#mode-1v1').click();await ready(page);
  assert.equal(await page.locator('.vibe-skills').count(),0,'No duplicate directional pad');
  const buttons=await page.locator('#vibe-touch button').evaluateAll(nodes=>nodes.filter(n=>getComputedStyle(n).display!=='none').map(n=>{const r=n.getBoundingClientRect();return {selector:n.getAttribute('data-key')||'dribble',x:r.x,y:r.y,width:r.width,height:r.height};}));
  check([...await boxes(page,['#vibe-joystick','#scoreboard','#vibe-toolbar [data-command=exit]','#vibe-toolbar [data-command=pause]']),...buttons],width,height);
  for(const r of buttons)assert.ok(r.width>=44&&r.height>=44,'44px touch targets');
  if(width<600){const court=await page.locator('#app').boundingBox(),stick=await page.locator('#vibe-joystick').boundingBox();assert.ok(court.y+court.height<=stick.y,'Portrait joystick stays below the court');}
  await page.screenshot({path:path.join(out,`${width}x${height}-1v1.png`)});
  // One joystick moves; independent Dribble gestures retain the original skill input.
  const stick=await page.locator('#vibe-joystick').boundingBox(),dribble=await page.locator('[data-skill]').boundingBox();
  const left={id:1,x:stick.x+stick.width*.7,y:stick.y+stick.height*.35},right={id:2,x:dribble.x+22,y:dribble.y+22};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[left,right]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[left,{...right,x:right.x+24}]});
  await page.waitForFunction(()=>window.__VIBE_HOST__.move?.x>0&&window.__input.keys.has('ArrowRight'));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await page.waitForFunction(()=>window.__input.keys.size===0);
  // Defense has stance/steal and a BLOCK primary action, without attack-only controls.
  await page.evaluate(()=>{const g=window.__game;g.offenseIdx=1-g.userPlayer.team;});await page.waitForFunction(()=>document.documentElement.dataset.vibeRole==='defense');
  assert.equal(await page.locator('#vibe-shoot b').textContent(),'BLOCK');
  await page.screenshot({path:path.join(out,`${width}x${height}-defense.png`)});
  results.push({width,height,contestRects:contest,oneMovementControl:true,dribbleGesture:true,noOverlaps:true});await page.close();
 }
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'validation.json'),JSON.stringify({results,errors,physicalIOS:false},null,2));console.log('Mobile HUD, shot meter, single joystick, gestures and overlap checks passed at six sizes.');
}finally{await browser.close();if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}}
