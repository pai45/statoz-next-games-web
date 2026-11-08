import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href);
const out=path.resolve('test-results/retro-hoops-authored-v2'),origin=process.env.HOOPS_REVIEW_URL||'http://127.0.0.1:8942';
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}),checks=[],errors=[];
try{
 for(const [width,height]of [[568,320],[667,375],[844,390],[915,412],[1280,720]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:width<1000});page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/game.html');await page.getByRole('button',{name:'Start match',exact:true}).waitFor();
  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('checkbox',{name:'Left-handed controls',exact:true}).check();await page.getByRole('slider',{name:'Touch size',exact:true}).fill('1.2');
  await page.getByRole('button',{name:'Back to game'}).click();
  const boxes=await page.locator('[data-control]').evaluateAll(elements=>elements.map(e=>{const r=e.getBoundingClientRect();return {control:e.dataset.control,x:r.x,y:r.y,w:r.width,h:r.height};}));
  for(const b of boxes){assert.ok(b.w>=44&&b.h>=44,JSON.stringify(b));assert.ok(b.x>=0&&b.y>=0&&b.x+b.w<=width+1&&b.y+b.h<=height+1,JSON.stringify({width,height,b}));}
  const pad=boxes.find(b=>b.control==='right'),action=boxes.find(b=>b.control==='shoot');assert.ok(pad.x>action.x,'Left-handed mode swaps the grips');
  await page.screenshot({path:path.join(out,`left-handed-${width}x${height}.png`)});checks.push({name:`Left-handed maximum touch size fits ${width}x${height}`,passed:true,boxes});
  if(width===844){
   await page.getByRole('button',{name:'Start match',exact:true}).click();await page.waitForTimeout(1800);
   const frames=await page.evaluate(()=>new Promise(resolve=>{const times=[];let last=performance.now();function sample(t){times.push(t-last);last=t;if(times.length===90)resolve(times);else requestAnimationFrame(sample);}requestAnimationFrame(sample);}));
   const sorted=frames.slice(5).sort((a,b)=>a-b);checks.push({name:'Measured desktop-emulated frame pacing',passed:true,renderer:'Headless Chromium / SwiftShader; not physical mobile',samples:sorted.length,medianMs:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)],target60fpsMet:sorted[Math.floor(sorted.length*.95)]<=17.5});
   await page.screenshot({path:path.join(out,'final-handheld-playing.png')});
   await page.getByRole('button',{name:'Settings',exact:true}).click();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('statoz.games.web.retro-hoops.v1')));assert.equal(saved.settings.leftHanded,true);assert.equal(saved.settings.controlScale,1.2);checks.push({name:'Touch settings persist within the existing archive',passed:true});
  }
  await page.close();
 }
 const failure=await browser.newPage({viewport:{width:844,height:390}});failure.on('pageerror',e=>errors.push(e.message));
 await failure.addInitScript(()=>{window.failAtlas=true;const original=window.fetch.bind(window);window.fetch=(value,options)=>window.failAtlas&&String(value).startsWith('data:image/png')?Promise.reject(Error('Injected atlas failure')):original(value,options);});
 await failure.goto(origin+'/game.html');await failure.getByRole('button',{name:'Retry loading'}).waitFor();await failure.evaluate(()=>window.failAtlas=false);await failure.getByRole('button',{name:'Retry loading'}).click();await failure.getByRole('button',{name:'Start match',exact:true}).waitFor();checks.push({name:'Failed atlas load recovers through cancellable retry',passed:true});await failure.close();
 const page=await browser.newPage({viewport:{width:1400,height:1100}});page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/');await page.waitForFunction(()=>fidelityReview.loaded);
 const scenarios=[];for(const team of ['0','1'])for(const scenario of ['support','loose','shot','footwork','dunk-pass']){await page.locator('#team').selectOption(team);await page.locator('#scenario').selectOption(scenario);await page.evaluate(()=>fidelityReview.advance(120));const s=await page.evaluate(()=>fidelityReview.sample());assert.ok(s.actors.every(a=>Number.isFinite(a.x+a.y+a.z)));scenarios.push({team,scenario,tick:s.tick,poses:s.poses});}
 assert.ok(await page.locator('#sourceVideo').count());await page.locator('#sourceClip').selectOption('113-173');await page.waitForFunction(()=>document.querySelector('#sourceVideo').readyState>=1);await page.locator('#productionSeek').fill('90');await page.locator('#addMarker').click();assert.match(await page.locator('#eventMarkers').textContent(),/90/);checks.push({name:'Both directions and all inspector scenarios, source playback, scrubbing and event markers work',passed:true,scenarios});
 await page.screenshot({path:path.join(out,'source-production-workbench.png'),fullPage:true});await page.close();assert.deepEqual(errors,[]);
 await fs.writeFile(path.join(out,'extended-browser-checks.json'),JSON.stringify({checks,errors,physicalDevice:false},null,2));console.log(JSON.stringify({checks:checks.length,errors}));
}catch(error){await fs.writeFile(path.join(out,'extended-browser-failure.json'),JSON.stringify({checks,errors,error:error.stack},null,2));throw error;}finally{await browser.close();}
