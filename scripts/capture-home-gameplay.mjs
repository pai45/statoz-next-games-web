// Local-only, silent eight-second captures from the actual game runtimes.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import {chromium} from '@playwright/test';

const origin=process.env.HOME_CAPTURE_ORIGIN||'http://localhost:3200';
const output=path.resolve('public/assets/games/home/gameplay');
const evidence=path.resolve('test-results/home-gameplay');
const ffmpeg=process.env.FFMPEG_PATH||execFileSync('python',['-c','import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'],{encoding:'utf8'}).trim();
await fs.mkdir(output,{recursive:true});await fs.mkdir(evidence,{recursive:true});
const games=['penalty-cup','pitch-rush','pitch-duel','football-chess','cricketer','yorker','hoop-legacy','rim-rush','vibe-basketball','f1-racing','portfolio-formula','grand-prix-dash','open-golf','longbow','holdover'];
const bundled=new Set(['penalty-cup','pitch-rush','cricketer','yorker','hoop-legacy','rim-rush','f1-racing','portfolio-formula','longbow','holdover','open-golf','vibe-basketball']);
const routes={'grand-prix-dash':'rally','f1-racing':'racer'};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=d3d11','--autoplay-policy=no-user-gesture-required']});
const chosen=process.argv.slice(2).filter(x=>!x.startsWith('--'));
try {
 for(const id of chosen.length?chosen:games){
  const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1,serviceWorkers:'block'});
  await context.addInitScript(()=>{
   window.__STATOZ_BOOT__={storageScope:'home-capture',stores:{},resultIds:[]};
   window.StatozGame={postMessage(){}};
   localStorage.setItem('statoz.games.web.auth.v2',JSON.stringify({version:2,authenticated:true,email:'home-capture@example.test'}));
   localStorage.setItem('statoz.games.web.accounts.v1',JSON.stringify({version:1,accounts:{'home-capture@example.test':{onboardingComplete:true}}}));
   localStorage.setItem('statoz.games.web.economy.v1',JSON.stringify({version:1,coins:500,owned:{playerCardIds:[],actionCardIds:[]},starterClaims:{football:{claimedAt:'2026-11-06',playerCardIds:[],actionCardIds:[]}},transactions:[]}));
  });
  const page=await context.newPage();page.setDefaultTimeout(20000);
  try{
   const url=bundled.has(id)?`${origin}/embedded-games/${id}/index.html`:`${origin}/play/${routes[id]||id}`;
   await page.goto(url,{waitUntil:'load',timeout:120000});
   await page.waitForTimeout(1600);
   if(process.argv.includes('--inventory')){
    const frames=[];for(const f of page.frames())frames.push({url:f.url(),buttons:await f.getByRole('button').allTextContents(),canvases:await f.locator('canvas').count(),text:(await f.locator('body').innerText()).slice(0,350)});
    console.log(JSON.stringify({id,frames}));
   }else{
    if(id==='holdover')await page.clock.install();
    await prepare(page,id);
    if(id==='holdover')await page.clock.pauseAt(new Date(Date.now()+200));
    await capture(page,id,url);
   }
  }catch(error){await page.screenshot({path:path.join(evidence,id+'-failure.png')}).catch(()=>{});console.log(JSON.stringify({id,error:String(error),frames:await Promise.all(page.frames().map(async f=>({url:f.url(),text:(await f.locator('body').innerText().catch(()=>'' )).slice(0,1000)})))}));process.exitCode=1;}
  await context.close();
 }
}finally{await browser.close();}

async function prepare(page,id){
 const click=async(name)=>page.getByRole('button',{name,exact:false}).first().click();
 if(id==='hoop-legacy'){const tap=page.getByRole('button',{name:/Tap to start/i});if(await tap.isVisible())await tap.click();await click(/Play Now/i);await click(/^Tip Off$/);await page.waitForTimeout(3500);await page.locator('canvas').first().focus();await page.keyboard.down('w');}
 else if(id==='f1-racing'){await click(/^QUICK RACE/);await page.waitForTimeout(3500);await page.locator('canvas').focus();await page.keyboard.down('w');}
 else if(id==='portfolio-formula'){await click(/Quick Match/);await click(/^Race$|^Start Race$|^RACE NOW$|^Race Now$/i);await page.waitForTimeout(3500);await page.keyboard.down('w');}
 else if(id==='cricketer'){await click(/PLAY FIRST LIGHT/);await page.locator('canvas').focus();}
 else if(id==='yorker'){await click(/PLAY FIRST SPELL/);await page.locator('canvas').focus();}
 else if(id==='longbow'){await click(/PLAY FIRST DRAW/);await page.locator('canvas').focus();}
 else if(id==='rim-rush'){await click(/BROWSE CUPS/);await click(/PLAY QUARTER-FINAL/);await page.waitForTimeout(3500);}
 else if(id==='pitch-rush'){await page.locator('[data-action="quick"]').click();await page.locator('#start').click();const skip=page.locator('[data-action="skip-offer"]');if(await skip.isVisible())await skip.click();await page.keyboard.down('ArrowUp');}
 else if(id==='penalty-cup'){await click(/^Random Game$/);await click(/^Play$/i);}
 else if(id==='holdover'){await page.locator('.nav-item').filter({hasText:'Browse Operations'}).click();await click(/^Deploy$/);const engage=page.getByRole('button',{name:'Engage',exact:true});if(await engage.isVisible())await engage.click({force:true,timeout:1200}).catch(()=>{});await page.keyboard.press('v');}
 else if(id==='vibe-basketball'){await page.locator('#mode-1v1').click();await page.waitForTimeout(3500);await page.keyboard.down('w');}
 else if(id==='open-golf'){await page.locator('#og-continue').click();}
 else if(id==='grand-prix-dash'){await click(/^QUICK START/);const d=page.getByRole('dialog');if(await d.count())await d.getByRole('button',{name:/START STAGE/}).click();await page.waitForFunction(()=>window.__RALLY_DASH_INSPECT__?.autopilot);await page.evaluate(()=>window.__RALLY_DASH_INSPECT__.autopilot(true));await page.waitForTimeout(3500);}
 else if(id==='pitch-duel'){const open=page.locator('[data-pitch-duel-option="debut-open"]');await open.waitFor({timeout:90000});await open.click();await page.locator('[data-pitch-duel-option="debut-skip"]').click();await page.locator('[data-pitch-duel-option="debut-club"]').click();await page.locator('[data-pitch-duel-option="play-match"]').click();await page.locator('[data-pitch-duel-option="kick-off"]').click();}
 else if(id==='football-chess'){await page.locator('[data-action="quick-match"]').click();await page.locator('[data-action="find-rival"]').click();await page.locator('[data-action="kick-off"]').click();}
 await page.waitForTimeout(500);
}

async function capture(page,id,url){
 await Promise.all(page.frames().map(f=>f.addStyleTag({content:'nextjs-portal{display:none!important}'}).catch(()=>{})));
 const dest=path.join(output,id+'.mp4');
 const args=['-y','-hide_banner','-loglevel','error','-f','image2pipe','-vcodec','png','-framerate','12','-i','pipe:0','-an','-vf','scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,eq=contrast=1.06:saturation=1.12','-c:v','libx264','-preset','fast','-crf','25','-pix_fmt','yuv420p','-movflags','+faststart',dest];
 const child=spawn(ffmpeg,args,{stdio:['pipe','ignore','pipe']});let error='';child.stderr.on('data',c=>error+=c);
 const done=new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',code=>code===0?resolve():reject(Error(error)));});
 const start=Date.now();
 for(let i=0;i<96;i++){
  if(id==='holdover')await page.clock.runFor(1000/12);
  await act(page,id,i);
  const bytes=await page.screenshot({type:'png'});
  if(i===0||i===48)await fs.writeFile(path.join(evidence,id+'-'+i+'.png'),bytes);
  if(!child.stdin.write(bytes))await new Promise(resolve=>child.stdin.once('drain',resolve));
  const wait=start+(i+1)*1000/12-Date.now();if(wait>0)await page.waitForTimeout(wait);
 }
 child.stdin.end();await done;
 const bytes=await fs.readFile(dest);
 const record={gameId:id,file:id+'.mp4',durationSeconds:8,width:1280,height:720,fps:12,source:url.replace(origin,''),method:'Actual local game runtime captured with Playwright; silent H.264 with restrained contrast/saturation grading.',sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};
 await fs.writeFile(path.join(output,id+'.json'),JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify(record));
}
async function act(page,id,i){
 if(['cricketer','hoop-legacy'].includes(id)&&i%24===0){await page.keyboard.press(id==='cricketer'?'ArrowRight':'Space');}
 if(id==='longbow'&&i%36===0)await page.keyboard.down('Space');if(id==='longbow'&&i%36===18)await page.keyboard.up('Space');
 if(id==='rim-rush'&&i%30===0){await page.mouse.move(500,350);await page.mouse.down();await page.mouse.move(440,405,{steps:3});await page.mouse.up();}
 if(id==='open-golf'&&i===8){await page.mouse.move(640,410);await page.mouse.down();await page.mouse.move(640,560,{steps:8});await page.mouse.up();}
 if(id==='pitch-rush'&&i%28===0)await page.keyboard.press('x');
 if(id==='yorker'&&i===1){await page.keyboard.press('Space');await page.evaluate(()=>window.__YORKER_INSPECT__.act.releaseAt(.86));}
 if(id==='holdover'&&[12,45,72].includes(i))await page.mouse.click(720+(i%3)*12,395);
 if(id==='football-chess'&&i%3===0){const confirm=page.locator('[data-confirm]');if(await confirm.count())await confirm.click();else {const moves=page.locator('[data-target]');if(await moves.count())await moves.first().click();else {const piece=page.locator('[data-piece][data-live]');if(await piece.count())await piece.first().click();}}}
 if(id==='pitch-duel'&&i%4===0){const next=page.getByRole('button',{name:/^(NEXT|CONTINUE|START SECOND HALF|KICK OFF)$/});if(await next.count())await next.first().click({timeout:1500}).catch(()=>{});else {const option=page.locator('[data-pitch-duel-option]:enabled');if(await option.count())await option.last().click({timeout:1500}).catch(()=>{});}}
 if(id==='penalty-cup'&&[12,60].includes(i)){const shoot=page.getByRole('button',{name:'Hold to shoot',exact:true});if(await shoot.isEnabled().catch(()=>false)){const box=await shoot.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(450);await page.mouse.up();}}
}
