import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium,expect} from '@playwright/test';

const origin=process.argv.find(arg=>arg.startsWith('--url='))?.slice(6)||'http://localhost:3000';
const out=path.resolve('test-results/home-gameplay');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],checked=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin,{waitUntil:'load',timeout:180000});
 const lineup=page.locator('[data-shelf-id="lineup"]');
 await expect.poll(()=>lineup.locator('a[data-game-cover]').count(),{timeout:120000}).toBeGreaterThan(8);
 const games=await lineup.locator('a[data-game-cover]').evaluateAll(links=>links.map(link=>link.dataset.gameCover));
 for(const game of games){
  await lineup.locator(`[data-game-cover="${game}"]`).hover();
  const video=page.locator(`video[data-gameplay-preview="${game}"]`);await video.waitFor();
  await expect.poll(()=>video.evaluate(v=>v.readyState>=2&&v.currentTime>.02),{timeout:60000}).toBe(true);
  const state=await video.evaluate(v=>({duration:v.duration,muted:v.muted,loop:v.loop,inline:v.playsInline,paused:v.paused}));
  assert.ok(state.duration>=5&&state.duration<=10,game+': 5–10 seconds');assert.ok(state.muted&&!state.loop&&state.inline&&!state.paused);
  assert.equal(await page.locator('video').count(),1,'only the selected game decodes video');checked.push(game);
 }
 await lineup.locator('[data-game-cover="pitch-rush"]').hover();
 await page.getByRole('heading',{name:'PITCH RUSH',exact:true}).waitFor();
 const video=page.locator('video');await expect.poll(()=>video.evaluate(v=>v.currentTime>.05)).toBe(true);
 // Seek near each natural ending rather than waiting sixteen seconds per check.
 await video.evaluate(v=>{v.currentTime=v.duration-.1;});
 await expect.poll(()=>video.evaluate(v=>v.currentTime<1&&!v.paused),{timeout:10000}).toBe(true);
 await video.evaluate(v=>{v.currentTime=v.duration-.1;});
 await expect(video).toHaveAttribute('data-preview-complete','true');
 await expect.poll(()=>video.evaluate(v=>v.paused&&getComputedStyle(v).opacity==='0')).toBe(true);
 await page.getByRole('button',{name:'Pause background motion',exact:true}).click();
 await page.getByRole('button',{name:'Play background motion',exact:true}).click();
 assert.equal(await video.evaluate(v=>v.paused),true,'completed previews never restart on pause/resume');
 await lineup.locator('[data-game-cover="hoop-legacy"]').hover();
 await lineup.locator('[data-game-cover="pitch-rush"]').hover();
 await expect.poll(()=>video.evaluate(v=>v.currentTime>.05&&!v.paused)).toBe(true);
 await page.getByRole('button',{name:'Pause background motion',exact:true}).click();
 assert.equal(await video.evaluate(v=>v.paused),true);
 const t=await video.evaluate(v=>v.currentTime);await page.waitForTimeout(200);assert.ok(Math.abs(await video.evaluate(v=>v.currentTime)-t)<.05);
 await page.getByRole('button',{name:'Play background motion',exact:true}).click();
 await expect.poll(()=>video.evaluate(v=>!v.paused)).toBe(true);
 await page.getByRole('navigation',{name:'Primary'}).getByRole('link',{name:'Library',exact:true}).click();
 await page.getByRole('dialog',{name:'Game Library'}).waitFor();await expect.poll(()=>video.evaluate(v=>v.paused)).toBe(true);
 await page.keyboard.press('Escape');
 await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});
 await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
 await page.screenshot({path:path.join(out,'desktop-final.png')});
 await page.evaluate(()=>window.scrollTo(0,1500));await expect.poll(()=>video.evaluate(v=>v.paused)).toBe(true);
 await page.screenshot({path:path.join(out,'scroll-ambient.png')});
 const reduced=await browser.newPage({viewport:{width:1280,height:720},reducedMotion:'reduce'});
 await reduced.goto(origin,{waitUntil:'load',timeout:120000});await reduced.locator('[data-console-dashboard]').waitFor();
 await expect(reduced.locator('video')).toHaveCount(0);
 assert.equal(await reduced.getByRole('button',{name:'Pause background motion'}).isVisible(),false);
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'checks.json'),JSON.stringify({games:checked,twoPassLimit:true,stillImageFade:true,pause:true,libraryPauses:true,offscreenPauses:true,reducedMotion:true,errors},null,2));
 console.log('PASS: '+checked.length+' actual gameplay previews, two-pass limit, still-image fade, single-video loading, pause, Library/offscreen pause and reduced motion');
}finally{await browser.close();}
