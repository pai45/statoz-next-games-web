import {chromium} from '@playwright/test';
import {build} from 'esbuild';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';

const out='test-results/penalty-cup-mobile';await fs.mkdir(out,{recursive:true});
const html=await fs.readFile('public/embedded-games/penalty-cup/index.html','utf8');
const engine=(await build({stdin:{contents:`import * as e from './src/features/games/penalty-cup/tournament';window.cupEngine=e;`,resolveDir:process.cwd()},bundle:true,write:false,format:'iife',platform:'browser',tsconfig:'tsconfig.json'})).outputFiles[0].text;
const server=http.createServer((req,res)=>{res.setHeader('content-type','text/html');if(req.url.startsWith('/game')){res.end(html);return;}res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><script>window.accounts={a:{},b:{}};window.account='a';window.__STATOZ_BUNDLE_BOOT__=session=>JSON.stringify({sessionId:session,origin:location.origin,storageScope:account,stores:accounts[account],resultIds:[]});addEventListener('message',e=>{if(e.source===frames[0]&&e.data.type==='save')accounts[account]=e.data.payload.stores;});window.reloadCup=()=>document.querySelector('iframe').src='/game?session=test';</script><iframe src="/game?session=test" style="position:fixed;inset:0;width:100%;height:100%;border:0" allow="autoplay;gamepad"></iframe></body></html>`);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true}),errors=[],checks=[];let page;
async function settle(){await page.waitForTimeout(120);}
const frame=()=>page.frames().find(f=>f.url().includes('/game?'));
async function fits(label){
 await frame().locator('[data-cup-landscape]').waitFor();
 await settle();
 const result=await frame().evaluate(()=>{
  const surface=document.querySelector('[data-cup-landscape]'),root=document.querySelector('[data-penalty-cup],[data-cup-match]');
  if(!surface||!root)return {error:'Missing game'};
  const outer=surface.getBoundingClientRect();
  const clipped=[...root.querySelectorAll('button,table,select,[data-screen-content]')].filter(el=>{
   const b=el.getBoundingClientRect();if(!b.width||!b.height)return false;
   return b.left<outer.left-2||b.right>outer.right+2||b.top<outer.top-2||b.bottom>outer.bottom+2;
  }).map(el=>el.getAttribute('aria-label')||el.textContent.slice(0,60));
  const content=root.querySelector('[data-screen-content]');
  return {landscape:surface.clientWidth>=surface.clientHeight,clipped,position:{surfaceX:outer.x,rootX:root.getBoundingClientRect().x,scrollX,documentWidth:document.documentElement.scrollWidth,rootScroll:root.scrollLeft,screen:root.dataset.screen},overflow:content?{x:content.scrollWidth-content.clientWidth,y:content.scrollHeight-content.clientHeight}:null};
 });
 assert.equal(result.landscape,true,label+' landscape');assert.deepEqual(result.clipped,[],label+' clipped '+JSON.stringify(result.position));if(result.overflow){assert.ok(result.overflow.x<=2,label+' horizontal overflow '+result.overflow.x);assert.ok(result.overflow.y<=2,label+' vertical overflow '+result.overflow.y);}checks.push(label);
}
async function loadCup(kind){
 await page.evaluate(kind=>{
  const e=window.cupEngine;let c=e.newCup('ARG',42,'mobile-test');
  const win=()=>{const f=e.currentFixture(c);c=e.acceptResult(e.storePending(c,{id:`${c.id}:${f.id}:${f.attempts}`,score:[5,2],outcome:'win',kicks:[],suddenDeath:false}));};
  if(kind==='knockout')for(let i=0;i<3;i++)win();
  else if(kind==='result'){for(let i=0;i<3;i++)win();const f=e.currentFixture(c);c=e.storePending(c,{id:`${c.id}:${f.id}:${f.attempts}`,score:[2,5],outcome:'loss',kicks:[],suddenDeath:false});}
  else if(kind==='champion')while(c.status==='active')win();
  window.accounts.a['penalty-cup.v1.a']=JSON.stringify({version:2,revision:2,active:c,history:kind==='champion'?[c]:[]});window.reloadCup();
 },kind);
 await frame().getByRole('button',{name:/Continue Cup|Last cup/}).waitFor();
}
try{
 const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,recordVideo:{dir:out+'/video',size:{width:844,height:390}}});
 page=await context.newPage();page.setDefaultTimeout(20000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const origin=`http://127.0.0.1:${server.address().port}`;
 await page.route('**/*',route=>route.request().url().startsWith(origin)||/^(data:|blob:)/.test(route.request().url())?route.continue():route.abort());
 await page.goto(origin);await page.addScriptTag({content:engine});
 for(const [width,height] of [[667,375],[844,390],[852,393],[932,430],[568,280],[844,300],[390,844],[1280,720]]){
  await page.setViewportSize({width,height});await frame().getByRole('button',{name:'Penalty Cup',exact:true}).waitFor();await fits(`home-${width}x${height}`);
  await page.waitForTimeout(500);await page.screenshot({path:`${out}/home-${width}x${height}.png`});
  await frame().getByRole('button',{name:'Controls and settings'}).click();await fits(`settings-${width}x${height}`);await frame().getByRole('button',{name:'Done',exact:true}).click();
  await frame().getByRole('button',{name:'Penalty Cup',exact:true}).click();
  const seen=new Set();
  // Start at the selected nation's page, then walk all six pages.
  while(await frame().getByRole('button',{name:'Previous page',exact:true}).isEnabled())await frame().getByRole('button',{name:'Previous page',exact:true}).click();
  for(let i=0;i<6;i++){
   await fits(`nations-${width}x${height}-${i}`);for(const id of await frame().locator('[data-nation]').evaluateAll(elements=>elements.map(el=>el.dataset.nation)))seen.add(id);
   if(i<5)await frame().getByRole('button',{name:'Next page',exact:true}).click();
  }
  assert.equal(seen.size,48);assert.equal(await frame().getByRole('group',{name:'Difficulty'}).count(),0);
  await page.screenshot({path:`${out}/nations-${width}x${height}.png`});await frame().getByRole('button',{name:'Back',exact:true}).click();
  await loadCup('knockout');await fits(`continued-home-${width}x${height}`);await frame().getByRole('button',{name:/Continue Cup/}).click();await fits(`hub-${width}x${height}`);await page.screenshot({path:`${out}/hub-${width}x${height}.png`});
  await frame().getByRole('button',{name:'Tournament',exact:true}).click();
  for(const tab of ['third','results','bracket']){await frame().getByRole('combobox',{name:'Tournament details'}).selectOption(tab);await fits(`${tab}-${width}x${height}`);}
  await page.screenshot({path:`${out}/bracket-${width}x${height}.png`});
  await loadCup('result');await frame().getByRole('button',{name:/Continue Cup/}).click();await fits(`result-${width}x${height}`);await page.screenshot({path:`${out}/result-${width}x${height}.png`});
  await loadCup('champion');await frame().getByRole('button',{name:/Last cup/}).click();await fits(`champion-${width}x${height}`);await frame().getByRole('button',{name:'Back',exact:true}).click();await frame().getByRole('button',{name:'Cup history',exact:true}).click();await fits(`history-${width}x${height}`);await frame().getByRole('button',{name:'Close',exact:true}).click();
  await page.evaluate(()=>{window.accounts.a={};window.reloadCup();});await frame().getByRole('button',{name:'Penalty Cup',exact:true}).waitFor();
 }
 await page.setViewportSize({width:844,height:390});await loadCup('fresh');await frame().getByRole('button',{name:/Continue Cup/}).click();await frame().getByRole('button',{name:/Play match/}).click();await frame().locator('[data-phase="preparation"]').waitFor({timeout:60000});await fits('live-shooting');await page.screenshot({path:out+'/shooting.png'});
 const stick=await frame().getByRole('group',{name:'AIM virtual stick'}).boundingBox(),shoot=await frame().getByRole('button',{name:'Hold to shoot'}).boundingBox();
 const cdp=await context.newCDPSession(page),aim={id:1,x:stick.x+stick.width*.8,y:stick.y+stick.height*.5},fire={id:2,x:shoot.x+shoot.width/2,y:shoot.y+shoot.height/2};
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[aim]});await page.waitForTimeout(220);
 assert.ok(+(await frame().locator('[data-cup-match]').getAttribute('data-aim-x'))>0);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[aim,fire]});await page.waitForTimeout(220);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await frame().locator('[data-kicks="1"]').waitFor({timeout:20000});
 const saved=await page.evaluate(()=>JSON.parse(window.accounts.a['penalty-cup.v1.a']));assert.equal(saved.active.checkpoint.match.kicks.length,1);
 await page.evaluate(()=>window.reloadCup());await frame().getByRole('button',{name:/Continue Cup/}).click();await frame().getByRole('button',{name:/Resume match/}).click();await frame().locator('[data-kicks="1"][data-role="keeping"]').waitFor({timeout:60000});await fits('resumed-goalkeeping');
 await frame().getByRole('button',{name:'Dive right low',exact:true}).tap();await frame().locator('[data-keeper-motion="LowDive"]').waitFor();await page.screenshot({path:out+'/keeper-push.png'});await page.waitForTimeout(420);await page.screenshot({path:out+'/keeper-stretch.png'});await page.waitForTimeout(2500);await page.screenshot({path:out+'/keeper-recovery.png'});
 await page.evaluate(()=>frames[0].postMessage({protocolVersion:1,gameId:'penalty-cup',sessionId:'test',type:'pause'},location.origin));await frame().getByRole('dialog',{name:'Paused'}).waitFor();await fits('pause');await page.screenshot({path:out+'/pause.png'});await frame().getByRole('button',{name:'Save & exit',exact:true}).click();
 await page.evaluate(()=>{window.account='b';window.reloadCup();});await frame().getByRole('button',{name:'Penalty Cup',exact:true}).waitFor();assert.equal(await frame().getByRole('button',{name:/Continue Cup/}).count(),0);
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/checks.json',JSON.stringify({passed:checks.length,checks,errors,physicalDeviceTested:false,landscapeOnly:true,all48Nations:true,completedPenaltyReload:true,simultaneousTouch:true,accountIsolation:true},null,2));
 console.log(`${checks.length} screen-fit checks passed; touch shooting, goalkeeper animation, checkpoint reload and account isolation passed.`);
 await page.close();await context.close();
}catch(error){if(page&&!page.isClosed())await page.screenshot({path:out+'/failure.png'}).catch(()=>{});await fs.writeFile(out+'/failure.json',JSON.stringify({error:String(error),errors,checks},null,2));throw error;}
finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
