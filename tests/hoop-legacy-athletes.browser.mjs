import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {chromium} from '@playwright/test';

const assetRoot=path.resolve('public/embedded-games/hoop-legacy');
const source=await fs.readFile(path.join(assetRoot,'index.html'),'utf8');
const output='test-results/hoop-legacy-athletes';await fs.mkdir(output,{recursive:true});
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://local');
  if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
  if(url.pathname==='/') {
    const quality=url.searchParams.get('quality')||'medium';
    const boot={sessionId:'athlete-runtime-'+quality,stores:{'hoop-legacy:settings':JSON.stringify({quality,resolution:.75,music:0,crowd:0,commentary:0})}};
    res.writeHead(200,{'content-type':'text/html'});res.end(source.replace('/*__STATOZ_BOOT__*/','window.__STATOZ_BOOT__='+JSON.stringify(boot)+';'));return;
  }
  const file=path.resolve(assetRoot,'.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(assetRoot+path.sep)){res.writeHead(403);res.end();return;}
  try{const bytes=await fs.readFile(file);res.writeHead(200,{'content-type':({'.json':'application/json','.glb':'model/gltf-binary','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream'});res.end(bytes);}catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],reports={};
const state=page=>page.evaluate(()=>window.__HOOP_LEGACY__());
const boundsSamples=[];
async function checkBounds(page,label) {
  const snapshot=await page.evaluate(()=>window.__HOOP_LEGACY__({geometry:true}));
  for(const b of snapshot.athletes.bounds){assert.ok(b.finite,label+' finite skinned vertices');assert.ok(Math.max(...b.size)<4&&b.maxCoordinate<4,label+' athlete stays inside human-scale bounds: '+JSON.stringify(b));}
  boundsSamples.push({label,bounds:snapshot.athletes.bounds});
}
try{
  for(const quality of ['low','medium','high']) {
    const context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1});
    const page=await context.newPage();page.setDefaultTimeout(120000);
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(origin+'/?quality='+quality,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__HOOP_LEGACY__?.().athletes.active.length>0);
    assert.equal((await state(page)).athletes.ready,true);assert.equal((await state(page)).athletes.fallback,false);
    await page.getByRole('button',{name:/Tap to start/i}).click();
    if(quality!=='low')await page.waitForFunction(()=>window.__HOOP_LEGACY__().athletes.active.some(a=>a.detail==='hero'));
    reports[quality+'-menu']=await state(page);
    await checkBounds(page,quality+' menu');
    if(quality==='high') {
      await page.getByRole('button',{name:'Settings',exact:true}).click();
      await page.getByRole('radio',{name:'Low',exact:true}).click();
      await page.waitForFunction(()=>window.__HOOP_LEGACY__().athletes.active.every(a=>a.detail==='lod1'));
      await checkBounds(page,'high to low');
      await page.getByRole('radio',{name:'High',exact:true}).first().click();
      await page.waitForFunction(()=>window.__HOOP_LEGACY__().athletes.active.some(a=>a.detail==='hero'));
      await checkBounds(page,'low to high');
      await page.getByRole('button',{name:'Back',exact:true}).click();
      reports['quality-switch']=await state(page);
    }
    await page.getByRole('button',{name:/My Career/i}).click();
    await page.getByRole('button',{name:/New Career/i}).first().click();
    await page.getByPlaceholder('First name',{exact:true}).fill('Jordan');
    await page.getByPlaceholder('Last name',{exact:true}).fill('Vale');
    for(let step=0;step<3;step++)await page.getByRole('button',{name:'Next',exact:true}).click();
    // The Look step selects its face camera in an effect after the step mounts.
    await page.getByRole('button',{name:'Show full body',exact:true}).waitFor();
    await page.waitForTimeout(1200);
    await page.screenshot({path:path.join(output,`creator-${quality}.png`),timeout:120000});
    await page.goto(origin+'/?quality='+quality,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__HOOP_LEGACY__?.().ready);
    await page.getByRole('button',{name:/Tap to start/i}).click();
    await page.getByRole('button',{name:/Play Now/i}).click();
    await page.getByRole('radio',{name:'3v3',exact:true}).click();
    await page.getByRole('button',{name:'Tip Off',exact:true}).click();
    // Inspect actual deformed geometry through intro hero/game swaps, not just rig bones.
    for(let i=0;i<12;i++){await checkBounds(page,quality+' intro '+i);await page.waitForTimeout(400);}
    await page.waitForFunction(()=>window.__HOOP_LEGACY__().simulation?.hud?.gameClock<299);
    if(quality==='low')for(let i=0;i<25;i++){await checkBounds(page,'low live '+i);await page.waitForTimeout(1000);}
    for(let i=0;i<5;i++){
      await page.keyboard.down(i%2?'KeyA':'KeyW');await page.keyboard.down('Space');await page.waitForTimeout(220);await page.keyboard.up('Space');await page.keyboard.up(i%2?'KeyA':'KeyW');
      await page.keyboard.press('KeyK');await page.keyboard.press('KeyL');await checkBounds(page,quality+' input '+i);
    }
    const snapshot=await state(page);assert.equal(snapshot.athletes.active.length,6);
    assert.ok(snapshot.athletes.active.every(a=>a.detail!=='hero'),'close-up hero returns to gameplay detail');
    assert.ok(snapshot.athletes.active.every(a=>a.triangles<55000));
    reports[quality+'-3v3']=snapshot;
    await page.screenshot({path:path.join(output,`gameplay-${quality}.png`),timeout:120000});
    console.log(quality,'authored creator and six-player match passed');
    if(quality==='medium') {
      await page.goto(origin+'/?quality=medium',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__HOOP_LEGACY__?.().ready);
      await page.getByRole('button',{name:/Tap to start/i}).click();await page.getByRole('button',{name:/Play Now/i}).click();await page.getByRole('button',{name:'Tip Off',exact:true}).click();
      for(let i=0;i<16;i++){await checkBounds(page,'1v1 intro/live '+i);await page.waitForTimeout(500);}
      reports['medium-1v1']=await state(page);await page.screenshot({path:path.join(output,'gameplay-1v1-fixed.png'),timeout:120000});
    }
    await context.close();
  }
  const fallbackContext=await browser.newContext({viewport:{width:1000,height:650}});
  await fallbackContext.route('**/assets/athletes-v2/**',route=>route.abort());
  const fallback=await fallbackContext.newPage();fallback.setDefaultTimeout(120000);
  fallback.on('pageerror',e=>errors.push(e.message));
  await fallback.goto(origin+'/?quality=low',{waitUntil:'domcontentloaded'});
  await fallback.waitForFunction(()=>window.__HOOP_LEGACY__?.().ready);
  const result=await state(fallback);assert.equal(result.athletes.fallback,true);assert.equal(result.athletes.active.length,0);
  await fallback.getByRole('button',{name:/Tap to start/i}).click();
  await fallback.getByRole('button',{name:/Play Now/i}).click();
  await fallback.getByRole('button',{name:'Tip Off',exact:true}).click();
  await fallback.waitForFunction(()=>window.__HOOP_LEGACY__().simulation?.hud?.gameClock<299);
  reports.fallback=await state(fallback);await fallbackContext.close();
  assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(output,'runtime.json'),JSON.stringify({errors,reports,boundsSamples},null,2));
  console.log('Blocked authored assets fall back to playable procedural athletes');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
