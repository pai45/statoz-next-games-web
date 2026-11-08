import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';
import sharp from 'sharp';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'test-results/stadium-cricket');
await fs.mkdir(out,{recursive:true});
const bundle=await fs.readFile(path.join(root,'public/embedded-games/stadium-cricket/index.html'),'utf8');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.json':'application/json'};
const boot={schemaVersion:1,stores:{'cm-quality':'low'},resultIds:[],sessionId:'validation',origin:''};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/hosted.html'){
   res.setHeader('Content-Type','text/html');res.end(bundle.replace('/*__STATOZ_BOOT__*/',()=> 'window.__STATOZ_BOOT__='+JSON.stringify({...boot,origin:'http://127.0.0.1:'+server.address().port})+';'));return;
  }
  const file=path.resolve(root,'vendor/cricketv2','.'+decodeURIComponent(url.pathname.replace(/^\/baseline/,'')));
  if(!file.startsWith(path.join(root,'vendor/cricketv2')+path.sep))throw Error('Invalid path');
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.CRICKET_CHROMIUM||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']});
const report={sourceCommit:'cb19e595d5a00a2764a6a5cb4b20fc48a2a733bc',parity:[],errors:[],checks:[]};
try{
 const capture=await browser.newPage({viewport:{width:1440,height:900}});
 capture.on('pageerror',error=>report.errors.push(error.message));
 await capture.addInitScript(()=>{localStorage.setItem('cm-quality','low');window.requestAnimationFrame=callback=>{window.__renderOnce=callback;return 1;};});
 await capture.goto(origin+'/baseline/index.html');await capture.waitForFunction(()=>window.CM?.ready,{timeout:90000});
 console.log('Source ready; rendering capture');await capture.evaluate(()=>window.__renderOnce(performance.now()));
 await capture.screenshot({path:path.join(out,'original-desktop.png'),timeout:90000});
 await capture.addStyleTag({content:'.masthead,.intro,.scene-shade{visibility:hidden}'});
 await sharp(await capture.locator('#stage').screenshot()).jpeg({quality:90}).toFile(path.join(root,'public/games/stadium-cricket/stadium-preview.jpg'));
 await fs.writeFile(path.join(root,'public/games/stadium-cricket/stadium-preview.provenance.json'),JSON.stringify({schemaVersion:1,kind:'product-capture',approval:'reference',source:'RealOmlit/CricketV2',sourceCommit:report.sourceCommit,capture:'Original imported game, Low preset, 1440x900; no generated artwork.'},null,2)+'\n');
 await capture.close();

 // Run identical original scripts with a controlled random stream and frame clock.
 const pages=[];
 for(const url of ['/baseline/index.html','/hosted.html']){
  console.log('Loading parity baseline: '+url);const page=await browser.newPage();page.on('pageerror',error=>report.errors.push(error.message));
  await page.addInitScript(()=>{
   localStorage.setItem('cm-quality','low');let seed=123456,time=0,next=1;const callbacks=new Map();
   Math.random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
   performance.now=()=>time;window.requestAnimationFrame=callback=>{const id=next++;callbacks.set(id,callback);return id;};window.cancelAnimationFrame=id=>callbacks.delete(id);
   window.__test={seed:value=>{seed=value;},step:(ms=50)=>{time+=ms;const batch=[...callbacks];callbacks.clear();for(const [,callback] of batch)callback(time);},pending:()=>callbacks.size};
  });
  await page.goto(origin+url);await page.waitForFunction(()=>window.CM?.ready,{timeout:90000});
  await page.evaluate(()=>{window.THREE.WebGLRenderer.prototype.render=function(){};document.getElementById('sound').click();});pages.push(page);
 }
 const run=async(page,config)=>page.evaluate(config=>{
  const $=id=>document.getElementById(id),test=window.__test;test.seed(45221);
  $('settings').click();$('playRole').value=config.role;$('difficulty').value=config.difficulty;$('matchOvers').value=String(config.overs);$('matchTarget').value=String(config.target);
  $('settingsForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  const records=[];let previous='',elapsed=0,balls=-1;
  for(let step=0;step<30000;step++){
   const snapshot=window.CM.snapshot();
   if(snapshot.phase!==previous){previous=snapshot.phase;elapsed=0;}
   if(snapshot.balls!==balls){balls=snapshot.balls;const {drawCalls,triangles,...record}=snapshot;void drawCalls;void triangles;records.push(record);}
   if(snapshot.phase==='over')return {records,result:$('resultTitle').textContent,detail:$('resultDetail').textContent};
   if(config.role==='batter'&&snapshot.phase==='delivery'&&elapsed>=snapshot.deliveryDuration*.92){$('loft').click();$('swing').click();}
   if(config.role==='bowler'&&snapshot.phase==='bowl'&&elapsed>=.55)$('swing').click();
   if(['keeper','fielder'].includes(config.role)&&snapshot.phase==='roleplay'&&elapsed>=(config.role==='keeper'?1.35:1.3))$('swing').click();
   test.step();elapsed+=.05;
  }
  throw Error('Innings did not complete: '+JSON.stringify(config));
 },config);
 for(const role of ['batter','bowler','keeper','fielder'])for(const difficulty of ['rookie','club','pro','legend']){
  const config={role,difficulty,overs:2,target:24},a=await run(pages[0],config),b=await run(pages[1],config);
  assert.deepEqual(b,a,'Gameplay drift: '+JSON.stringify(config));report.parity.push({config,balls:a.records.at(-1).balls,result:a.result});console.log('Parity passed: '+role+' / '+difficulty);
 }
 for(const overs of [5,10,20]){const config={role:'batter',difficulty:'club',overs,target:1},a=await run(pages[0],config),b=await run(pages[1],config);assert.deepEqual(b,a);report.parity.push({config,balls:a.records.at(-1).balls,result:a.result});}
 for(const quality of ['low','balanced','high','ultra','cinematic']){await pages[1].evaluate(quality=>{const picker=document.getElementById('quality');picker.value=quality;picker.dispatchEvent(new Event('change'));},quality);assert.equal(await pages[1].evaluate(()=>window.CM.snapshot().quality),quality);}
 await pages[1].evaluate(()=>{document.getElementById('restart').click();window.__test.step();document.getElementById('pause').click();});
 const paused=await pages[1].evaluate(()=>{const before=window.CM.snapshot();for(let i=0;i<20;i++)window.__test.step();return [before,window.CM.snapshot()];});assert.deepEqual(paused[0],paused[1]);
 await pages[1].evaluate(()=>window.__STATOZ_HOST__.command('dispose'));assert.equal(await pages[1].evaluate(()=>window.__test.pending()),0);report.checks.push('all graphics presets','pause freezes state','dispose cancels frame callbacks');
 for(const page of pages)await page.close();

 const app=process.env.CRICKET_APP_URL||'http://127.0.0.1:3142';
 const context=await browser.newContext({viewport:{width:1440,height:960},recordVideo:{dir:path.join(out,'video'),size:{width:1280,height:720}}});
 const page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));
 await page.addInitScript(()=>{
  if(!location.hostname)return;
  const email='stadium-review@example.test';
  if(!localStorage.getItem('statoz.games.web.auth.v2'))localStorage.setItem('statoz.games.web.auth.v2',JSON.stringify({version:2,authenticated:true,email}));
  localStorage.setItem('statoz.games.web.accounts.v1',JSON.stringify({version:1,accounts:{[email]:{onboardingComplete:true},'stadium-other@example.test':{onboardingComplete:true}}}));
 });
 await page.goto(app+'/play/final-over');await page.waitForURL('**/play/stadium-cricket');await page.getByRole('button',{name:'Play Cricket'}).waitFor({timeout:90000});
 await page.screenshot({path:path.join(out,'lobby-desktop.png'),fullPage:true});
 for(const viewport of [{width:412,height:915},{width:844,height:390}]){await page.setViewportSize(viewport);await page.screenshot({path:path.join(out,'lobby-'+viewport.width+'.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await page.setViewportSize({width:1280,height:800});
 await page.getByText('MATCH SETUP',{exact:true}).click();await page.locator('select[name="quality"]').selectOption('low');await page.locator('input[name="target"]').fill('1');
 await page.getByRole('button',{name:'Play Cricket'}).click();const frame=page.frames().find(frame=>frame!==page.mainFrame());
 await frame.waitForFunction(()=>window.CM?.ready,{timeout:90000});await page.getByRole('status').filter({hasText:'Preparing'}).waitFor({state:'hidden'});
 await frame.waitForFunction(()=>window.CM.snapshot().phase!=='intro');assert.equal(await frame.locator('#intro').isVisible(),false);
 // Drive the action through real animation frames for a short complete innings video.
 await frame.evaluate(()=>{
  let previous='',elapsed=0,last=performance.now();const play=now=>{const state=window.CM.snapshot(),dt=Math.min(.05,(now-last)/1000);last=now;if(state.phase!==previous){previous=state.phase;elapsed=0;}if(state.phase==='over'){window.__finished=true;return;}if(state.phase==='delivery'&&elapsed>=state.deliveryDuration*.92){document.getElementById('loft').click();document.getElementById('swing').click();}elapsed+=dt;requestAnimationFrame(play);};requestAnimationFrame(play);
 });
 await frame.waitForFunction(()=>window.__finished,{timeout:150000});await page.screenshot({path:path.join(out,'completed-innings.png')});
 assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('statoz.games.web.bundle.stadium-cricket.stadium-review%40example.test')).stores['cm-match']));
 await page.getByRole('button',{name:'← Lobby',exact:true}).click();assert.equal(page.frames().length,1);
 await page.getByRole('button',{name:'Play Cricket'}).click();const restored=page.frames().find(frame=>frame!==page.mainFrame());await restored.waitForFunction(()=>window.CM?.ready,{timeout:90000});assert.equal(await restored.evaluate(()=>window.CM.snapshot().config.target),1);
 await page.evaluate(()=>{const key='statoz.games.web.auth.v2',value=JSON.stringify({version:2,authenticated:true,email:'stadium-other@example.test'});localStorage.setItem(key,value);window.dispatchEvent(new StorageEvent('storage',{key,newValue:value}));});
 await page.getByRole('button',{name:'Play Cricket'}).waitFor();assert.equal(page.frames().length,1);await page.getByRole('button',{name:'Play Cricket'}).click();await page.waitForFunction(()=>document.querySelector('iframe')?.contentWindow?.CM?.ready);const switched=page.frames().find(frame=>frame!==page.mainFrame());assert.equal(await switched.evaluate(()=>window.CM.snapshot().config.target),24);
 await page.getByRole('button',{name:'← Lobby',exact:true}).click();await page.evaluate(()=>localStorage.setItem('statoz.games.web.bundle.stadium-cricket.stadium-other%40example.test','invalid-save'));await page.getByRole('button',{name:'Play Cricket'}).click();await page.getByRole('alert').filter({hasText:'preserved'}).waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('statoz.games.web.bundle.stadium-cricket.stadium-other%40example.test')),'invalid-save');
 report.checks.push('legacy URL forwards','desktop and mobile lobby overflow','original game inside app','complete short innings','settings reload','account switch remount','invalid save preserved','frame removed on exit');
 await context.close();assert.deepEqual(report.errors,[]);report.passed=true;
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));await fs.writeFile(path.join(out,'validation.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));
