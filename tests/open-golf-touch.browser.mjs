import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
// Touch only: hole select, shot and pause through the arcade shell. --portrait rotates the frame.
const root=process.cwd(),portrait=process.argv.includes('--portrait'),output=path.resolve('test-results/open-golf-touch'+(portrait?'-portrait':''));
await fs.mkdir(output,{recursive:true});
const require=createRequire(path.join(root,'package.json')),{chromium}=require('@playwright/test');
const {buildOpenGolf}=await import(pathToFileURL(path.join(root,'scripts/build-open-golf.mjs')));
const html=await buildOpenGolf({prelude:`<script>window.__STATOZ_HOST__={emit:()=>{},command:null};</script>`});
const point=(x,y)=>portrait?{x:720-y,y:x}:{x,y};
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1">'+(portrait?'<iframe style="position:fixed;top:0;left:0;width:1280px;height:720px;transform-origin:top left;transform:translateX(720px) rotate(90deg);border:0"></iframe>':'<iframe style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>'));});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:portrait?{width:720,height:1280}:{width:1280,height:720},hasTouch:true,isMobile:true,deviceScaleFactor:portrait?2:1}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{Object.defineProperty(window,'SharedArrayBuffer',{value:undefined});localStorage.setItem('open-golf.storage',JSON.stringify({seen_tutorial_0:1,seen_tutorial_1:1}));});
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.locator('iframe').evaluate((element,html)=>{element.srcdoc=html;},html);
 const frame=page.frames()[1];
 const waitView=(name,timeout=60000)=>frame.waitForFunction(value=>document.getElementById('og-ui').dataset.view===value,name,{timeout});
 // Element centres are measured in the frame's own 1280x720 space, then mapped through the rotation.
 const tap=async selector=>{const box=await frame.locator(selector).evaluate(element=>{const r=element.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});const p=point(box.x,box.y);await page.touchscreen.tap(p.x,p.y);};
 await frame.waitForFunction(()=>typeof Module!=='undefined'&&Module.syncdone===1,null,{timeout:90000});
 await waitView('select',90000);
 await page.waitForTimeout(1200);
 await page.screenshot({path:path.join(output,'touch-select.png')});
 await tap('.og-tile[data-hole="0"]');
 await waitView('play');
 await frame.waitForFunction(()=>Module._statoz_golf_game_state()===2,null,{timeout:20000});
 await page.waitForTimeout(300);
 await page.screenshot({path:path.join(output,'touch-course.png')});
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(640,410)]});await page.waitForTimeout(120);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(640,580)]});await page.waitForTimeout(250);
 await page.screenshot({path:path.join(output,'touch-aim.png')});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(700);
 await page.screenshot({path:path.join(output,'touch-shot.png')});
 assert.equal(await frame.evaluate(()=>Module._statoz_golf_strokes()),1,'Touch drag and release hits the ball');
 await frame.waitForFunction(()=>[2,6].includes(Module._statoz_golf_game_state()),null,{timeout:20000});
 if(await frame.evaluate(()=>Module._statoz_golf_game_state())===2){
  await tap('#og-pause-button');
  await waitView('pause');
  await tap('#og-pause [data-action="resume"]');
  await waitView('play',5000);
 }
 assert.deepEqual(errors,[]);console.log('PASS touch-only hole select, drag/release shot and pause without runtime errors');
}finally{await browser.close();server.closeAllConnections();server.close();}
process.exit(0);
