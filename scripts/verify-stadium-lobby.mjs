import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const out=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../test-results/stadium-cricket/single-lobby');
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']});
const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  if(window!==top)return;
  const email='single-lobby@example.test';
  localStorage.setItem('statoz.games.web.auth.v2',JSON.stringify({version:2,authenticated:true,email}));
  localStorage.setItem('statoz.games.web.accounts.v1',JSON.stringify({version:1,accounts:{[email]:{onboardingComplete:true}}}));
 });
 await page.goto((process.env.CRICKET_APP_URL||'http://127.0.0.1:3142')+'/play/stadium-cricket',{timeout:90000});
 await page.getByRole('button',{name:'Play Cricket',exact:true}).waitFor({timeout:90000});
 await page.screenshot({path:path.join(out,'lobby-desktop.png'),fullPage:true});
 for(const width of [320,412,844]){
  await page.setViewportSize({width,height:width===844?390:915});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.getByText('MATCH SETUP',{exact:true}).click();
  assert.ok(await page.locator('select[name=role]').isVisible());
  assert.ok(await page.locator('select[name=quality]').isVisible());
  assert.ok(await page.locator('input[name=sound]').isVisible());
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(out,`setup-${width}.png`),fullPage:true});
  await page.getByText('MATCH SETUP',{exact:true}).click();
 }
 for(const role of ['batter','bowler','keeper','fielder']){
  await page.getByText('MATCH SETUP',{exact:true}).click();
  await page.locator('select[name=role]').selectOption(role);
  await page.locator('select[name=difficulty]').selectOption('legend');
  await page.locator('input[name=team]').fill('StatOz XI');
  await page.locator('select[name=overs]').selectOption('5');
  await page.locator('input[name=target]').fill('48');
  await page.locator('select[name=quality]').selectOption('low');
  await page.locator('select[name=camera]').selectOption('1');
  await page.locator('input[name=sound]').uncheck();
  await page.getByRole('button',{name:'Play Cricket',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('iframe')?.contentWindow?.CM?.ready,{timeout:90000});
  const frame=page.frames().find(f=>f!==page.mainFrame());
  await frame.waitForFunction(()=>window.CM.snapshot().phase!=='intro');
  const state=await frame.evaluate(()=>window.CM.snapshot());
  assert.equal(state.config.role,role);assert.equal(state.config.difficulty,'legend');assert.equal(state.config.team,'StatOz XI');assert.equal(state.config.overs,5);assert.equal(state.config.target,48);assert.equal(state.quality,'low');
  assert.equal(await frame.locator('#intro').isVisible(),false);
  assert.equal(await frame.locator('.masthead').isVisible(),false);
  assert.equal(await frame.locator('#sound').getAttribute('aria-pressed'),'false');
  assert.match(await frame.locator('#camera').textContent(),/broadcast/);
  if(role==='batter')await page.screenshot({path:path.join(out,'direct-game.png')});
  await page.getByRole('button',{name:'← Lobby',exact:true}).click();
  assert.equal(page.frames().length,1);
  console.log('Direct launch and exit passed: '+role);
 }
 await page.reload();await page.getByText('MATCH SETUP',{exact:true}).click();
 assert.equal(await page.locator('select[name=role]').inputValue(),'fielder');
 assert.equal(await page.locator('select[name=camera]').inputValue(),'1');
 assert.equal(await page.locator('input[name=sound]').isChecked(),false);
 assert.deepEqual(errors,[]);console.log('Passed: responsive setup, four roles, no second lobby, camera, sound, persistence, cleanup.');
}finally{await browser.close();}
