import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {chromium} from '@playwright/test';
const root=process.cwd(),out=path.join(root,'test-results/vibe-basketball'),chrome=process.env.VIBE_CHROMIUM||'C:/Program Files/Google/Chrome/Application/chrome.exe';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.glb':'model/gltf-binary','.txt':'text/plain','.woff2':'font/woff2','.ttf':'font/ttf'};
const server=http.createServer(async(req,res)=>{
 try{
  let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/statoz-games-web(?=\/)/,'');
  if(!path.extname(pathname))pathname=pathname.replace(/\/$/,'')+'/index.html';
  const filename=path.resolve(root,'out','.'+pathname);
  if(!filename.startsWith(path.join(root,'out')+path.sep))throw Error('path');
  res.setHeader('Content-Type',mime[path.extname(filename)]||'application/octet-stream');res.end(await fs.readFile(filename));
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port,base=origin+'/statoz-games-web';
const browser=await chromium.launch({executablePath:chrome,headless:true,args:['--enable-unsafe-swiftshader']});
const report={input:false,host:false,guestGate:false,errorRetry:false,sourceSmoke:false,physicalDevices:false};
try{
 const page=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
 await page.goto(base+'/embedded-games/vibe-basketball/?mode=1v1&lite=1');
 await page.waitForFunction(()=>window.__game&&document.getElementById('loading').classList.contains('done'));
 await page.evaluate(()=>window.advanceTime(1));
 const cdp=await page.context().newCDPSession(page);
 async function press(code,dt=1/60,hold=0){
  const box=await page.locator('[data-key="'+code+'"]').boundingBox();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2,id:7}]});
  await page.waitForFunction(code=>window.__input.keys.has(code),code);
  const during=await page.evaluate(dt=>({...window.__input.poll(null,dt)}),dt);
  if(hold)await page.waitForTimeout(hold);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForFunction(code=>!window.__input.keys.has(code),code);
  const after=await page.evaluate(()=>({...window.__input.poll(null,1/60)}));
  return {during,after};
 }
 const fake=await press('Space');assert.ok(fake.after.shootReleased&&!fake.after.shootReleasedCommitted,'Quick tap remains a fake');
 const shot=await press('Space',1/60,190);assert.ok(shot.after.shootReleasedCommitted,'Held touch remains a committed shot');
 // Directional skill gesture and cancellation coverage lives in verify-vibe-mobile.mjs.
 assert.ok((await press('ShiftLeft')).during.sprint);

 assert.equal((await press('KeyK')).during.dribbleMove,'spin');
 await page.evaluate(()=>{window.__game.offenseIdx=1-window.__game.userPlayer.team;});await page.waitForFunction(()=>document.documentElement.dataset.vibeRole==='defense');assert.ok((await press('ControlLeft')).during.physical);assert.ok((await press('KeyE')).during.stealPressed);
 report.input=true;await page.close();

 const guest=await browser.newPage();await guest.goto(base+'/play/vibe-basketball/');await guest.getByRole('heading',{name:'LOG IN TO PLAY'}).waitFor();report.guestGate=true;await guest.close();
 const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
 await context.addInitScript(()=>{
  localStorage.setItem('statoz.games.web.auth.v2',JSON.stringify({version:2,authenticated:true,email:'vibe-qa@example.test'}));
  localStorage.setItem('statoz.games.web.accounts.v1',JSON.stringify({version:1,accounts:{'vibe-qa@example.test':{onboardingComplete:true}}}));
 });
 const app=await context.newPage(),errors=[];app.on('pageerror',error=>errors.push(error.message));
 await app.goto(base+'/games/basketball/');
 const card=app.getByRole('link',{name:'Play VIBE BASKETBALL',exact:true});await card.waitFor();
 await app.screenshot({path:path.join(out,'app-basketball-library.png')});await card.click();
 const shell=app.frameLocator('iframe[data-mobile-game-frame]'),frame=shell.frameLocator('iframe[title^="Vibe Basketball"]');
 await frame.locator('#mode-menu.show').waitFor({timeout:120000});
 assert.match(await app.locator('meta[name=viewport]').getAttribute('content'),/viewport-fit=cover/,'Game route enables device safe areas');
 await shell.getByRole('heading',{name:'Vibe Basketball',exact:true}).waitFor({state:'hidden'});
 const mobileProfile=await frame.locator('body').evaluate(()=>window.__VIBE_PERFORMANCE__.snapshot());assert.ok(mobileProfile.fast&&!mobileProfile.bloom&&!mobileProfile.shadows&&mobileProfile.pixelRatio<=1,'Normal app launch uses mobile graphics');report.mobilePerformance=true;
 await frame.locator('#mode-1v1').click();await frame.locator('#vibe-shoot').waitFor();
 await frame.locator('#loading.done').waitFor({state:'attached'});await app.waitForTimeout(650);
 await app.screenshot({path:path.join(out,'app-mobile-game.png')});
 const gameElement=shell.locator('iframe[title^="Vibe Basketball"]');
 const landscapeFrame=await gameElement.boundingBox();assert.ok(landscapeFrame.y>=16,'Landscape status bar has reserved space');
 await app.screenshot({path:path.join(out,'app-landscape-safe-area.png')});
 await gameElement.evaluate(frame=>{frame.parentElement.style.padding='20px 18px 24px';});
 const safeFrame=await gameElement.boundingBox();assert.ok(safeFrame.x>=18&&safeFrame.y>=20&&safeFrame.y+safeFrame.height<=366,'Parent safe areas reserve space outside the iframe');
 await app.screenshot({path:path.join(out,'app-mobile-safe-area.png')});
 await gameElement.evaluate(frame=>{frame.parentElement.style.padding='';});
 await app.evaluate(()=>{Object.defineProperty(window.visualViewport,'height',{configurable:true,value:260});window.visualViewport.dispatchEvent(new Event('resize'));});
 await app.waitForFunction(()=>document.querySelector('iframe[data-mobile-game-frame]')?.getBoundingClientRect().height<=260);
 assert.ok((await gameElement.boundingBox()).height<=260,'Visible viewport height constrains the game frame');report.safeAreas=true;report.landscapeStatusBar=true;report.visualViewport=true;
 await app.evaluate(()=>{delete window.visualViewport.height;window.visualViewport.dispatchEvent(new Event('resize'));});
 await app.waitForTimeout(100);if(await frame.locator('#vibe-pause').isVisible())await frame.locator('[data-command=resume]').click();
 await frame.locator('#vibe-toolbar [data-command=pause]').click();await frame.locator('[data-command=resume]').click();
 await frame.locator('#vibe-toolbar').evaluate(()=>parent.postMessage({protocolVersion:1,gameId:'vibe-basketball',sessionId:'wrong-session',type:'exit'},location.origin));
 await app.waitForTimeout(100);assert.ok(app.url().includes('/play/vibe-basketball'),'Rejects wrong-session messages');
 await frame.locator('#vibe-toolbar [data-command=exit]').click();await app.waitForURL('**/games/basketball/**');
 assert.equal(await app.locator('iframe[data-mobile-game-frame]').count(),0,'Exiting releases the landscape host');assert.ok(!app.frames().some(frame=>frame.url().includes('/embedded-games/vibe-basketball/')),'Exiting releases the game frame');
 assert.deepEqual(errors,[]);report.host=true;
 await context.close();
 // A fresh context without service workers makes the network failure deterministic;
 // the normal app context above exercises the actual cache-enabled launch.
 const retryContext=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,serviceWorkers:'block'});
 await retryContext.addInitScript(()=>{
  localStorage.setItem('statoz.games.web.auth.v2',JSON.stringify({version:2,authenticated:true,email:'vibe-qa@example.test'}));
  localStorage.setItem('statoz.games.web.accounts.v1',JSON.stringify({version:1,accounts:{'vibe-qa@example.test':{onboardingComplete:true}}}));
 });
 // Exercise the real online fallback while isolating module failure from downloads.
 await retryContext.route('**/_game-assets/*.json',route=>route.abort());
 let blocked=0;const blockedScript='**/embedded-games/vibe-basketball/game.js*';
 await retryContext.route(blockedScript,route=>{blocked++;return route.abort();});
 const retryApp=await retryContext.newPage();await retryApp.goto(base+'/play/vibe-basketball/');
 await retryApp.getByRole('button',{name:'Play online',exact:true}).click();
 const retryShell=retryApp.frameLocator('iframe[data-mobile-game-frame]');
 await retryShell.getByRole('button',{name:'Play online',exact:true}).click();
 await retryShell.getByRole('button',{name:'Retry',exact:true}).waitFor({timeout:70000});assert.ok(blocked>0,'Failure injection reached the module request');
 await retryContext.unroute(blockedScript);await retryShell.getByRole('button',{name:'Retry',exact:true}).click();
 await retryShell.frameLocator('iframe[title^="Vibe Basketball"]').locator('#mode-menu.show').waitFor({timeout:120000});report.errorRetry=true;await retryContext.close();

 // Keep upstream gameplay assertions. The presentation layer now permits only
 // the explicitly credited local athlete files, never arbitrary model/animation URLs.
 const smoke=await fs.readFile(path.join(root,'src/features/games/vibe-basketball/source/tools/smoke.mjs'),'utf8');
 const adapted=smoke.replace("from 'playwright'",'from '+JSON.stringify(pathToFileURL(path.join(root,'node_modules/@playwright/test/index.mjs')).href))
  .replace(/const port = 5198;[\s\S]*?(?=const waitForServer)/,'const origin = '+JSON.stringify(base+'/embedded-games/vibe-basketball')+'; const server = {kill(){}};\n')
  .replace('await waitForServer();','')
  .replace('headless: !localMac,','headless: true, executablePath: '+JSON.stringify(chrome)+',')
  .replace("args: localMac ? ['--use-angle=metal'] : [],","args: ['--enable-unsafe-swiftshader'],");
 const allowedArt=/\/models\/athletes\/(?:athlete-(?:male|female)\.glb|basketball\.glb|(?:skin|normal)-(?:male|female)\.webp|eyes\.webp)$/;
 const licensedSmoke=adapted.replace('if (assetRequests.length)','if (assetRequests.some(url=>new URL(url).origin!==new URL(origin).origin||!'+allowedArt.toString()+'.test(new URL(url).pathname)))');
 const smokePath=path.join(root,'.cache/vibe-smoke.mjs');await fs.writeFile(smokePath,licensedSmoke);
 await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[smokePath],{cwd:root,stdio:['ignore','pipe','pipe']});let log='';child.stdout.on('data',data=>{log+=data;process.stdout.write(data);});child.stderr.on('data',data=>{log+=data;process.stderr.write(data);});child.on('error',reject);child.on('exit',async code=>{await fs.writeFile(path.join(out,'upstream-smoke.log'),log);if(code===0)resolve();else reject(Error('Upstream smoke failed: '+code));});});
 report.sourceSmoke=true;
 await fs.writeFile(path.join(out,'extra-validation.json'),JSON.stringify(report,null,2));
 console.log('Vibe Basketball input timing, app launch/exit, guest gate, retry and upstream smoke passed.');
}catch(error){
 const frames=[];for(const context of browser.contexts())for(const page of context.pages())for(const frame of page.frames()){
  try{frames.push({url:frame.url(),state:await frame.evaluate(()=>({text:document.body?.innerText.slice(0,2500),hidden:document.hidden,paused:window.__VIBE_HOST__?.paused,profile:window.__VIBE_PERFORMANCE__?.snapshot?.()}))});}catch{}
 }
 await fs.writeFile(path.join(out,'host-failure.json'),JSON.stringify({error:String(error),frames},null,2));throw error;
}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
