import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const root=process.cwd(),out=path.join(root,'test-results/vibe-basketball/performance');await fs.mkdir(out,{recursive:true});
const server=http.createServer(async(req,res)=>{try{let p=new URL(req.url,'http://localhost').pathname;if(p.endsWith('/'))p+='index.html';const f=path.resolve(root,'public','.'+p);if(!f.startsWith(path.join(root,'public')+path.sep))throw Error('path');res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.glb':'model/gltf-binary'})[path.extname(f)]||'application/octet-stream');res.end(await fs.readFile(f));}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:process.env.VIBE_CHROMIUM||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']});
const base=`http://127.0.0.1:${server.address().port}/embedded-games/vibe-basketball/index.html`,errors=[],results={};
async function open(page,query,timeout=30000){await page.goto(base+query);await page.waitForFunction(()=>window.__VIBE_PERFORMANCE__?.snapshot().drawCalls>0,null,{timeout});}
try{
 const page=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:3,isMobile:true,hasTouch:true});page.on('pageerror',e=>errors.push(e.message));
 await open(page,'?mode=1v1');
 const initial=await page.evaluate(()=>window.__VIBE_PERFORMANCE__.snapshot());
 assert.ok(initial.fast&&!initial.bloom&&!initial.shadows);assert.ok(initial.pixelRatio<=1);assert.ok(initial.buffer[0]*initial.buffer[1]<=650000);assert.ok(initial.batchedDrawsSaved>=20);
 const adaptation=await page.evaluate(()=>{
  const api=window.__VIBE_PERFORMANCE__,clock=window.__game.shotClock;
  for(let i=0;i<180;i++)api.frame(100000+i*40);
  return {profile:api.snapshot(),unchangedClock:clock===window.__game.shotClock};
 });
 assert.ok(adaptation.profile.adaptiveChanges>0&&adaptation.profile.pixelRatio>=.65&&adaptation.profile.pixelRatio<initial.pixelRatio);assert.ok(adaptation.unchangedClock,'Graphics adaptation cannot advance the simulation');
 await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(100);
 assert.ok(await page.evaluate(()=>{const s=window.__VIBE_PERFORMANCE__.snapshot();return s.buffer[0]*s.buffer[1]<=650000;}),'Tablet drawing buffer stays bounded');
 await page.setViewportSize({width:844,height:390});
 await open(page,'?mode=three-point');await page.locator('[data-player-count="4"]').click();await page.locator('[data-rack="top"]').click();
 await page.waitForFunction(()=>window.__game.state==='running');
 // Inspect actual mutations while the contest clock runs normally.
 const changes=await page.evaluate(async()=>{
  let mutations=0;const observer=new MutationObserver(records=>mutations+=records.length);observer.observe(document.getElementById('contest-attempts'),{childList:true,subtree:true});
  const start=window.__game.round.clock;await new Promise(resolve=>setTimeout(resolve,1200));observer.disconnect();return {mutations,start,end:window.__game.round.clock};
 });
 assert.ok(changes.mutations<8,'Rack DOM is not rebuilt every frame');assert.ok(changes.end<changes.start,'Clock runs normally');
 // Use the visible graphics control and ensure mode navigation retains the choice.
 await page.locator('#vibe-toolbar [data-command=pause]').click();await page.locator('[data-command=graphics]').click();await page.waitForURL('**quality=performance');await page.waitForFunction(()=>window.__VIBE_PERFORMANCE__);
 await page.locator('#vibe-toolbar [data-command=pause]').click();await page.locator('[data-command=graphics]').click();await page.waitForURL('**quality=high');await page.waitForFunction(()=>window.__VIBE_PERFORMANCE__?.snapshot().drawCalls>0);
 const high=await page.evaluate(()=>window.__VIBE_PERFORMANCE__.snapshot());assert.ok(!high.fast&&high.shadows&&high.bloom&&high.pixelRatio===2);
 // Once the actual High pass is observed, stop submitting more frames to
 // software WebGL before capture. Gameplay/clock behaviour was checked live above.
 await page.evaluate(()=>window.advanceTime(1));
 await page.screenshot({path:path.join(out,'mobile-high-option.png'),timeout:90000});
 await page.locator('#vibe-toolbar [data-command=pause]').click();await page.locator('#vibe-pause [data-command=menu]').click();await page.locator('#mode-1v1').click();
 assert.equal(new URL(page.url()).searchParams.get('quality'),'high');
 results.mobile={initial,adaptation,changes,high};await page.close();
 // Software WebGL needs about a minute for the first 2560x1440 shadow/bloom frame; hardware GPUs do not.
 const desktop=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:2});desktop.on('pageerror',e=>errors.push(e.message));await open(desktop,'?mode=1v1',150000);
 await desktop.evaluate(()=>window.advanceTime(1));
 results.desktop=await desktop.evaluate(()=>window.__VIBE_PERFORMANCE__.snapshot());assert.ok(!results.desktop.fast&&results.desktop.bloom&&results.desktop.shadows);await desktop.close();
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'validation.json'),JSON.stringify({results,errors,physicalMobileGPU:false},null,2));console.log('Mobile defaults, adaptive resolution, live HUD, Graphics override and desktop High checks passed.');
}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
