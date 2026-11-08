import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
const origin = process.env.HOLDOVER_TEST_ORIGIN || 'http://localhost:3000';
const out = path.resolve('test-results/holdover');
await fs.mkdir(out, {recursive:true});
const browser = await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors = [], external = [];
// The full procedural valley can take longer to warm up on software WebGL.

async function open(viewport, mobile = false) {
  const context = await browser.newContext({viewport, ...(mobile ? {isMobile:true, hasTouch:true, deviceScaleFactor:1} : {})});
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (!request.url().startsWith(origin) && /^https?:/.test(request.url())) external.push(request.url()); });
  const response = await page.goto(origin + '/play/holdover?returnTo=%2Fgames%2Farchery', {waitUntil:'networkidle',timeout:120000});
  assert.equal(response.status(),200); console.log('route opened', viewport);
  await page.waitForFunction(() => [...document.querySelectorAll('iframe')].length > 0, null, {timeout:120000});
  let frame;
  for(let i=0;i<1200;i++) {
    frame = page.frames().find(f => f.url().includes('/embedded-games/holdover/'));
    if(frame && !frame.isDetached()) {
      try { await frame.locator('.main-nav').waitFor({timeout:1000}); break; }
      catch { frame = null; }
    }
    await page.waitForTimeout(100);
  }
  assert.ok(frame,'full game iframe opens');
  console.log('game menu ready');
  await Promise.all(page.frames().map(f => f.addStyleTag({content:'nextjs-portal{display:none!important}'}).catch(()=>{})));
  return {context,page,frame};
}
try {
  const {context,page,frame} = await open({width:1440,height:900});
  assert.equal(await frame.locator('.nav-item').count(),3);
  assert.ok(await frame.locator('.stage canvas').count() >= 2,'3D renderer and HUD canvas');
  await page.screenshot({path:path.join(out,'01-menu.png')}); console.log('menu captured');
  await frame.getByText(/Profile & settings/).click();await frame.getByRole('button',{name:'Settings',exact:true}).click();
  await frame.getByRole('textbox',{name:'Callsign'}).fill('HAWKEYE');
  await frame.getByRole('textbox',{name:'Callsign'}).press('Tab');
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('statoz.games.web.bundle.holdover.guest') || '{}').stores?.['holdover.profile.v1']?.includes('HAWKEYE'));
  assert.equal(await page.evaluate(()=>localStorage.getItem('holdover.profile.v1')),null);
  await page.reload({waitUntil:'networkidle'});
  const game = page.frames().find(f=>f.url().includes('/embedded-games/holdover/'));
  await game.locator('.main-nav').waitFor({timeout:120000});
  assert.ok((await game.getByText(/Profile & settings/).innerText()).includes('HAWKEYE'));
  await game.locator('.nav-item').filter({hasText:'Browse Operations'}).click();
  await game.getByRole('button',{name:'Deploy',exact:true}).click();
  await game.locator('.stage.in-game').waitFor(); console.log('gameplay started');
  await page.waitForTimeout(1500);
  const engage = game.getByRole('button',{name:'Engage',exact:true});
  if(await engage.isVisible()) await engage.click();
  await page.keyboard.press('v');
  await page.mouse.click(720,400);
  await game.waitForFunction(()=>document.querySelectorAll('.round-pip.spent').length>0, null, {timeout:15000});
  await page.screenshot({path:path.join(out,'02-campaign-fired.png')});
  await game.evaluate(()=>window.__STATOZ_HOST__.command('pause'));
  await game.getByRole('button',{name:'Resume',exact:true}).waitFor();
  await page.screenshot({path:path.join(out,'03-paused.png')});
  await game.getByRole('button',{name:'Abandon',exact:true}).click();
  await page.keyboard.press('Escape');
  await game.locator('.main-nav').waitFor();
  await game.locator('.nav-item').filter({hasText:'Quick Duel'}).click();
  await game.getByRole('button',{name:'Start duel',exact:true}).click();
  await game.locator('.stage.in-game').waitFor(); console.log('gameplay started');
  await page.screenshot({path:path.join(out,'04-duel.png')});
  await game.evaluate(()=>window.__STATOZ_HOST__.command('pause'));
  await game.getByRole('button',{name:'Abandon',exact:true}).click();
  await page.keyboard.press('Escape');
  await game.getByRole('button',{name:'Back to Archery',exact:true}).click();
  await page.waitForURL(url=>url.pathname==='/' && url.searchParams.get('sport')==='archery');
  const viewAll=page.getByRole('button',{name:'View all games',exact:true});
  if(await viewAll.count()) await viewAll.click();
  await page.getByRole('link',{name:'Play HOLDOVER',exact:true}).last().waitFor();
  await page.screenshot({path:path.join(out,'05-archery-catalog.png')});
  await context.close();
  for(const [name,viewport] of [['landscape',{width:844,height:390}],['portrait',{width:390,height:844}]]) {
    const {context,page,frame} = await open(viewport,true);
    assert.ok(await frame.evaluate(()=>innerWidth>innerHeight),'landscape game viewport');
    assert.ok(await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await frame.locator('.nav-item').filter({hasText:'Browse Operations'}).click();
    await frame.getByRole('button',{name:'Deploy',exact:true}).click();
    await frame.getByRole('button',{name:'Fire',exact:true}).waitFor();
    await frame.getByRole('button',{name:'Scope',exact:true}).tap();
    await frame.getByRole('button',{name:'Fire',exact:true}).tap();
    await frame.waitForFunction(()=>document.querySelectorAll('.round-pip.spent').length>0);
    await page.screenshot({path:path.join(out,`06-phone-${name}.png`)});
    await frame.getByRole('button',{name:'Pause',exact:true}).tap();
    await frame.getByRole('button',{name:'Resume',exact:true}).waitFor();
    await context.close();
  }
  assert.deepEqual(errors,[]);
  assert.deepEqual(external,[]);
  console.log('Holdover: campaign firing, duel, pause, persistent isolated saves, exit/catalog and both phone orientations passed; no external requests or JS errors.');
} finally { await browser.close(); }
