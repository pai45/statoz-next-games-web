import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'test-results/stadium-cricket/mobile-regression');
await fs.mkdir(out,{recursive:true});
const sizes=[[320,568],[360,640],[390,844],[412,915],[430,932],[568,320],[667,375],[844,390],[932,430],[768,1024]];
const browser=await chromium.launch({executablePath:process.env.CRICKET_CHROMIUM||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']});
const errors=[],checks=[];
const geometry=()=>{
 const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height};};
 const controls=Object.fromEntries([...document.querySelectorAll('button,select,input,a')].filter(el=>el.checkVisibility()).map(el=>[el.id||el.textContent.trim(),rect(el)]));
 return {width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,controls,score:rect(document.querySelector('.scoreboard')),dock:rect(document.querySelector('.batting-dock')),tools:rect(document.querySelector('.utility-tray')),commentary:rect(document.querySelector('.commentary'))};
};
const inside=(rect,view,label)=>{assert.ok(rect.x>=-.5&&rect.right<=view.width+.5&&rect.y>=-.5&&rect.bottom<=view.height+.5,label+' outside viewport: '+JSON.stringify(rect));};
const touch=(rect,label)=>assert.ok(rect.w>=43.5&&rect.h>=43.5,label+' has a small touch target: '+JSON.stringify(rect));
const overlaps=(a,b)=>Math.min(a.right,b.right)-Math.max(a.x,b.x)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1;
try{
 const context=await browser.newContext({hasTouch:true,isMobile:true,deviceScaleFactor:1,viewport:{width:390,height:844}});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const email='stadium-mobile@example.test';localStorage.setItem('statoz.games.web.auth.v2',JSON.stringify({version:2,authenticated:true,email}));localStorage.setItem('statoz.games.web.accounts.v1',JSON.stringify({version:1,accounts:{[email]:{onboardingComplete:true}}}));localStorage.setItem('statoz.games.web.bundle.stadium-cricket.stadium-mobile%40example.test',JSON.stringify({schemaVersion:1,stores:{'cm-quality':'low'},resultIds:[]}));});
 await page.goto((process.env.CRICKET_APP_URL||'http://127.0.0.1:3142')+'/play/stadium-cricket',{waitUntil:'domcontentloaded',timeout:120000});
 await page.getByRole('button',{name:'Play Cricket'}).waitFor({timeout:90000});await page.evaluate(()=>document.fonts.ready);
 for(const [width,height]of sizes){
  await page.setViewportSize({width,height});await page.evaluate(()=>scrollTo(0,0));
  const result=await page.getByRole('button',{name:'Play Cricket'}).evaluate(el=>{const r=el.getBoundingClientRect();return {width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,button:{x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height}};});
  assert.equal(result.overflow,false);touch(result.button,'Lobby play');
  await page.screenshot({path:path.join(out,`${width}x${height}-lobby.png`),fullPage:true});
 }
 for(const [width,height]of sizes){
  await page.setViewportSize({width,height});await page.getByText('MATCH SETUP',{exact:true}).click();
  for(const name of ['role','team','opponent','difficulty','overs','target','quality','camera']){
   const field=page.locator('[name="'+name+'"]');await field.scrollIntoViewIfNeeded();
   assert.ok(await field.evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16));
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.getByText('MATCH SETUP',{exact:true}).click();
 }
 let frame;
 for(const role of ['batter','bowler','keeper','fielder'])for(const difficulty of ['club','legend']){
  await page.getByText('MATCH SETUP',{exact:true}).click();await page.locator('[name="role"]').selectOption(role);await page.locator('[name="difficulty"]').selectOption(difficulty);
  await page.getByRole('button',{name:'Play Cricket'}).click();await page.waitForFunction(()=>document.querySelector('iframe')?.contentWindow?.CM?.ready,null,{timeout:90000});
  frame=page.frames().find(f=>f!==page.mainFrame());await frame.waitForFunction(()=>window.CM.snapshot().phase!=='intro');assert.equal(await frame.locator('#intro').isVisible(),false);await frame.locator('#pause').click();
  for(const [width,height]of sizes){
   await page.setViewportSize({width,height});await frame.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const view=await frame.evaluate(geometry);assert.equal(view.overflow,false);inside(view.controls.swing,view,role+' action');touch(view.controls.swing,role+' action');
   for(const id of ['camera','sound','pause','restart','settings','help','quality','ground','loft'])if(view.controls[id]){inside(view.controls[id],view,id);touch(view.controls[id],id);}
   assert.equal(overlaps(view.score,view.dock),false,'Score overlaps actions');assert.equal(overlaps(view.tools,view.dock),false,'Options overlap actions');assert.equal(overlaps(view.commentary,view.dock),false,'Commentary overlaps actions');
   if(role==='batter'&&difficulty==='club')await page.screenshot({path:path.join(out,`${width}x${height}-play.png`)});
   checks.push({role,difficulty,width,height,action:view.controls.swing});
  }
  if(!(role==='fielder'&&difficulty==='legend'))await page.getByRole('button',{name:'← Lobby',exact:true}).click();
 }
 await page.setViewportSize({width:844,height:390});const safeStyle=await page.addStyleTag({content:'main{--stadium-safe-top:20px!important;--stadium-safe-left:30px!important;--stadium-safe-right:30px!important;--stadium-safe-bottom:24px!important}'});
 const safe=await page.locator('iframe').boundingBox();assert.ok(safe.x>=30&&safe.x+safe.width<=814&&safe.y>=20&&safe.y+safe.height<=366);await safeStyle.evaluate(el=>el.remove());
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>{Object.defineProperty(visualViewport,'height',{value:360,configurable:true});visualViewport.dispatchEvent(new Event('resize'));});
 await page.waitForFunction(()=>Math.abs(document.querySelector('iframe').closest('main').getBoundingClientRect().height-360)<1);
 await page.screenshot({path:path.join(out,'keyboard-height.png')});
 await page.evaluate(()=>{delete visualViewport.height;visualViewport.dispatchEvent(new Event('resize'));});
 await page.waitForFunction(()=>Math.abs(document.querySelector('iframe').closest('main').getBoundingClientRect().height-visualViewport.height)<1);
 await page.getByRole('button',{name:'← Lobby',exact:true}).click();assert.equal(page.frames().length,1);assert.deepEqual(errors,[]);
 await fs.writeFile(path.join(out,'validation.json'),JSON.stringify({passed:true,checks,safeAreas:'simulated',keyboardViewport:'simulated',errors},null,2));
 console.log(`PASS: ${sizes.length} viewports; ${checks.length} role/difficulty/rotation checks; setup, safe areas, keyboard viewport, exit.`);
}finally{await browser.close();}
