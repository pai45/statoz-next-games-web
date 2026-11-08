// Console home, searchable Library, recent launches and responsive landscape framing.
// Usage: node tests/home-hub.browser.mjs [--url=http://127.0.0.1:3000 | --pages]
//   --pages serves the static GitHub Pages export in out/ (run `npm run build:pages` first).
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import next from 'next';
import { chromium, expect } from '@playwright/test';

const root = process.cwd(), out = path.join(root, 'test-results/home-hub');
await fs.mkdir(out, { recursive: true });
const existing = process.argv.find(value => value.startsWith('--url='))?.slice(6);
const pages = process.argv.includes('--pages');
const base = pages ? '/statoz-games-web' : '';
const app = existing || pages ? null : next({ dev: true, dir: root });
await app?.prepare();
const handler = app?.getRequestHandler();
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.txt': 'text/plain' };
const server = existing ? null : http.createServer(async (request, response) => {
  if (!pages) { void handler(request, response); return; }
  try {
    let relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).slice(base.length);
    if (!path.extname(relative)) relative += '/index.html';
    const file = path.resolve(root, 'out', '.' + relative);
    if (!file.startsWith(path.join(root, 'out') + path.sep)) throw Error('Invalid path');
    response.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    response.end(await fs.readFile(file));
  } catch { response.writeHead(404); response.end(); }
});
if (server) await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = (existing || 'http://127.0.0.1:' + server.address().port) + base;
const browser = await chromium.launch({ executablePath: process.env.MOBILE_VIEWPORT_CHROMIUM || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const errors = [];

async function seed(context) {
  await context.addInitScript(() => {
    localStorage.setItem('statoz.games.web.auth.v2', JSON.stringify({ version: 2, authenticated: true, email: 'home@example.test' }));
    localStorage.setItem('statoz.games.web.accounts.v1', JSON.stringify({ version: 1, accounts: { 'home@example.test': { onboardingComplete: true } } }));
  });
}
async function visit(context, name, address = '/') {
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(name + ': ' + error.message));
  await page.goto(origin + address, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.locator('[data-console-dashboard], iframe[data-mobile-platform-frame]').first().waitFor({timeout:180000});
  const framed = await page.evaluate(() => matchMedia('(pointer: coarse) and (max-width: 500px), (pointer: coarse) and (max-height: 500px)').matches);
  if (framed) await page.locator('iframe[data-mobile-platform-frame]').waitFor({timeout:180000});
  const root = framed ? page.frameLocator('iframe[data-mobile-platform-frame]') : page;
  await root.locator('[data-console-dashboard] h1:visible').last().waitFor({timeout:180000});
  await expect.poll(() => root.locator('[data-console-dashboard]:visible a[data-game-cover]').first().evaluate(el => Object.keys(el).some(key => key.startsWith('__reactProps') && typeof el[key].onPointerEnter === 'function')), {timeout:180000}).toBe(true);
  await root.locator('[data-platform-command-bar]').waitFor();
  await root.locator('h1:visible').last().evaluate(() => document.fonts.ready);
  return { page, root };
}
async function checkSize(root, name) {
  const sizes = await root.locator('html').evaluate(html => ({ overflow: html.scrollWidth - html.clientWidth, width: innerWidth, height: innerHeight }));
  assert.ok(sizes.overflow <= 1, name + ': no page overflow ' + JSON.stringify(sizes));
  const play = await root.getByRole('link', {name:/^Play /}).first().evaluate(el => {
    const r = el.getBoundingClientRect(); return { left:r.left, top:r.top, right:r.right, bottom:r.bottom, width:r.width, height:r.height, viewport:innerHeight };
  });
  assert.ok(play.width >= 44 && play.height >= 44, name + ': Play has a touch target');
  if (sizes.height <= 540) assert.ok(play.bottom <= sizes.height, name + ': Play fits the opening viewport');
  assert.equal(await root.locator('[data-ad-placement="platform-left-rail"], [data-ad-placement="platform-right-rail"], [data-side-rail]').count(), 0);
  assert.equal(await root.getByRole('navigation', {name:'Primary'}).count(), 1);
  return sizes;
}
async function swipe(page, root, rotated) {
  const rail = root.locator('[data-shelf-id="lineup"]');
  const before = await rail.evaluate(el => el.scrollLeft);
  const box = await rail.locator('a').nth(2).boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {type:'touchStart',touchPoints:[{x,y}]});
  for (let i=1;i<=12;i++) {
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-(rotated?0:160*i/12),y:y-(rotated?160*i/12:0)}]});
    await page.waitForTimeout(20);
  }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForTimeout(300);
  assert.ok(await rail.evaluate(el => el.scrollLeft) > before + 30, 'touch swipe advances the game rail');
  assert.ok(!page.url().includes('/play/'), 'swiping never launches a game');
}
try {
  const desktop = await browser.newContext({viewport:{width:1440,height:900}});
  await seed(desktop);
  let {page,root} = await visit(desktop,'desktop');
  await checkSize(root,'desktop');
  const lineup = root.getByRole('region',{name:'Your game lineup'});
  const lineupTotal = await lineup.locator('a[data-game-cover]').count();
  assert.ok(lineupTotal > 8, 'main strip includes the complete catalog');
  assert.equal(await root.getByText('Pick a game. Make it yours.',{exact:true}).count(),0);
  assert.equal(await root.getByText('PICK UP THE PACE',{exact:true}).count(),0);
  assert.equal(await root.getByText('8 games',{exact:true}).count(),0);
  assert.equal(await root.getByRole('button',{name:/^(Previous|Next) .* games$/}).count(),0);
  assert.equal(await root.locator('h1').textContent(),'PENALTY CUP');
  await lineup.locator('[data-game-cover="hoop-legacy"]').hover();
  await root.getByRole('heading',{name:'HOOP LEGACY',exact:true}).waitFor();
  await lineup.locator('[data-game-cover="penalty-cup"]').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await root.locator('h1').textContent(),'HOOP LEGACY');
  await lineup.locator('[data-game-cover="penalty-cup"]').hover();
  await page.evaluate(()=>{ document.activeElement?.blur();window.scrollTo(0,0); });
  await page.waitForTimeout(400);
  await page.screenshot({path:path.join(out,'desktop.png')});
  await page.screenshot({path:path.join(out,'desktop-full.png'),fullPage:true});
  const catalogGames = await root.locator('[data-shelf-id]:not([data-shelf-id="lineup"]) a[data-game-cover]').evaluateAll(links=>links.map(link=>link.dataset.gameCover));
  assert.equal(new Set(catalogGames).size,catalogGames.length,'sport shelves cover every game once');
  assert.equal(lineupTotal,catalogGames.length,'main strip and shelves expose the same full catalog');
  await root.getByRole('tab',{name:'Football',exact:true}).click();
  await page.waitForURL(url=>url.searchParams.get('sport')==='football');
  assert.equal(await root.locator('[data-shelf-id]:not([data-shelf-id="lineup"])').count(),1);
  await root.getByRole('tab',{name:'All Games',exact:true}).click();
  await page.waitForURL(url=>!url.searchParams.get('sport'));
  await root.getByRole('navigation',{name:'Primary'}).getByRole('link',{name:'Library',exact:true}).click();
  let library=root.getByRole('dialog',{name:'Game Library'});
  await library.waitFor();
  assert.equal(await library.locator('li').count(),catalogGames.length,'Library includes every enabled game');
  await library.getByRole('searchbox',{name:'Search games'}).fill('formula');
  await page.waitForURL(url=>url.searchParams.get('q')==='formula');
  assert.equal(await library.locator('li').count(),1);
  await library.getByRole('tab',{name:'Football',exact:true}).click();
  await library.getByRole('heading',{name:'No games found'}).waitFor();
  await library.getByRole('button',{name:'Clear search and filters'}).click();
  await library.getByRole('link',{name:'Play PENALTY CUP',exact:true}).waitFor();
  await page.waitForURL(url=>url.searchParams.get('listSport')==='all'&&!url.searchParams.has('q'));
  await page.screenshot({path:path.join(out,'desktop-library.png')});
  await page.keyboard.press('Escape');
  await library.waitFor({state:'hidden'});
  await root.getByRole('navigation',{name:'Primary'}).getByRole('link',{name:'Library',exact:true}).click();
  await library.waitFor();
  await page.goBack();
  await library.waitFor({state:'hidden'});
  assert.equal(new URL(page.url()).searchParams.get('view'),null,'browser Back closes Library');
  await page.goForward();
  await library.waitFor();
  await page.keyboard.press('Escape');
  await library.waitFor({state:'hidden'});
  await page.evaluate(()=>window.scrollTo(0,650));
  await page.waitForTimeout(150);
  const savedTop=await page.evaluate(()=>scrollY);
  await root.getByRole('navigation',{name:'Primary'}).getByRole('link',{name:'Library',exact:true}).click();
  library=root.getByRole('dialog',{name:'Game Library'});
  await library.getByRole('searchbox',{name:'Search games'}).fill('Open Golf');
  await page.waitForURL(url=>url.searchParams.get('q')==='Open Golf');
  await library.getByRole('link',{name:'Play OPEN GOLF',exact:true}).click();
  await page.waitForURL(url=>url.pathname.includes('/play/open-golf'));
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('statoz.games.web.home-recents.v1')||'{}').entries?.[0]?.gameId==='open-golf');
  const returnTo=new URL(page.url()).searchParams.get('returnTo');
  assert.equal(new URL(returnTo,origin).searchParams.get('game'),'open-golf');
  await page.goto(origin+returnTo,{waitUntil:'domcontentloaded'});
  library=page.getByRole('dialog',{name:'Game Library'});
  await library.waitFor();
  assert.equal(await library.getByRole('searchbox',{name:'Search games'}).inputValue(),'Open Golf');
  await page.keyboard.press('Escape');
  await library.waitFor({state:'hidden'});
  await page.getByRole('heading',{name:'OPEN GOLF',exact:true}).waitFor();
  assert.equal(await page.locator('[data-shelf-id="lineup"] a').first().getAttribute('data-game-cover'),'open-golf');
  assert.equal(await page.locator('[data-shelf-id="lineup"] a').first().getAttribute('data-recent'),'true');
  await page.waitForTimeout(150);
  const returnedTop=await page.evaluate(()=>scrollY);
  assert.ok(Math.abs(returnedTop-savedTop)<10,'game return preserves home scroll');
  console.log('PASS desktop: catalog, focus preview, search, filtering, browser history, launch history and return state');
  await desktop.close();

  for(const [name,width,height,touch] of [
    ['wide',1920,1080,false],['small-desktop',1280,720,false],['tablet',820,1180,true],
    ['phone-932',932,430,true],['phone-844',844,390,true],['phone-667',667,375,true],['phone-568',568,280,true],['upright-phone',390,844,true]
  ]) {
    const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch});
    await seed(context);
    ({page,root}=await visit(context,name));
    await checkSize(root,name);
    if(name==='upright-phone') {
      assert.match(await page.locator('iframe[data-mobile-platform-frame]').evaluate(el=>el.style.transform),/rotate\(90deg\)/);
      assert.deepEqual(await root.locator('html').evaluate(()=>({width:innerWidth,height:innerHeight})),{width:844,height:390});
    }
    if(name==='phone-844'||name==='upright-phone') await swipe(page,root,name==='upright-phone');
    await page.screenshot({path:path.join(out,name+'.png')});
    if(name==='phone-844'||name==='phone-568') {
      await root.getByRole('navigation',{name:'Primary'}).getByRole('link',{name:'Library',exact:true}).click();
      const dialog=root.getByRole('dialog',{name:'Game Library'});await dialog.waitFor();
      await dialog.getByRole('searchbox',{name:'Search games'}).fill('cup');
      assert.ok(await dialog.locator('li').count()>0);
      await page.screenshot({path:path.join(out,name+'-library.png')});
    }
    console.log('PASS '+name+' '+width+'x'+height);
    await context.close();
  }
  const reduced=await browser.newContext({viewport:{width:1280,height:720},reducedMotion:'reduce'});
  ({page,root}=await visit(reduced,'reduced-motion','/?game=not-a-game&sport=unknown'));
  assert.equal(await root.locator('h1').textContent(),'PENALTY CUP','invalid selections use editorial fallback');
  assert.ok(await root.locator('[data-game-cover]').first().evaluate(el=>parseFloat(getComputedStyle(el).transitionDuration)<.001),'reduced motion removes perceptible transitions');
  await reduced.close();
  assert.deepEqual(errors,[],'no browser errors');
  console.log('Home dashboard browser checks passed; screenshots in '+out);
} catch (error) {
  console.error('Browser errors:', errors);
  throw error;
} finally {
  // Next's imported runtime can retain idle dev handles in an existing-server run.
  setTimeout(() => process.exit(process.exitCode || 0), 5000).unref();
  await browser.close();server?.close();await app?.close?.();
}
