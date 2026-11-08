// Real Next app -> catalogue -> account bundle -> native game -> sport-page exit.
import {chromium, expect} from '@playwright/test';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {localGames as games} from './helpers/local-games.mjs';

const origin=process.env.GAMES_APP_ORIGIN||'http://127.0.0.1:3210';
const out='test-results/local-games/app-integration';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.GAMES_CHROMIUM||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const errors=[],failed=[],remote=[],checks=[],expectedFailures=[];
const scope=email=>createHash('sha256').update(email).digest('hex').slice(0,24);
const accountA='app-games-a@example.test',accountB='app-games-b@example.test';

async function context(options={},guest=false){
 // Exercise the existing on-demand choice separately from the full cache test.
 const ctx=await browser.newContext({serviceWorkers:'block',...options});
 await ctx.addInitScript(()=>Object.defineProperty(window,'isSecureContext',{value:false}));
 if(!guest)await ctx.addInitScript(({a,b})=>{
  if(!localStorage.getItem('statoz.games.web.auth.v2'))localStorage.setItem('statoz.games.web.auth.v2',JSON.stringify({version:2,authenticated:true,email:a}));
  if(!localStorage.getItem('statoz.games.web.accounts.v1'))localStorage.setItem('statoz.games.web.accounts.v1',JSON.stringify({version:1,accounts:{[a]:{onboardingComplete:true},[b]:{onboardingComplete:true}}}));
 },{a:accountA,b:accountB});
 return ctx;
}
function monitor(page){
 page.on('pageerror',e=>errors.push({url:page.url(),message:e.message}));
 page.on('response',r=>{if(r.status()>=400&&!expectedFailures.includes(r.url()))failed.push({url:r.url(),status:r.status()});});
 page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(origin+'/'))remote.push(r.url());});
}
async function host(page,id){
 const matches=f=>f.url()==='about:srcdoc'||f.url().includes('/embedded-games/'+id+'/');
 await expect.poll(async()=>{await enterApp(page);return page.frames().some(matches);},{timeout:60000}).toBe(true);
 const frame=page.frames().find(matches);
 await frame.locator(`html[data-game="${id}"]`).waitFor();
 return frame;
}
async function enterApp(page){
 for(const frame of page.frames()){
  if(!frame.url().startsWith(origin))continue;
  const gate=frame.locator('[data-device-assets]');
  if(await gate.count()){
   const online=frame.getByRole('button',{name:'Play online',exact:true});
   if(await online.isVisible())await online.click();
  }
 }
}
async function boot(page,game,{catalogue=false,email=accountA}={}){
 if(catalogue){
  await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
  await expect.poll(async()=>{await enterApp(page);return page.locator('[data-discovery-card]').count();},{timeout:60000}).toBeGreaterThan(0);
  const card=page.locator(`[data-discovery-card="${game.id}"]`).first();
  await card.getByRole('link',{name:'Play '+game.title,exact:true}).click();
  await page.waitForURL('**'+(game.href||'/play/'+game.id));
 }else await page.goto(origin+'/play/'+game.id,{waitUntil:'domcontentloaded'});
 const frame=await host(page,game.id);
 assert.equal(await frame.evaluate(()=>window.__STATOZ_BOOT__.storageScope),scope(email));
 let native=null;
 if(game.host){
  await frame.waitForFunction(game.ready,null,{timeout:30000});
 }else if(game.ready){
  assert.equal(await frame.getByRole('button',{name:/^Play /}).count(),0,'No extra starter screen');
  await expect.poll(()=>page.frames().some(f=>f.url().includes(`/games/${game.id}/`)&&f.url().includes('/index.html')),{timeout:30000}).toBe(true);
  native=page.frames().find(f=>f.url().includes(`/games/${game.id}/`)&&f.url().includes('/index.html'));
  await native.waitForFunction(game.ready,null,{timeout:120000});
  await expect(frame.getByRole('button',{name:'Pause',exact:true})).toBeEnabled();
 }else if(game.id==='football-shooting'){
  await frame.locator('[data-character-source="football-strike"]').waitFor({timeout:60000});
 }else await frame.locator('#console-exit').waitFor();
 return {frame,native};
}
async function exit(page,game,frame){
 const control=game.id==='retro-innings'?frame.locator('#console-exit'):game.id==='football-shooting'?frame.getByRole('button',{name:'Exit Football Shooting',exact:true}):frame.getByRole('button',{name:'Exit',exact:true});
 await control.click();
 await page.waitForURL('**/games/'+game.sport,{timeout:30000});
 await expect.poll(()=>page.frames().filter(f=>f.url()==='about:srcdoc'||f.url().includes('/embedded-games/')).length,{timeout:30000}).toBe(0);
}
let page;
try{
 const desktop=await context({viewport:{width:1280,height:800}});
 page=await desktop.newPage();monitor(page);
 for(const game of games){
  console.log('Checking app catalogue/boot/exit:',game.id);
  const {frame,native}=await boot(page,game,{catalogue:true});
  await page.screenshot({path:`${out}/${game.id}-app.png`});
  if(native){
   const dimensions=await native.evaluate(()=>({width:innerWidth,height:innerHeight}));
   assert.ok(dimensions.width>250&&dimensions.height>200);
  }
  await exit(page,game,frame);
  checks.push(`${game.id}: real catalogue card, correct account scope, original/runtime boot and sport-page exit`);
 }
 // Test a named control preference via the native SDK. Never assign score or inventory.
 const tennis=games.find(g=>g.id==='tennis-bits');
 let session=await boot(page,tennis);
 await session.native.evaluate(()=>TennisLocalPlatform.data.setItem('app-integration-control-preference','left-handed'));
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('statoz.games.web.bundle.tennis-bits.app-games-a%40example.test')?.includes('left-handed'))).toBe(true);
 session=await boot(page,tennis);
 assert.equal(await session.native.evaluate(()=>localStorage.getItem('app-integration-control-preference')),'left-handed');
 await exit(page,tennis,session.frame);
 await page.evaluate(email=>localStorage.setItem('statoz.games.web.auth.v2',JSON.stringify({version:2,authenticated:true,email})),accountB);
 session=await boot(page,tennis,{email:accountB});
 assert.equal(await session.native.evaluate(()=>localStorage.getItem('app-integration-control-preference')),null);
 await exit(page,tennis,session.frame);
 checks.push('Native SDK data survives a real app reload and remains isolated after switching accounts in the same browser storage');
 await desktop.close();

 const phone=await context({viewport:{width:393,height:851},hasTouch:true,isMobile:true,deviceScaleFactor:1});
 page=await phone.newPage();monitor(page);
 for(const id of ['archery-test','soccer-real','tennis-bits']){
  const game=games.find(g=>g.id===id),{frame,native}=await boot(page,game);
  const size=await native.evaluate(()=>({w:innerWidth,h:innerHeight}));
  assert.equal(size.w>size.h,id!=='archery-test');
  await page.screenshot({path:`${out}/${id}-phone.png`});
  await exit(page,game,frame);
  checks.push(`${id}: phone orientation, native viewport and exit through the outer mobile navigation bridge`);
 }
 await phone.close();

 const guest=await context({viewport:{width:1280,height:800}},true);
 page=await guest.newPage();monitor(page);
 const penalty=games.find(g=>g.id==='penalty-shooters-2');
 const guestGame=await boot(page,penalty,{email:'guest'});
 await exit(page,penalty,guestGame.frame);
 checks.push('Guest opens a native local game without a login or starter-pack gate');
 let simulateMissing=true;
 await page.route('**/embedded-games/soccer-real/index.html',route=>{
  if(!simulateMissing)return route.continue();
  expectedFailures.push(route.request().url());
  return route.fulfill({status:503,body:'Deliberate missing-bundle test'});
 });
 await page.goto(origin+'/play/soccer-real',{waitUntil:'domcontentloaded'});
 await expect.poll(async()=>{await enterApp(page);return page.getByRole('button',{name:'Try again',exact:true}).count();},{timeout:60000}).toBeGreaterThan(0);
 await page.getByRole('button',{name:'Try again',exact:true}).waitFor();
 simulateMissing=false;
 await page.getByRole('button',{name:'Try again',exact:true}).click();
 const recovered=await host(page,'soccer-real');
 await expect.poll(()=>page.frames().some(f=>f.url().includes('/games/soccer-real/native/index.html')),{timeout:30000}).toBe(true);
 await page.frames().find(f=>f.url().includes('/games/soccer-real/native/index.html')).waitForFunction(games.find(g=>g.id==='soccer-real').ready,null,{timeout:120000});
 await exit(page,games.find(g=>g.id==='soccer-real'),recovered);
 checks.push('A deliberately unavailable bundle shows a useful error, retries successfully and preserves normal exit');
 await guest.close();
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);assert.deepEqual(remote,[]);
 await fs.writeFile(out+'/checks.json',JSON.stringify({origin,checks,errors,failed,remote,expectedFailures,physicalDevice:false},null,2));
 console.log(JSON.stringify({checks,errors,failed,remote},null,2));
}catch(error){
 await page?.screenshot({path:out+'/failure.png'}).catch(()=>{});
 await fs.writeFile(out+'/failure.json',JSON.stringify({error:error.stack,checks,errors,failed,remote},null,2));
 throw error;
}finally{await browser.close();}
