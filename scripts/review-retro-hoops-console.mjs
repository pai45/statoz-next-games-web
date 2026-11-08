import fs from 'node:fs/promises';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE_PATH?pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href:'playwright');
const root=process.cwd(),out=path.join(root,'test-results',process.argv[2]||'retro-hoops-onscreen-v1');await fs.mkdir(out,{recursive:true});
const bundle=(await fs.readFile('public/embedded-games/retro-hoops/index.html','utf8')).replace('/*__STATOZ_BOOT__*/','window.__STATOZ_BOOT__={sessionId:"onscreen-review",origin:location.origin};');
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(bundle);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}),checks=[],errors=[],origin='http://127.0.0.1:'+server.address().port;
try{
 for(const [width,height]of[[844,390],[915,412],[667,375],[568,320],[1600,720],[1280,720],[390,844]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:width<1000});page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.fullscreenRequests=0;const original=Element.prototype.requestFullscreen;Element.prototype.requestFullscreen=function(...args){fullscreenRequests++;return original.apply(this,args);};});
  await page.goto(origin);
  if(width<height){await page.locator('.retro-rotation').waitFor({state:'visible'});assert.equal(await page.locator('[data-retro-frame]').evaluate(el=>el.inert),true);await page.screenshot({path:path.join(out,'portrait-rotation.png')});checks.push({name:'Portrait pauses and makes game controls inert',passed:true});await page.close();continue;}
  await page.getByRole('button',{name:'Start match',exact:true}).waitFor();await page.screenshot({path:path.join(out,`opening-${width}x${height}.png`)});
  await page.getByRole('button',{name:'Start match',exact:true}).click();await page.waitForTimeout(350);
  const layout=await page.evaluate(()=>{const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};return{width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight,canvas:{...rect(document.querySelector('canvas')),nativeWidth:document.querySelector('canvas').width,nativeHeight:document.querySelector('canvas').height},controls:[...document.querySelectorAll('[data-hoops-stick],button[data-control]')].map(e=>({label:e.getAttribute('aria-label'),...rect(e)})),header:[...document.querySelectorAll('header button')].map(rect),score:rect(document.querySelector('[aria-live="off"]')),legacyArrows:document.querySelectorAll('button[data-control="left"],button[data-control="right"]').length};});
  assert.equal(layout.overflow,false);assert.equal(layout.legacyArrows,0);assert.equal(layout.canvas.width,layout.width);assert.equal(layout.canvas.height,layout.height);
  assert.ok(Math.abs(layout.canvas.nativeWidth/252-width/height)<.003);assert.ok(layout.controls.length===3);
  for(const c of layout.controls){assert.ok(c.width>=44&&c.height>=44);assert.ok(c.x>=0&&c.y>=0&&c.x+c.width<=width+1&&c.y+c.height<=height+1);}
  for(const c of layout.header){assert.ok(c.x+c.width<=layout.score.x+1||c.x>=layout.score.x+layout.score.width-1,'HUD must not overlap utility targets');}
  await page.screenshot({path:path.join(out,`playing-${width}x${height}.png`)});checks.push({name:`Court fills ${width}x${height} with overlay controls and undistorted camera`,passed:true,layout});
  if(width===844){
   const cdp=await page.context().newCDPSession(page),stick=page.locator('[data-hoops-stick]'),r=await stick.boundingBox(),cx=r.x+r.width/2,cy=r.y+r.height/2;
   const a=await page.getByRole('button',{name:'Shoot or block',exact:true}).boundingBox();
   // Action starts first: the joystick must accept a non-primary touch too.
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:2,x:a.x+a.width/2,y:a.y+a.height/2}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:2,x:a.x+a.width/2,y:a.y+a.height/2},{id:1,x:cx+45,y:cy-30}]});
   await page.waitForFunction(()=>Number(document.querySelector('[data-hoops-stick]').dataset.x)>.5);let vector=await stick.evaluate(e=>({x:+e.dataset.x,y:+e.dataset.y}));assert.ok(vector.x>.5&&vector.y<-.3);assert.equal(await page.locator('button[data-held]').count(),1);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:2,x:a.x+a.width/2,y:a.y+a.height/2},{id:1,x:cx-75,y:cy+25}]});
   await page.waitForFunction(()=>Number(document.querySelector('[data-hoops-stick]').dataset.x)<-.8);vector=await stick.evaluate(e=>({x:+e.dataset.x,y:+e.dataset.y}));assert.ok(vector.x<-.8&&vector.y>0);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:2,x:a.x+a.width/2,y:a.y+a.height/2},{id:1,x:cx+2,y:cy+2}]});
   await page.waitForFunction(()=>Number(document.querySelector('[data-hoops-stick]').dataset.x)===0&&Number(document.querySelector('[data-hoops-stick]').dataset.y)===0);vector=await stick.evaluate(e=>({x:+e.dataset.x,y:+e.dataset.y}));assert.deepEqual(vector,{x:0,y:0});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});assert.equal(await page.locator('[data-held]').count(),0);checks.push({name:'Analog diagonals, sliding reversal, dead zone, simultaneous action and cancelled touch',passed:true});
   // Keep a captured pointer outside the disc, then lose focus; no thumb/input may stick.
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:cx+30,y:cy}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:cx+150,y:cy}]});await page.waitForFunction(()=>Number(document.querySelector('[data-hoops-stick]').dataset.x)>.99);assert.ok(Number(await stick.getAttribute('data-x'))>.99);
   await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.getByRole('button',{name:'Resume match',exact:true}).waitFor();assert.equal(await stick.getAttribute('data-x'),'0');assert.equal(await page.locator('[data-held]').count(),0);await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await page.getByRole('button',{name:'Resume match',exact:true}).click();checks.push({name:'Pointer capture and focus loss recenter and clear the joystick',passed:true});
   await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('dialog',{name:'Settings'}).waitFor();await page.getByRole('slider',{name:'Sound volume',exact:true}).focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');assert.equal(await page.getByRole('slider',{name:'Sound volume',exact:true}).inputValue(),'0.05');
   await page.getByRole('checkbox',{name:'Left-handed controls',exact:true}).check();await page.getByRole('button',{name:'Back to game',exact:true}).click();await page.getByRole('button',{name:'Resume match',exact:true}).click();const left=await stick.boundingBox(),right=await page.getByRole('button',{name:'Shoot or block',exact:true}).boundingBox();assert.ok(left.x>right.x);await page.screenshot({path:path.join(out,'left-handed.png')});checks.push({name:'Settings retain native slider keys, pause and swap the joystick/action sides',passed:true});
   const requests=await page.evaluate(()=>fullscreenRequests);assert.ok(requests>=1);if(await page.evaluate(()=>!!document.fullscreenElement))await page.evaluate(()=>document.exitFullscreen());checks.push({name:'Fullscreen requested from gesture; fitted viewport remains after browser exit',passed:true,requests});
   await page.getByRole('button',{name:'Pause',exact:true}).click();const time=await page.locator('b').first().textContent();await page.waitForTimeout(150);assert.equal(await page.locator('b').first().textContent(),time);await page.getByRole('button',{name:'Resume match',exact:true}).click();
   await page.setViewportSize({width:390,height:844});await page.locator('.retro-rotation').waitFor({state:'visible'});await page.setViewportSize({width:844,height:390});await page.getByRole('button',{name:'Resume match',exact:true}).waitFor();checks.push({name:'Rotation pauses and requires explicit resume after returning to landscape',passed:true});
  }
  await page.close();
 }
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'browser-checks.json'),JSON.stringify({checks,errors,physicalDevice:false,renderer:'Headless Chromium / SwiftShader',scope:'Local full-screen overlay layout and pointer lifecycle'},null,2));console.log(JSON.stringify({checks:checks.length,errors}));
}catch(error){await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({checks,errors,error:error.stack},null,2));throw error;}finally{await browser.close();await new Promise(r=>server.close(r));}
