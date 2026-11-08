import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const root=process.cwd(),out=path.join(root,'test-results/pitch-rush/career');
await fs.mkdir(out,{recursive:true});
const html=await fs.readFile('public/embedded-games/pitch-rush/index.html');
const server=http.createServer(async (req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;if(pathname.startsWith('/game-runtime/')&&!pathname.includes('..')){try{res.setHeader('Content-Type',pathname.endsWith('.js')?'text/javascript':'text/plain');return res.end(await fs.readFile(path.join(root,'public',pathname)));}catch{res.statusCode=404;return res.end();}}res.setHeader('Content-Type','text/html');res.end(html);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']});
const errors=[],remote=[],evidence=[];
let current;
async function boot(context){
  await context.addInitScript(()=>{
    // Emulate the existing native host's boot/save bridge, across real reloads.
    const storage=window.localStorage,account=storage.getItem('pitch.test.account')||'guest';
    window.__nativePitchStorage=storage;
    const saved=JSON.parse(storage.getItem('pitch.test.save.'+account)||'null');
    window.__STATOZ_BOOT__={stores:saved?.stores||{},resultIds:saved?.resultIds||[]};
    window.StatozGame={postMessage(raw){const m=JSON.parse(raw);if(m.type==='save')storage.setItem('pitch.test.save.'+account,JSON.stringify(m.payload));}};
  });
}
async function ready(page){await page.waitForFunction(()=>document.documentElement.dataset.artState==='ready');}
async function action(page,name){
  if(['tab:fixtures','tab:trophies'].includes(name)) {
    if(!(await page.locator('[data-season-view]').count())) await page.locator('[data-action="tab:standings"]').click();
    await page.locator('[data-season-view]').selectOption(name.slice(4));return;
  }
  await page.locator(`[data-action="${name}"]`).click();
}
async function screen(page,name){await page.waitForFunction(name=>window.__pitchRush?.screen===name,name);}
async function shot(page,keys,ms){
  for(const key of keys)await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  for(const key of keys.toReversed())await page.keyboard.up(key);
}
async function nativePass(page,direction){
  await page.keyboard.down(direction);
  await page.waitForFunction(()=>{const g=window.__game,p=g.state.teams[0].players[9],t=window.__pitchRush.tutorial;return Math.hypot(p.x-t.start.x,p.y-t.start.y)>9;});
  await page.keyboard.down('Space');
  await page.waitForFunction(()=>{
    const g=window.__game,p=g.state.teams[0].players[9];
    if(!p.charging)return false;
    // Freeze between native input edges so a busy CI machine cannot turn a tap
    // into a long charged shot while the next browser command is in flight.
    g.paused=true;return true;
  });
  await page.keyboard.up('Space');await page.keyboard.up(direction);
  await page.evaluate(()=>{window.__game.paused=false;});
}
async function finishCareerMatch(page,score=[10,0]){
  await page.waitForFunction(()=>window.__pitchRush.session==='career'&&window.__game.state&&!window.__game.paused);
  await page.evaluate(score=>{window.__game.state.phase='fulltime';window.__game.state.score=score;},score);
  await screen(page,'results');
}
async function bounds(page){
  const problems=await page.evaluate(()=>{
    const panel=document.querySelector('.journeyPanel'),rect=panel.getBoundingClientRect();
    const problems=[];
    if(rect.x<0||rect.y<0||rect.right>innerWidth+1||rect.bottom>innerHeight+1)problems.push('Panel outside viewport');
    for(const el of panel.querySelectorAll('button,tbody tr,.fixtureRow,.cosmeticGrid section,.trophyGrid section')){
      if(!el.getClientRects().length)continue;const r=el.getBoundingClientRect();
      if(r.top<rect.top-1||r.bottom>rect.bottom+1||r.left<rect.left-1||r.right>rect.right+1)problems.push(el.textContent.trim().slice(0,40));
    }
    return problems;
  });assert.deepEqual(problems,[]);
}
try{
  const context=await browser.newContext({viewport:{width:1280,height:800}});await boot(context);
  const page=await context.newPage();current=page;page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(!r.url().startsWith(origin)&&!r.url().startsWith('data:'))remote.push(r.url());});
  await page.goto(origin);await ready(page);await screen(page,'home');
  assert.equal(await page.evaluate(()=>window.__game.state),null);
  await page.screenshot({path:path.join(out,'lobby-desktop.png')});
  // The lobby is usable before onboarding; the tutorial offer is at kick-off.
  await action(page,'career');await screen(page,'career');await action(page,'play-career');await screen(page,'offer');
  await action(page,'begin-tutorial');await screen(page,'tutorial');
  await page.screenshot({path:path.join(out,'tutorial-passing.png')});
  for(const direction of ['d','a']){
    await nativePass(page,direction);
    if(direction==='d')await page.waitForFunction(()=>window.__pitchRush.tutorial.passes===1);
    else await page.waitForFunction(()=>window.__pitchRush.tutorial.success);
  }
  await page.locator('#nextDrill').click();await page.waitForFunction(()=>window.__pitchRush.tutorial.drill===1);
  await page.screenshot({path:path.join(out,'tutorial-defending.png')});
  await shot(page,['w'],190);await shot(page,['w','Space'],40);
  let held=new Set();
  for(let i=0;i<100;i++){
    const state=await page.evaluate(()=>{const g=window.__game,t=window.__pitchRush.tutorial,p=g.state.teams[0].players[g.state.teams[0].controlled],b=g.state.ball;return {done:t.success,dx:b.x-p.x,dy:b.y-p.y};});
    if(state.done)break;
    const wanted=new Set([...(state.dx<-3?['a']:state.dx>3?['d']:[]),...(state.dy<-3?['w']:state.dy>3?['s']:[])]);
    for(const key of held)if(!wanted.has(key))await page.keyboard.up(key);
    for(const key of wanted)if(!held.has(key))await page.keyboard.down(key);
    held=wanted;await page.waitForTimeout(45);
  }
  for(const key of held)await page.keyboard.up(key);
  assert.equal(await page.evaluate(()=>window.__pitchRush.tutorial.success),true);
  await page.locator('#nextDrill').click();await page.waitForFunction(()=>window.__pitchRush.tutorial.drill===2);
  await shot(page,['Space'],800);await page.waitForFunction(()=>window.__pitchRush.tutorial.success);
  await page.screenshot({path:path.join(out,'tutorial-scored.png')});
  await page.locator('#nextDrill').click();await screen(page,'match');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('statoz.pitch-rush.progress.v1')).tutorial.status),'completed');
  evidence.push('First career kick-off: all three drills completed with native keyboard input; actual outcomes; intended career starts afterward');
  await page.waitForFunction(()=>window.__game.state.tick>40);
  await page.evaluate(()=>{window.__game.state.score=[2,1];window.__STATOZ_HOST__.command('pause');});
  await page.evaluate(()=>{window.__realPitchSetItem=localStorage.setItem;localStorage.setItem=()=>{throw new DOMException('Full','QuotaExceededError');};window.__STATOZ_HOST__.command('pause');});
  assert.equal(await page.locator('#saveNotice').isVisible(),true);
  await page.evaluate(()=>{localStorage.setItem=window.__realPitchSetItem;});
  await page.locator('#saveNotice [data-action="save"]').click();
  assert.equal(await page.locator('#saveNotice').isVisible(),false);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('statoz.pitch-rush.progress.v1')).activeMatch);
  assert.equal(saved.state.score[0],2);
  await page.reload();await ready(page);await action(page,'career');await action(page,'play-career');await screen(page,'resume');
  await page.screenshot({path:path.join(out,'resume-match.png')});
  const resumed=await page.evaluate(()=>{document.querySelector('[data-action="resume-match"]').click();return JSON.parse(JSON.stringify(window.__game.state));});
  assert.equal(resumed.tick,saved.state.tick);assert.equal(resumed.rng,saved.state.rng);assert.equal(resumed.halfTick,saved.state.halfTick);assert.deepEqual(resumed.score,saved.state.score);
  await finishCareerMatch(page);
  await page.reload();await ready(page);await action(page,'career');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('statoz.pitch-rush.progress.v1')).career.season.round),1);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('statoz.pitch-rush.progress.v1')).activeMatch),null);
  evidence.push('Reload resumes exact saved clock, score and RNG; reload after full time preserves one committed result; in-match save failure and Retry save recover');
  // Traverse the full UI campaign with controlled final scores. Pure tests cover
  // match simulation separately; this checks integration and every season gate.
  for(let division=0;division<4;division++){
    const start=division===0?1:0;
    for(let match=start;match<5;match++){
      await action(page,'play-career');await finishCareerMatch(page);await action(page,'career');
    }
    if(division===0){
      await action(page,'tab:club');await action(page,'kit-next');await action(page,'equip-kit');
      await action(page,'badge-next');await action(page,'equip-badge');
      await action(page,'tab:overview');
    }
    if(division<3){
      await action(page,'next-season');
      if(division===0){
        await action(page,'play-career');
        assert.deepEqual(await page.evaluate(()=>window.__game.state.cosmetics),{kit:'regional',badge:1});
        await page.evaluate(()=>window.__STATOZ_HOST__.command('pause'));
        const bluePixels=async()=>{const sharp=(await import('sharp')).default;const {data,info}=await sharp(await page.locator('#game').screenshot()).raw().toBuffer({resolveWithObject:true});let n=0;for(let i=0;i<data.length;i+=info.channels)if(data[i+2]>data[i]+24&&data[i+2]>data[i+1]*1.05)n++;return n;};
        await page.waitForTimeout(80);const creamCount=await bluePixels();
        await page.evaluate(()=>{window.__game.state.cosmetics.kit='blue';});await page.waitForTimeout(80);const blueCount=await bluePixels();
        assert.ok(blueCount>creamCount+100,'Equipped kit must visibly recolour player cloth on the actual match canvas');
        await page.evaluate(()=>{window.__game.state.cosmetics.kit='regional';});
        await page.locator('#resume').click();await page.waitForTimeout(50);
        await page.screenshot({path:path.join(out,'equipped-regional-kit.png')});
        await page.evaluate(()=>window.__STATOZ_HOST__.command('pause'));await page.locator('#quit').click();
        await action(page,'career');await action(page,'play-career');await action(page,'resume-match');
        await finishCareerMatch(page);await action(page,'career');
        // One Regional match was used to check equipped cosmetics and Save & lobby.
        for(let match=1;match<5;match++){await action(page,'play-career');await finishCareerMatch(page);await action(page,'career');}
        division=1;
        await action(page,'next-season');
      }
    }
  }
  const career=await page.evaluate(()=>JSON.parse(localStorage.getItem('statoz.pitch-rush.progress.v1')).career);
  assert.equal(career.champion,true);assert.deepEqual(career.trophies,[1,1,1,1]);assert.equal(career.unlocked,4);
  await page.screenshot({path:path.join(out,'premier-champions.png')});
  await action(page,'tab:trophies');await page.screenshot({path:path.join(out,'trophy-cabinet.png')});
  await action(page,'history-next');assert.match(await page.locator('#journeyBody').innerText(),/Season 4/);
  evidence.push('Full four-division UI climb, earned cosmetics visible in match state, save-to-lobby, trophy cabinet and season history');
  await page.evaluate(()=>window.__nativePitchStorage.setItem('pitch.test.account','second-account'));
  await page.reload();await ready(page);assert.match(await page.locator('#journeyBody').innerText(),/Start career/);
  await page.evaluate(()=>{
    window.__menuPad={axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false}))};
    Object.defineProperty(navigator,'getGamepads',{value:()=>[window.__menuPad]});
    document.querySelector('[data-action="career"]').focus();window.__menuPad.axes[0]=1;
  });
  await page.waitForFunction(()=>document.activeElement?.dataset.action==='quick');
  await page.evaluate(()=>{window.__menuPad.axes[0]=0;});await page.waitForTimeout(70);
  await page.evaluate(()=>{window.__menuPad.buttons[0].pressed=true;});await screen(page,'setup');
  await page.evaluate(()=>{window.__menuPad.buttons[0].pressed=false;});await page.waitForTimeout(70);
  await page.evaluate(()=>{window.__menuPad.buttons[1].pressed=true;});await screen(page,'home');
  await page.evaluate(()=>{window.__menuPad.buttons[1].pressed=false;});await page.waitForTimeout(70);
  await action(page,'quick');await page.locator('#start').click();await screen(page,'offer');
  await action(page,'begin-tutorial');await screen(page,'tutorial');await page.reload();await ready(page);
  await action(page,'quick');await page.locator('#start').click();await screen(page,'offer');
  const heldStart=await page.evaluate(()=>{
    window.__menuPad={axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false}))};
    Object.defineProperty(navigator,'getGamepads',{value:()=>[window.__menuPad]});
    window.__menuPad.buttons[0].pressed=true;document.querySelector('[data-action="skip-offer"]').click();
    const s=window.__game.state,p=s.teams[0].players[9];s.phase='play';s.phaseTimer=0;s.teams[0].controlled=9;
    Object.assign(s.ball,{x:p.x,y:p.y,z:0,owner:{team:0,idx:9},protectedFor:null});return s.tick;
  });
  await screen(page,'match');await page.waitForFunction(tick=>window.__game.state.tick>tick+4,heldStart);
  assert.equal(await page.evaluate(()=>window.__game.state.teams[0].players.some(p=>p.charging)),false,'Held gamepad confirm must not become a shot');
  await page.evaluate(()=>{window.__menuPad.buttons[0].pressed=false;});
  await page.evaluate(()=>window.__STATOZ_HOST__.command('pause'));await page.locator('#quit').click();
  await action(page,'training');await action(page,'drill:1');await screen(page,'tutorial');assert.equal(await page.evaluate(()=>window.__pitchRush.tutorial.drill),1);
  await page.locator('#skipTraining').click();await page.locator('#journeyBack').click();
  await action(page,'quick');await page.locator('[data-mode="2"]').click();await page.locator('#start').click();await screen(page,'match');
  assert.deepEqual(await page.evaluate(()=>window.__game.state.teams.map(t=>t.human)),[true,true]);
  evidence.push('Separate account begins fresh; simulated gamepad menu navigation works; interrupted onboarding remains available; skip persists; individual replay and local two-player Quick Match remain available');
  await context.close();

  for(const size of [{width:844,height:390},{width:740,height:360},{width:667,height:375},{width:1180,height:820}]){
    const context=await browser.newContext({viewport:size,hasTouch:true,isMobile:true});await boot(context);
    const page=await context.newPage();current=page;page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin);await ready(page);await bounds(page);
    await page.screenshot({path:path.join(out,`lobby-${size.width}.png`)});
    await action(page,'career');await bounds(page);
    for(const tab of ['standings','fixtures','standings','trophies','club','overview']){await action(page,'tab:'+tab);await bounds(page);await page.screenshot({path:path.join(out,`${tab}-${size.width}.png`)});}
    await action(page,'play-career');await action(page,'skip-offer');await screen(page,'match');
    await page.waitForFunction(()=>window.__game.state.tick>0);
    await page.locator('#btnPause').tap();await page.locator('#quit').tap();
    await action(page,'training');await bounds(page);await action(page,'drill:0');
    await page.screenshot({path:path.join(out,`tutorial-${size.width}.png`)});
    // Native simultaneous joystick and action touches in the actual drill.
    const cdp=await context.newCDPSession(page),stick=await page.locator('#stick').boundingBox(),attack=await page.locator('#btnKick').boundingBox();
    const move={x:stick.x+stick.width-10,y:stick.y+stick.height/2,id:1},fire={x:attack.x+attack.width/2,y:attack.y+attack.height/2,id:2};
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[move]});await page.waitForTimeout(180);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[move,fire]});
    await page.waitForFunction(()=>window.__game.state.teams[0].players[9].charging);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[move]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForFunction(()=>window.__pitchRush.tutorial.passes===1);
    await page.locator('#btnPause').tap();const tick=await page.evaluate(()=>window.__game.state.tick);
    await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.__game.state.tick),tick);
    await page.locator('#resume').tap();
    evidence.push({size,checks:['all career views contained','training contained','native simultaneous touch pass','pause/resume']});
    await context.close();
  }
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify({passed:true,evidence,errors,remote},null,2));
  console.log(JSON.stringify({passed:true,evidence,errors,remote}));
}catch(error){process.exitCode=1;console.error(error);if(current&&!current.isClosed()){await current.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});console.error((await current.locator('body').innerText().catch(()=>'' )).slice(0,1600));}console.error(errors);}
finally{server.close();const shutdown=setTimeout(()=>process.exit(process.exitCode||0),10000);await browser.close();clearTimeout(shutdown);}
