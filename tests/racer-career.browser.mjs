import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';

const out='test-results/racer-career';await fs.mkdir(out,{recursive:true});
const errors=[],checks=[],key='racer.career.progress.v1';
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://127.0.0.1'),file=path.resolve('public','.'+url.pathname);if(!file.startsWith(path.resolve('public')+path.sep))throw Error();
 let bytes=await fs.readFile(file);res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.png')?'image/png':'application/octet-stream');
 if(url.pathname==='/embedded-games/f1-racing/index.html'){
  const account=url.searchParams.get('account')||'a',store='career.browser.'+account;
  const inject=`window.__messages=[];window.__originalStorage=window.localStorage;window.StatozGame={postMessage(raw){const m=JSON.parse(raw);window.__messages.push(m);if(m.type==='save')window.__originalStorage.setItem(${JSON.stringify(store)},JSON.stringify(m.payload));}};window.__STATOZ_BOOT__={...JSON.parse(window.__originalStorage.getItem(${JSON.stringify(store)})||'{}'),sessionId:'career-test',origin:location.origin,storageScope:${JSON.stringify(account.padEnd(24,'x'))},assetRoot:'/games/f1-racing/'};`;
  bytes=Buffer.from(bytes.toString().replace('/*__STATOZ_BOOT__*/',inject));
 }
 res.end(bytes);
}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1280,height:800},hasTouch:true}),page=await context.newPage();
page.on('pageerror',error=>errors.push(error.message));
const snapshot=()=>page.evaluate(()=>window.__RACER_INSPECT__());
const open=async(account='a')=>{await page.goto(`${origin}/embedded-games/f1-racing/index.html?account=${account}`);await page.getByRole('button',{name:'QUICK RACE',exact:false}).waitFor();};
const fit=async(locator)=>{const boxes=await locator.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {label:n.textContent,x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:innerWidth,h:innerHeight};}));for(const b of boxes)assert.ok(b.x>=-1&&b.y>=-1&&b.right<=b.w+1&&b.bottom<=b.h+1,JSON.stringify(b));};
const career=()=>page.getByRole('button',{name:'BROWSE RACES',exact:false}).filter({hasText:/^BROWSE RACES/});
try{
 await open();await career().click();assert.equal(await page.getByRole('button',{name:/^Race \d/}).count(),4);assert.equal(await page.getByRole('button',{name:/^Race 2:/}).isDisabled(),true);
 for(const [width,height] of [[1280,800],[851,393],[667,375],[568,320]]){
  await page.setViewportSize({width,height});
  for(const tier of ['Rookie','Club','Grand Prix']){await page.getByRole('tab',{name:tier,exact:true}).click();await fit(page.locator('[role="dialog"] button'));}
  await page.screenshot({path:`${out}/career-${width}x${height}.png`});
 }
 checks.push('All three four-race tier pages fit desktop and 851x393, 667x375, 568x320 landscape viewports.');
 await page.getByRole('tab',{name:'Rookie',exact:true}).click();await page.getByRole('button',{name:/^Race 1:/}).click();
 await page.waitForFunction(()=>window.__RACER_INSPECT__().render.cars===4);let state=await snapshot();assert.equal(state.gridSize,4);assert.equal(state.laps,1);assert.equal(state.circuit,'starter-oval');assert.equal(state.position,4);
 await page.getByRole('button',{name:'Pause',exact:true}).click();await page.getByRole('button',{name:'BACK TO CAREER',exact:true}).click();
 // Seed legitimate completed-stage records through the account-owned storage interface.
 const records={};for(let i=1;i<=12;i++)records[`race-${i}`]={stars:1,bestPosition:3,bestTime:100+i,attempts:1};
 await page.evaluate(({key,records})=>localStorage.setItem(key,JSON.stringify({schemaVersion:1,records,selected:'race-1'})),{key,records});await open();await career().click();
 const memory=[],switches=[[1,'starter-oval',4,1],[3,'meadow-loop',6,1],[5,'club-circuit',10,2],[7,'ridge-gp',14,2],[12,'silverstone-gp-arcade',20,3],[1,'starter-oval',4,1]];
 for(const [raceNumber,circuit,count,laps] of [...switches,...switches]){
  await page.getByRole('tab',{name:['Rookie','Club','Grand Prix'][Math.floor((raceNumber-1)/4)],exact:true}).click();await page.getByRole('button',{name:new RegExp(`^Race ${raceNumber}:`)}).click();
  await page.waitForFunction(({circuit,count})=>{const s=window.__RACER_INSPECT__();return s.render.circuit===circuit&&s.render.cars===count;},{circuit,count});state=await snapshot();assert.equal(state.opponents.length,count-1);assert.equal(state.laps,laps);assert.equal(await page.locator('canvas').count(),1);memory.push({circuit,...state.render.memory});
  await page.screenshot({path:`${out}/race-${raceNumber}.png`});await page.getByRole('button',{name:'Pause',exact:true}).click();await page.getByRole('button',{name:'BACK TO CAREER',exact:true}).click();
 }
 assert.deepEqual(memory.at(-1),memory[switches.length-1],'Returning to the same circuit must not grow GPU geometry or texture counts');
 checks.push('Repeated switches across all five circuits rebuild the correct grid and lap count without stale cars or WebGL errors.');
 await open('b');assert.deepEqual((await snapshot()).career.records,{});await open('a');assert.equal(Object.keys((await snapshot()).career.records).length,12);
 const invalid='{"schemaVersion":99}';await page.evaluate(({key,invalid})=>localStorage.setItem(key,invalid),{key,invalid});await open('a');await career().click();await page.getByRole('button',{name:/^Race 1:/}).click();assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),invalid);checks.push('Reload restores account-owned progress, another account starts fresh, and future-version saves remain unchanged.');
 await page.getByRole('button',{name:'Pause',exact:true}).click();await page.getByRole('button',{name:'BACK TO CAREER',exact:true}).click();await page.getByRole('button',{name:'Back',exact:true}).click();await fit(page.getByRole('button',{name:/^(BROWSE RACES|START CAREER|QUICK RACE)/}));
 // Real-clock ordinary keyboard driving verifies completion, stars and host events.
 await open('fresh');await page.setViewportSize({width:851,height:393});await page.getByRole('button',{name:'START CAREER',exact:false}).click();await page.locator('canvas').focus();
 await page.evaluate(()=>{
  const angle=n=>((n+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;let last=new Set();
  window.__careerPilot=setInterval(()=>{const s=window.__RACER_INSPECT__(),next=new Set();if(s.status==='racing'){
   const p=s.player,error=angle(Math.atan2(s.aim.x-p.x,s.aim.z-p.z)-p.heading);if(s.countdown<.4)next.add('KeyW');if(error<-.035)next.add('ArrowRight');if(error>.035)next.add('ArrowLeft');if(p.speed>s.cornerSpeed+.8)next.add('ArrowDown');if(!s.countdown&&s.cornerSpeed>45&&s.boost>35)next.add('Space');
  }for(const code of last)if(!next.has(code))dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));for(const code of next)if(!last.has(code))dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true}));last=next;},30);
 });
 await page.waitForFunction(()=>window.__RACER_INSPECT__().finished,{},{timeout:150000});await page.evaluate(()=>clearInterval(window.__careerPilot));state=await snapshot();assert.ok(state.position<=3,`Opening career race should be approachable: P${state.position}`);assert.equal(state.stats.races,0);assert.equal(state.career.records['race-1'].attempts,1);
 for(const [width,height] of [[851,393],[667,375],[568,320]]){await page.setViewportSize({width,height});await fit(page.locator('[role="dialog"] button'));await page.screenshot({path:`${out}/career-result-${width}x${height}.png`});}
 await page.screenshot({path:`${out}/career-result.png`});const result=await page.evaluate(()=>window.__messages.filter(m=>m.type==='result'));assert.equal(result.length,1);assert.equal(result[0].payload.mode,'career');assert.equal(result[0].payload.stageId,'race-1');assert.equal(result[0].payload.laps,1);assert.ok(result[0].payload.stars>0);
 await page.getByRole('button',{name:'NEXT RACE',exact:false}).click();assert.equal((await snapshot()).careerStageId,'race-2');await open('fresh');assert.equal((await snapshot()).career.selected,'race-2');await career().click();assert.equal(await page.getByRole('button',{name:/^Race 2:/}).isEnabled(),true);checks.push('Ordinary-input opening race earns stars once, unlocks race two, emits a career result, and preserves Quick Race records.');
 assert.deepEqual(errors,[]);await fs.writeFile(`${out}/checks.json`,JSON.stringify({checks,errors,memory,physicalDevice:false},null,2));console.log(JSON.stringify({checks,errors}));
}catch(error){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});console.error(await snapshot().catch(()=>null));throw error;}
finally{await context.close();await browser.close();await new Promise(r=>server.close(r));}
