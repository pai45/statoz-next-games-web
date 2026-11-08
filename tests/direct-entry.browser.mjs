import {chromium, expect} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {localGames} from './helpers/local-games.mjs';

const origin=process.env.LOCAL_GAMES_ORIGIN||'http://127.0.0.1:5240';
const out='test-results/local-games/direct-entry';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const checks=[];
try {
 for(const phone of [false,true]) {
  const context=await browser.newContext(phone?{viewport:{width:851,height:393},isMobile:true,hasTouch:true}:{viewport:{width:1280,height:800}});
  for(const game of localGames) {
   const page=await context.newPage(),errors=[],remote=[],failed=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(r.status()>=400)failed.push(r.url())});
   await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(origin+'/')||/^(data|blob):/.test(url))return route.continue();remote.push(url);return route.abort()});
   try {
    console.log('Direct entry:',phone?'phone':'desktop',game.id);
    await page.goto(origin+'/embedded-games/'+game.id+'/index.html');
    await expect(page.getByRole('button',{name:/^Play /})).toHaveCount(0);
    await expect.poll(()=>page.frames().some(f=>f.url().includes('/games/'+game.id+'/')),{timeout:30000}).toBe(true);
    const frame=page.frames().find(f=>f.url().includes('/games/'+game.id+'/'));
    await frame.waitForFunction(game.ready,null,{timeout:120000});
    await expect(page.getByRole('button',{name:'Pause',exact:true})).toBeEnabled({timeout:15000});
    await page.screenshot({path:`${out}/${game.id}-${phone?'phone':'desktop'}.png`});
    await page.getByRole('button',{name:'Pause',exact:true}).click();
    const resume=page.getByRole('button',{name:game.id==='f1-racing'?'Resume race':'Resume game',exact:true});
    await expect(resume).toBeVisible();await resume.click();
    await expect(page.getByRole('button',{name:'Pause',exact:true})).toBeEnabled();
    if(['soccer-real','penalty-shooters-2','tennis-bits'].includes(game.id)) {
     const previous=frame.url();
     await page.getByRole('button',{name:'Restart',exact:true}).click();
     await expect.poll(()=>page.frames().some(f=>f.url().includes('/games/'+game.id+'/')&&f.url()!==previous),{timeout:30000}).toBe(true);
     await page.frames().find(f=>f.url().includes('/games/'+game.id+'/')).waitForFunction(game.ready,null,{timeout:120000});
     await expect(page.getByRole('button',{name:/^Play /})).toHaveCount(0);
    }
    assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);assert.deepEqual(failed,[]);
    checks.push({game:game.id,phone,automaticBoot:true,pauseResume:true,errors,remote,failed});
   }catch(e){await page.screenshot({path:`${out}/${game.id}-failure.png`});throw e;}
   finally{await page.close();}
  }
  await context.close();
 }
} finally {
 await fs.writeFile(out+'/checks.json',JSON.stringify({checks,physicalDevice:false},null,2));
 await browser.close();
}
console.log(`${checks.length} automatic desktop/phone launches passed without a starter click.`);
