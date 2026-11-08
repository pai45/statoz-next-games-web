import {chromium,expect} from '@playwright/test';
import next from 'next';
import http from 'node:http';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='test-results/penalty-cup-mobile';await fs.mkdir(out,{recursive:true});
const existing=process.env.GAMES_APP_ORIGIN;
const app=existing?null:next({dev:false,dir:process.cwd()});await app?.prepare();
const handler=app?.getRequestHandler(),server=existing?null:http.createServer((req,res)=>handler(req,res));if(server)await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=existing??`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true}),errors=[];let page;
try{
 const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true,serviceWorkers:'block'});
 await context.addInitScript(()=>{
  Object.defineProperty(window,'isSecureContext',{value:false});
  localStorage.setItem('statoz.games.web.auth.v2',JSON.stringify({version:2,authenticated:true,email:'penalty-mobile@example.test'}));
  localStorage.setItem('statoz.games.web.accounts.v1',JSON.stringify({version:1,accounts:{'penalty-mobile@example.test':{onboardingComplete:true}}}));
  localStorage.setItem('statoz.games.web.account-data-owner.v1','penalty-mobile@example.test');
 });
 page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
 const game=()=>page.frames().find(f=>f.url().includes('/embedded-games/penalty-cup/'));
 async function open(){await expect.poll(async()=>{for(const f of page.frames()){const online=f.getByRole('button',{name:'Play online',exact:true});if(await online.isVisible())await online.click();}return !!game()&&await game().getByRole('button',{name:'Penalty Cup',exact:true}).isVisible();},{timeout:60000}).toBe(true);}
 await page.goto(origin+'/play/penalty-cup',{waitUntil:'domcontentloaded',timeout:90000});await open();
 assert.equal(await game().locator('[data-cup-landscape]').evaluate(el=>el.clientWidth>el.clientHeight),true);
 await game().getByRole('button',{name:'Penalty Cup',exact:true}).click();await game().getByRole('button',{name:/Start Cup/}).click();await game().getByRole('button',{name:/Play match/}).waitFor();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('statoz.games.web.bundle.penalty-cup.penalty-mobile%40example.test')));const main=Object.keys(saved.stores).find(k=>/^penalty-cup\.v1\.[^.]+$/.test(k));assert.equal(JSON.parse(saved.stores[main]).version,2);
 await page.reload();await open();await game().getByRole('button',{name:/Continue Cup/}).click();await game().getByRole('button',{name:/Play match/}).waitFor();
 await page.screenshot({path:out+'/app-landscape-restored.png'});
 await page.setViewportSize({width:390,height:844});await page.reload();await open();await game().getByRole('button',{name:/Continue Cup/}).click();await game().getByRole('button',{name:/Play match/}).waitFor();
 assert.equal(await game().locator('[data-cup-landscape]').evaluate(el=>el.clientWidth>el.clientHeight),true);
 await page.screenshot({path:out+'/app-upright-landscape.png'});
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/app-checks.json',JSON.stringify({landscape:true,uprightLandscapeFallback:true,accountSaveV2:true,reload:true,errors},null,2));console.log('Actual app: landscape viewport, upright-phone rotation, account-scoped v2 save and reload passed.');
}catch(error){process.exitCode=1;if(page)await page.screenshot({path:out+'/app-failure.png'}).catch(()=>{});throw error;}
finally{await browser.close();if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}await app?.close();}
