import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const root=process.cwd();
const require=createRequire(path.join(root,'package.json'));
const {chromium}=require('@playwright/test');
const out=path.join(root,'test-results/pitch-rush');await fs.mkdir(out,{recursive:true});
const existing=process.argv.find(a=>a.startsWith('--url='))?.slice(6);
const app=existing?null:require('next')({dev:false,dir:root});await app?.prepare();
const server=existing?null:http.createServer(app.getRequestHandler());
if(server)await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=existing||'http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']});
const evidence=[],errors=[],remote=[];
let currentPage;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function press(frame,selector){
  const page=frame.page(),viewport=page.viewportSize();
  const button=frame.locator(selector);await button.scrollIntoViewIfNeeded();
  if(viewport.height>viewport.width){
    // Use the actual 90-degree viewport transform for a native touch. Mouse
    // clicking nested rotated frames can otherwise hit the adjacent button.
    const point=await button.evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
    const host=await page.locator('iframe[data-mobile-game-frame],iframe[data-mobile-platform-frame]').first().boundingBox();
    await page.touchscreen.tap(host.x+host.width-point.y,host.y+point.x);
  }else await button.click();
}
async function limitDownload(context){
  // Exercise the real download gate for this game's bytes; the host's separate
  // cache suite owns exhaustive downloads of the other games.
  await context.route('**/_game-assets/*.json',async route=>{
    const response=await route.fetch(),manifest=await response.json();
    const files=manifest.files.filter(f=>f.url.includes('/embedded-games/pitch-rush/')||f.url.endsWith('/covers/pitch-rush.webp'));
    assert.equal(files.length,2);
    await route.fulfill({json:{...manifest,files,totalBytes:files.reduce((n,f)=>n+f.bytes,0),revision:createHash('sha256').update(JSON.stringify(files)).digest('hex')}});
  });
}
async function ready(page){
  await page.waitForFunction(()=>!document.querySelector('[data-device-assets]')||document.querySelector('[data-device-assets="error"]'),null,{timeout:90000});
  if(await page.locator('[data-device-assets="error"]').count())throw Error(await page.locator('[data-device-assets="error"]').innerText());
}
async function seed(context,email='pitch-mobile@example.test'){
  await context.addInitScript(email=>{
    localStorage.setItem('statoz.games.web.auth.v2',JSON.stringify({version:2,authenticated:true,email}));
    localStorage.setItem('statoz.games.web.accounts.v1',JSON.stringify({version:1,accounts:{[email]:{onboardingComplete:true}}}));
  },email);
}
async function game(page){
  for(let attempt=0;attempt<120;attempt++){
    for(const frame of page.frames().filter(f=>f.parentFrame())) {
      if(await frame.evaluate(()=>!!window.__game&&document.documentElement.dataset.artState==='ready').catch(()=>false))return frame;
    }
    await delay(500);
  }
  throw Error('Game iframe did not become ready');
}
try{
  console.log('Testing '+origin);
  const guest=await browser.newPage();await limitDownload(guest.context());guest.setDefaultTimeout(30000);guest.on('pageerror',e=>console.log('Guest error: '+e.message));await guest.goto(origin+'/play/pitch-rush',{waitUntil:'domcontentloaded',timeout:120000});await ready(guest);
  console.log('Guest: '+(await guest.locator('body').innerText()).slice(0,250));
  const guestFrame=await game(guest);await guestFrame.locator('[data-action="quick"]').click();await guestFrame.locator('#start').click();await guestFrame.locator('[data-action="skip-offer"]').click();
  await guestFrame.waitForFunction(()=>window.__game.state?.tick>0);
  await guest.screenshot({path:path.join(out,'guest.png')});
  await guest.close();evidence.push('Current guest flow launches Pitch Rush without an account gate');
  for(const size of [{width:1280,height:800,mobile:false},{width:844,height:390,mobile:true},{width:740,height:360,mobile:true},{width:393,height:851,mobile:true},{width:1180,height:820,mobile:true}]){
    console.log('Viewport '+size.width+'×'+size.height);
    const context=await browser.newContext({viewport:{width:size.width,height:size.height},hasTouch:size.mobile,isMobile:size.mobile});await seed(context);
    await limitDownload(context);
    const page=await context.newPage();currentPage=page;page.setDefaultTimeout(30000);page.setDefaultNavigationTimeout(120000);page.on('pageerror',e=>{errors.push(e.message);console.log('Page error: '+e.message);});
    page.on('request',r=>{if(!r.url().startsWith(origin)&&!r.url().startsWith('data:'))remote.push(r.url());});
    await page.goto(origin+'/play/pitch-rush');
    await ready(page);
    const frame=await game(page);console.log('Engine ready');
    await press(frame,'[data-action="quick"]');
    assert.equal(await frame.locator('[data-mode="online"]').isVisible(),false);
    assert.equal(await frame.locator('#duration').inputValue(),size.mobile?'45':'120');
    await page.screenshot({path:path.join(out,`menu-${size.width}.png`)});
    await press(frame,'#start');
    await press(frame,'[data-action="skip-offer"]');
    await frame.waitForFunction(()=>window.__game.state?.tick>10);
    await frame.waitForFunction(()=>window.__game.state.phase==='play',null,{timeout:10000});
    const field=await frame.locator('#game').boundingBox();
    assert.ok(field.width>300&&field.height>280,JSON.stringify({size,field}));
    if(size.mobile){
      assert.ok(await frame.evaluate(()=>{const r=document.getElementById('game').getBoundingClientRect();return r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;}),'The complete canvas must fit inside the mobile viewport');
      const stick=await frame.locator('#stick').boundingBox(),kick=await frame.locator('#btnKick').boundingBox(),defend=await frame.locator('#btnDefend').boundingBox(),swap=await frame.locator('#btnSwap').boundingBox();
      assert.ok(stick.width>=90&&kick.width>=88&&defend.width>=88&&swap.width>=44&&swap.height>=44);
      assert.equal(await frame.locator('#btnKick strong').textContent(),'ATTACK');
      assert.equal(await frame.locator('#btnDefend strong').textContent(),'DEFENCE');
      // Bounding boxes are in the outer page's coordinates. Portrait hosts rotate
      // their inner document, so measure overlap in the game document instead.
      assert.ok(await frame.evaluate(()=>{
        const f=document.getElementById('game').getBoundingClientRect();
        return ['stick','btnKick','btnDefend','btnSwap','btnPause'].every(id=>{
          const c=document.getElementById(id).getBoundingClientRect();return c.right<=f.left+1||c.left>=f.right-1||c.bottom<=f.top||c.top>=f.bottom;
        });
      }),'Touch controls must stay outside the pitch');
      if(size.width===844){
        const cdp=await context.newCDPSession(page);
        const left={x:stick.x+stick.width*.8,y:stick.y+stick.height/2,id:1};
        const right={x:kick.x+kick.width/2,y:kick.y+kick.height/2,id:2};
        const defensive={x:defend.x+defend.width/2,y:defend.y+defend.height/2,id:3};
        const arrange=async owner=>frame.evaluate(owner=>{
          const s=window.__game.state;s.phase='play';
          for(let t=0;t<2;t++)for(let i=0;i<11;i++)Object.assign(s.teams[t].players[i],{x:120+i*20,y:t===0?1000:200,vx:0,vy:0,slide:0,down:0,cooldown:9999,charge:0,charging:false});
          const p=s.teams[0].players[9],r=s.teams[1].players[9];
          Object.assign(p,{x:400,y:850,cooldown:0,dirX:0,dirY:-1});Object.assign(r,{x:420,y:790});
          s.teams[0].controlled=9;s.teams[0].prevMask=0;
          Object.assign(s.ball,{x:owner===0?p.x:r.x,y:owner===0?p.y:r.y,z:0,vx:0,vy:0,vz:0,owner:owner===null?null:{team:owner,idx:9}});
        },owner);
        await arrange(0);
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[left,right]});
        await frame.waitForFunction(()=>{const m=window.__game.transport.devices.touch.mask;return (m&16)&&((m&15)!==0);});
        await frame.waitForFunction(()=>window.__game.state.teams[0].players[9].charging&&window.__game.state.teams[0].players[9].charge>2);
        await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
        await frame.waitForFunction(()=>window.__game.transport.devices.touch.mask===0);
        await frame.waitForFunction(()=>!window.__game.state.teams[0].players[9].charging);
        // Attack cannot turn into a tackle when pressed without possession.
        await arrange(1);
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[right]});
        await delay(120);assert.equal(await frame.evaluate(()=>window.__game.transport.devices.touch.mask&16),0);
        assert.ok(await frame.evaluate(()=>window.__game.state.teams[0].players.every(p=>p.slide===0)));
        await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
        await arrange(1);
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[left,defensive]});
        await frame.waitForFunction(()=>window.__game.state.teams[0].players.some(p=>p.slide>0));
        // Holding Defence through a turnover must not charge an unwanted shot.
        await arrange(0);await delay(100);
        assert.equal(await frame.evaluate(()=>window.__game.transport.devices.touch.mask&16),0);
        assert.ok(await frame.evaluate(()=>window.__game.state.teams[0].players.every(p=>!p.charging)));
        await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[defensive]});
        await delay(100);assert.equal(await frame.evaluate(()=>window.__game.transport.devices.touch.mask&16),0);
        await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
        await frame.waitForFunction(()=>window.__game.transport.devices.touch.mask===0);
        evidence.push('Separate Attack/Defence: charge and release, tackle, simultaneous movement, canceled touches, and no cross-action after a turnover');
      }
      await press(frame,'#btnPause');
    }else{
      await frame.locator('#game').focus();await page.keyboard.press('Escape');
    }
    assert.equal(await frame.evaluate(()=>window.__game.paused),true);
    await page.screenshot({path:path.join(out,`pause-${size.width}.png`)});
    const tick=await frame.evaluate(()=>window.__game.state.tick);await delay(200);assert.equal(await frame.evaluate(()=>window.__game.state.tick),tick);
    await press(frame,'#resume');await frame.waitForFunction(t=>window.__game.state.tick>t,tick);
    // Simulate an interruption while inputs are held; host resumes only by choice.
    await frame.evaluate(()=>{const d=window.__game.transport.devices;d.down.add('KeyW');if(d.touch)d.touch.mask=17;window.dispatchEvent(new Event('blur'));});
    assert.equal(await frame.evaluate(()=>window.__game.paused),true);
    assert.equal(await frame.evaluate(()=>window.__game.transport.devices.mask(0)),0);
    await press(frame,'#resume');
    await page.screenshot({path:path.join(out,`gameplay-${size.width}.png`)});
    // A losing result has no initials dialog: it must still have a touch exit.
    await frame.evaluate(()=>{const s=window.__game.state;s.phase='fulltime';s.score=[0,2];});
    await frame.locator('#endActions:not(.hidden)').waitFor();
    await page.screenshot({path:path.join(out,`results-${size.width}.png`)});
    await press(frame,'#rematch');await frame.waitForFunction(()=>window.__game.state.phase!=='fulltime'&&window.__game.state.tick>0);
    // Winning result retains the source's accessible initials entry.
    await frame.evaluate(()=>{const s=window.__game.state;s.phase='fulltime';s.score=[4,0];});
    await frame.locator('#hiscore:not(.hidden)').waitFor();await press(frame,'#hiscoreOk');await frame.locator('#journey:not(.hidden)').waitFor();
    // The iframe posts its save asynchronously to the host document.
    await page.waitForFunction(()=>{const save=JSON.parse(localStorage.getItem('statoz.games.web.bundle.pitch-rush.pitch-mobile%40example.test')||'null');return !!save?.stores?.['websoccer.highscores.v1'];},null,{timeout:10000});
    const save=await page.evaluate(()=>JSON.parse(localStorage.getItem('statoz.games.web.bundle.pitch-rush.pitch-mobile%40example.test')||'null'));
    assert.ok(save?.stores?.['websoccer.highscores.v1'],'Host stores the earned result under this account');
    if(!size.mobile){
      await press(frame,'[data-action="quick"]');
      await frame.locator('[data-mode="2"]').click();await frame.locator('#start').click();
      assert.deepEqual(await frame.evaluate(()=>window.__game.state.teams.map(t=>t.human)),[true,true]);
      await frame.evaluate(()=>{window.__game.state.phase='fulltime';});
      await frame.locator('#endActions:not(.hidden)').waitFor();await frame.locator('#endMenu').click();
      evidence.push('Local two-player setup and touch-accessible result menu');
    }
    await press(frame,'[data-action="exit"]');
    await page.waitForURL(url=>url.pathname==='/'||url.pathname.endsWith('/games/football')||url.searchParams.get('sport')==='football');
    evidence.push({size,field,checks:['direct route launch','pause/resume','input interruption','loss/rematch','win/initials','account save','exit']});
    await context.close();
  }
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify({passed:true,evidence,errors,remote,physicalDevices:false,audibleOutput:false},null,2));
  console.log(JSON.stringify({passed:true,evidence,errors,remote}));
}catch(error){
  process.exitCode=1;
  console.error(error);console.log('Captured errors:',errors);
  if(currentPage){await currentPage.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});for(const frame of currentPage.frames())console.log('Frame:',frame.url(),(await frame.locator('body').innerText({timeout:3000}).catch(()=>'' )).slice(0,300));}
  throw error;
}finally{
  // Windows Chrome may keep its profile-cleanup process alive after all pages
  // close. Preserve the check result and bound that diagnostic shutdown.
  const shutdown=setTimeout(()=>{console.warn('Browser cleanup timed out; see the recorded check result.');process.exit(process.exitCode??0);},10000);
  await browser.close();server?.close();await app?.close();clearTimeout(shutdown);
}
