import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const base=process.env.RETRO_HOST_URL||'http://127.0.0.1:3149';
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
 const context=await browser.newContext({viewport:{width:844,height:390}});
 await context.addInitScript(()=>{
  if(!localStorage.getItem('statoz.games.web.auth.v2'))localStorage.setItem('statoz.games.web.auth.v2',JSON.stringify({version:2,authenticated:true,email:'retro-a@example.test'}));
  localStorage.setItem('statoz.games.web.accounts.v1',JSON.stringify({'retro-a@example.test':{onboardingComplete:true},'retro-b@example.test':{onboardingComplete:true}}));
 });
 const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const launch=async id=>{
  await page.goto(base+'/play/'+id,{waitUntil:'domcontentloaded'});
  await page.frameLocator('iframe').locator('[data-retro-frame]').waitFor({timeout:90000});
  return page.frameLocator('iframe');
 };
 let frame=await launch('retro-football');
 await frame.locator('.lobby-section-title').getByRole('button',{name:'SETTINGS',exact:true}).click();
 await frame.getByRole('combobox',{name:'Control layout'}).filter({visible:true}).selectOption('handheld');
 await frame.getByRole('checkbox',{name:'Fullscreen by default'}).filter({visible:true}).uncheck();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('statoz.games.web.retro.presentation.retro-a%40example.test')||'null')?.fullscreen===false);
 const a=await page.evaluate(()=>localStorage.getItem('statoz.games.web.retro.presentation.retro-a%40example.test'));
 for(const id of ['retro-hoops','retro-circuit','retro-innings']) {
  frame=await launch(id);
  assert.equal(await frame.locator('html').getAttribute('data-retro-layout'),'handheld');
 }
 await page.evaluate(()=>localStorage.setItem('statoz.games.web.auth.v2',JSON.stringify({version:2,authenticated:true,email:'retro-b@example.test'})));
 frame=await launch('retro-hoops');assert.equal(await frame.locator('html').getAttribute('data-retro-layout'),'onscreen');
 await frame.getByRole('button',{name:'Settings',exact:true}).click();
 assert.equal(await frame.getByRole('checkbox',{name:'Fullscreen by default'}).filter({visible:true}).isChecked(),true);
 await page.evaluate(()=>localStorage.setItem('statoz.games.web.auth.v2',JSON.stringify({version:2,authenticated:true,email:'retro-a@example.test'})));
 frame=await launch('retro-football');assert.equal(await frame.locator('html').getAttribute('data-retro-layout'),'handheld');
 assert.equal(await page.evaluate(()=>localStorage.getItem('statoz.games.web.retro.presentation.retro-a%40example.test')),a);
 // An invalid presentation message must not overwrite saved preferences.
 await frame.locator('html').evaluate(()=>window.__STATOZ_HOST__.emit('presentation',{schemaVersion:1,layout:'bad',fullscreen:true}));
 await page.waitForTimeout(100);
 assert.equal(await page.evaluate(()=>localStorage.getItem('statoz.games.web.retro.presentation.retro-a%40example.test')),a);
 await page.evaluate(()=>localStorage.setItem('statoz.games.web.bundle.retro-hoops.retro-a%40example.test','{bad-json'));
 await page.goto(base+'/play/retro-hoops',{waitUntil:'domcontentloaded'});
 await page.getByRole('alert').filter({hasText:'Saved progress needs a compatible game version'}).waitFor();
 assert.equal(await page.evaluate(()=>localStorage.getItem('statoz.games.web.bundle.retro-hoops.retro-a%40example.test')),'{bad-json');
 await page.evaluate(()=>localStorage.removeItem('statoz.games.web.bundle.retro-hoops.retro-a%40example.test'));
 await context.addInitScript(()=>{
  const read=Storage.prototype.getItem,write=Storage.prototype.setItem;
  Storage.prototype.getItem=function(key){if(key.startsWith('statoz.games.web.retro.presentation.')||key.startsWith('statoz.games.web.bundle.'))throw new DOMException('Test denial','SecurityError');return read.call(this,key);};
  Storage.prototype.setItem=function(key,value){if(key.startsWith('statoz.games.web.retro.presentation.')||key.startsWith('statoz.games.web.bundle.'))throw new DOMException('Test denial','QuotaExceededError');return write.call(this,key,value);};
 });
 frame=await launch('retro-hoops');assert.equal(await frame.locator('html').getAttribute('data-retro-layout'),'onscreen');
 await frame.getByRole('button',{name:'Settings',exact:true}).click();
 await frame.getByRole('combobox',{name:'Control layout'}).filter({visible:true}).selectOption('handheld');
 await page.getByRole('alert').filter({hasText:'Display preferences could not be saved'}).waitFor();
 assert.equal(await frame.locator('html').getAttribute('data-retro-layout'),'handheld','storage denial still permits temporary settings');
 assert.deepEqual(errors,[]);
 console.log('PASS: real host saves one preference across four games, reloads, and account switches; invalid updates are rejected; corrupt saves are preserved and storage denial permits temporary play.');
 await context.close();
} finally {await browser.close();}
