import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile, mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const ids=['retro-football','retro-hoops','retro-circuit','retro-innings'];
const server=createServer(async(req,res)=>{
 try {
  if(req.url.startsWith('/embedded-games/')) {res.setHeader('Content-Type','text/html');res.end(await readFile('public'+req.url));return;}
  res.setHeader('Content-Type','text/html');res.end(`<!doctype html><style>html,body,iframe{width:100%;height:100%;margin:0;border:0;overflow:hidden}</style><iframe allow="fullscreen;autoplay" allowfullscreen></iframe><script>window.messages=[];addEventListener('message',e=>messages.push(e.data));window.launch=async(id,presentation)=>{const html=await(await fetch('/embedded-games/'+id+'/index.html')).text();document.querySelector('iframe').srcdoc=html.replace('/*__STATOZ_BOOT__*/','window.__STATOZ_BOOT__='+JSON.stringify({sessionId:'smoke',origin:location.origin,presentation,stores:{},resultIds:[]})+';');};</script>`);
 }catch(e){res.statusCode=500;res.end(String(e));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
let browser;
try {
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 await mkdir('test-results/retro-presentation',{recursive:true});
 for(const id of ids) {
  const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // Simulate denied browser APIs; layout and play must remain available.
  await page.addInitScript(()=>{window.fullscreenRequests=0;Element.prototype.requestFullscreen=async()=>{window.fullscreenRequests++;throw new DOMException('Test denial','NotAllowedError');};});
  await page.goto(origin);
  await page.evaluate(id=>window.launch(id,{schemaVersion:1,layout:'onscreen',fullscreen:true}),id);
  const frame=page.frameLocator('iframe');
  await frame.locator('[data-retro-frame]').waitFor({timeout:30000});
  await page.waitForTimeout(1500);
  assert.equal(await frame.locator('html').getAttribute('data-retro-layout'),'onscreen');
  assert.deepEqual(await frame.locator('img:visible').evaluateAll(els=>els.filter(el=>!el.complete||!el.naturalWidth).map(el=>el.getAttribute('src'))),[],`${id} visible image loads`);
  if(id==='retro-football') await frame.getByRole('button',{name:'KICK OFF',exact:true}).click();
  if(id==='retro-hoops') await frame.getByRole('button',{name:'Start match',exact:true}).click();
  if(id==='retro-circuit') await frame.getByRole('button',{name:'START RACE',exact:true}).click();
  if(id==='retro-innings') await frame.locator('#lobby-play').click();
  await page.waitForTimeout(800);
  const grips=await frame.locator('[data-retro-grip]').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {side:el.dataset.retroGrip,x:r.x,y:r.y,w:r.width,h:r.height};}));
  for(const g of grips) assert.ok(g.x>=0&&g.y>=0&&g.x+g.w<=845&&g.y+g.h<=391,`${id} grip outside viewport: ${JSON.stringify(g)}`);
  await page.screenshot({path:`test-results/retro-presentation/${id}-onscreen.png`});
  await page.setViewportSize({width:568,height:320});await page.waitForTimeout(200);
  const targets=await frame.locator('[data-retro-grip] button:visible').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {label:el.textContent,x:r.x,y:r.y,w:r.width,h:r.height};}));
  for(const t of targets) assert.ok(t.w>=43&&t.h>=43&&t.x>=0&&t.y>=0&&t.x+t.w<=569&&t.y+t.h<=321,`${id} small phone target: ${JSON.stringify(t)}`);
  await page.screenshot({path:`test-results/retro-presentation/${id}-onscreen-short.png`});
  await page.setViewportSize({width:844,height:390});
  // Cricket intentionally clears holds at delivery boundaries; exercise a stable delivery.
  if(id==='retro-innings') await frame.locator('html').evaluate(()=>{
    window.matchLab.setManual();
    for(let i=0;i<300&&window.matchLab.fixtureState().phase!=='delivery';i++){
      if(['ready','dead'].includes(window.matchLab.fixtureState().phase))window.matchLab.primary();
      window.matchLab.advance(1000/30);
    }
    if(window.matchLab.fixtureState().phase!=='delivery')throw Error('Cricket delivery unavailable for simultaneous touch check');
  });
  const movement=id==='retro-football'?'.direction.right':id==='retro-hoops'?'[aria-label="Move right"]':id==='retro-circuit'?'[data-action="right"]':'#right';
  const action=id==='retro-football'?'.action-A':id==='retro-hoops'?'[aria-label="Shoot or block"]':id==='retro-circuit'?'[data-action="throttle"]':'#nesA';
  const mb=await frame.locator(movement).boundingBox(),ab=await frame.locator(action).boundingBox();
  const cdp=await page.context().newCDPSession(page);
  const points=[{x:mb.x+mb.width/2,y:mb.y+mb.height/2,id:1},{x:ab.x+ab.width/2,y:ab.y+ab.height/2,id:2}];
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});
  await page.waitForTimeout(100);
  const held=await frame.locator(movement).evaluate(el=>el.dataset.pressed==='true'||el.dataset.held==='true'||el.getAttribute('aria-pressed')==='true');
  assert.ok(held,`${id} movement remains held during action touch`);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
  const settings=id==='retro-football'?frame.locator('#menu'):id==='retro-hoops'?frame.getByRole('button',{name:'Settings',exact:true}):id==='retro-circuit'?frame.getByRole('button',{name:'SETTINGS',exact:true}):frame.locator('#console-menu');
  await settings.click();
  const select=frame.getByRole('combobox',{name:'Control layout'}).filter({visible:true});
  await select.selectOption('handheld');
  assert.equal(await frame.locator('html').getAttribute('data-retro-layout'),'handheld');
  await frame.getByRole('checkbox',{name:'Fullscreen by default'}).filter({visible:true}).uncheck();
  await page.waitForFunction(()=>messages.filter(m=>m.type==='presentation').at(-1)?.payload.fullscreen===false);
  const messages=await page.evaluate(()=>messages.filter(m=>m.type==='presentation'));
  assert.deepEqual(messages.at(-1).payload,{schemaVersion:1,layout:'handheld',fullscreen:false});
  await page.screenshot({path:`test-results/retro-presentation/${id}-settings.png`});
  if(id==='retro-football') await frame.getByRole('button',{name:'BACK TO GAME',exact:true}).click();
  if(id==='retro-hoops') await frame.getByRole('button',{name:'Back to game',exact:true}).click();
  if(id==='retro-circuit') await frame.getByRole('button',{name:'BACK',exact:true}).click();
  if(id==='retro-innings') await frame.locator('#console-close').click();
  for(const [width,height,label] of [[844,390,'side'],[568,320,'short'],[1024,768,'tablet'],[1440,900,'desktop']]) {
   await page.setViewportSize({width,height});await page.waitForTimeout(150);
   const box=await frame.locator('[data-retro-display]').boundingBox();assert.ok(box&&box.width>180&&box.height>130,`${id} ${label} display: ${JSON.stringify(box)}`);
   await page.screenshot({path:`test-results/retro-presentation/${id}-${label}.png`});
  }
  await page.setViewportSize({width:390,height:844});
  await frame.locator('.retro-rotation').waitFor({state:'visible'});
  assert.equal(await frame.locator('[data-retro-frame]').evaluate(el=>el.inert),true);
  await page.screenshot({path:`test-results/retro-presentation/${id}-portrait.png`});
  assert.ok(await page.evaluate(()=>window.fullscreenRequests)<=2,`${id} does not loop fullscreen requests`);
  assert.deepEqual(errors,[],`${id} runtime errors`);
  console.log('PASS',id,JSON.stringify(grips));await page.close();
 }
 // Simulate a browser that accepts fullscreen, then a browser-driven Escape exit.
 const page=await browser.newPage({viewport:{width:844,height:390}});
 await page.addInitScript(()=>{
  window.fullscreenRequests=0;
  Object.defineProperty(document,'fullscreenElement',{configurable:true,get(){return this.testFullscreen||null;}});
  Element.prototype.requestFullscreen=async function(){window.fullscreenRequests++;this.ownerDocument.testFullscreen=this;this.ownerDocument.dispatchEvent(new Event('fullscreenchange'));};
  document.exitFullscreen=async()=>{document.testFullscreen=null;document.dispatchEvent(new Event('fullscreenchange'));};
 });
 await page.goto(origin);
 await page.evaluate(()=>window.launch('retro-hoops',{schemaVersion:1,layout:'onscreen',fullscreen:true}));
 const accepted=page.frameLocator('iframe');await accepted.locator('[data-retro-frame]').waitFor();
 await page.waitForFunction(()=>document.fullscreenElement===document.querySelector('iframe'));
 assert.equal(await page.evaluate(()=>window.fullscreenRequests),1);
 await page.evaluate(()=>document.exitFullscreen());
 await accepted.getByRole('button',{name:'Start match',exact:true}).click();
 await accepted.getByRole('button',{name:'Settings',exact:true}).click();
 await accepted.getByRole('combobox',{name:'Control layout'}).filter({visible:true}).selectOption('handheld');
 assert.equal(await page.evaluate(()=>window.fullscreenRequests),1,'layout changes and subsequent play do not re-enter after Escape');
 assert.equal(await page.evaluate(()=>document.fullscreenElement),null);
 await page.close();console.log('PASS fullscreen acceptance and browser exit without automatic re-entry');
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
