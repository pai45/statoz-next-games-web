import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
// Mouse and keyboard: arcade shell over the rebuilt engine, saves and host lifecycle.
const root=process.cwd(),output=path.join(root,'test-results/open-golf');
await fs.mkdir(output,{recursive:true});
const {chromium}=createRequire(path.join(root,'package.json'))('@playwright/test');
const {buildOpenGolf}=await import('../scripts/build-open-golf.mjs');
const html=await buildOpenGolf({prelude:`<script>window.__STATOZ_HOST__={emit:(type,payload)=>console.log('HOST:'+type,JSON.stringify(payload)),command:null};</script>`});
await fs.writeFile(path.join(output,'mobile-standalone.html'),html);
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<iframe style="position:fixed;inset:0;width:100%;height:100%;border:0" title="Open Golf"></iframe>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']});
const capture=(page,name)=>page.screenshot({path:path.join(output,name+'.png')});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
 await page.addInitScript(()=>{
   Object.defineProperty(window,'SharedArrayBuffer',{value:undefined});
   localStorage.setItem('open-golf.storage',JSON.stringify({seen_tutorial_0:1,seen_tutorial_1:1}));
 });
 page.on('pageerror',e=>{errors.push(e.message);console.log('ERROR',e.stack);});
 page.on('console',m=>{if(m.type()==='error'||m.text().startsWith('HOST'))console.log(m.type(),m.text());});
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.locator('iframe').evaluate((frame,html)=>{frame.srcdoc=html;},html);
 const frame=page.frames()[1];
 const view=()=>frame.evaluate(()=>document.getElementById('og-ui').dataset.view);
 const waitView=(name,timeout=60000)=>frame.waitForFunction(value=>document.getElementById('og-ui').dataset.view===value,name,{timeout});
 const engine=name=>frame.evaluate(fn=>Module['_statoz_golf_'+fn](),name);
 await frame.waitForFunction(()=>typeof Module!=='undefined'&&Module.syncdone===1,null,{timeout:90000});
 assert.equal(await frame.evaluate(()=>crossOriginIsolated),false);
 assert.equal(await frame.evaluate(()=>typeof SharedArrayBuffer),'undefined');
 assert.equal(await frame.evaluate(()=>Module.HEAPU8.buffer.constructor.name),'ArrayBuffer');

 await waitView('select',90000);
 await page.waitForTimeout(1200);
 await capture(page,'select');
 assert.equal(await frame.locator('.og-tile').count(),20);
 assert.equal(await frame.locator('.og-tile[data-state="next"]').count(),1,'only hole 1 is open on a fresh save');
 await frame.locator('.og-tile[data-hole="1"]').click({force:true});
 await page.waitForTimeout(400);
 assert.equal(await view(),'select','a locked hole does not start');
 assert.equal(await engine('state'),1);

 await frame.locator('#og-continue').click();
 await waitView('play');
 await frame.waitForFunction(()=>Module._statoz_golf_game_state()===2,null,{timeout:20000});
 await page.waitForTimeout(400);
 await capture(page,'course');
 assert.equal(await frame.locator('#og-hud-hole').textContent(),'1');

 await page.mouse.move(640,410);await page.mouse.down();await page.waitForTimeout(200);await page.mouse.move(640,580,{steps:15});await page.waitForTimeout(500);
 assert.equal(await frame.locator('#og-power').isVisible(),true,'power meter shows while aiming');
 await capture(page,'aim');
 await page.mouse.up();await page.waitForTimeout(800);
 await capture(page,'shot');
 assert.equal(await engine('strokes'),1);
 assert.equal(await frame.locator('#og-hud-strokes').textContent(),'1');

 await frame.waitForFunction(()=>[2,6].includes(Module._statoz_golf_game_state()),null,{timeout:20000});
 if(await engine('game_state')===2){
  await page.keyboard.press('Escape');
  await waitView('pause');
  assert.equal(await frame.evaluate(()=>document.activeElement?.dataset.action),'resume','pause focuses Resume');
  await capture(page,'pause');
  await page.keyboard.press('Space');
  await waitView('play',5000);
  assert.equal(await engine('game_state'),2,'Space activates the focused shell button');
  await frame.locator('#og-pause-button').click();
  await waitView('pause');
 }
 await frame.locator(await view()==='finish'?'#og-finish-menu':'#og-pause [data-action="menu"]').click();
 await waitView('select');
 assert.equal(await engine('state'),1,'Holes returns to the engine main menu');

 await frame.evaluate(()=>{FS.writeFile('/opengolf_persistent_data/storage.json','{"integration_marker":42}');FS.syncfs(false,error=>{if(error)throw error;});});
 assert.equal(await frame.evaluate(()=>JSON.parse(localStorage.getItem('open-golf.storage')).integration_marker),42);
 await frame.evaluate(()=>window.__STATOZ_HOST__.command('pause'));
 await frame.locator('#og-hostpause').waitFor({state:'visible'});
 await frame.getByRole('button',{name:'RESUME',exact:true}).last().click();
 await frame.locator('#og-hostpause').waitFor({state:'hidden'});
 await frame.evaluate(()=>window.__STATOZ_HOST__.command('dispose'));
 assert.deepEqual(errors,[]);
 console.log('PASS: srcdoc startup without isolation, shell hole select and lock, shot and HUD, keyboard pause, storage, host pause/resume/dispose.');
}finally{await browser.close();server.closeAllConnections();server.close();}
