import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import next from 'next';
import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';

const root = process.cwd(), out = path.join(root, 'test-results/mobile-viewport');
await fs.mkdir(out, { recursive: true });
const existing = process.argv.find(value => value.startsWith('--url='))?.slice(6);
const pages = process.argv.includes('--pages');
const base = pages ? '/statoz-games-web' : '';
const app = existing || pages ? null : next({ dev: true, dir: root });
await app?.prepare();
const handler = app?.getRequestHandler();
const server = existing ? null : http.createServer(async (request, response) => {
  if (!pages) { void handler(request, response); return; }
  try {
    let relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).slice(base.length);
    if (!path.extname(relative)) relative += '/index.html';
    const file = path.resolve(root, 'out', '.' + relative);
    if (!file.startsWith(path.join(root, 'out') + path.sep)) throw Error('Invalid path');
    let bytes = await fs.readFile(file);
    if (relative.startsWith('/_game-assets/')) {
      // Full-cache downloads have their own browser suite. Use one real asset
      // here so phone/tablet/desktop UI tests do not each download 400 MB.
      const manifest = JSON.parse(bytes);
      const files = manifest.files.filter(file => file.url.endsWith('/ad-space-anchor.svg'));
      bytes = JSON.stringify({ ...manifest, files, totalBytes: files.reduce((sum, file) => sum + file.bytes, 0), revision: createHash('sha256').update(JSON.stringify(files)).digest('hex') });
    }
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
    response.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    response.end(bytes);
  } catch { response.writeHead(404); response.end(); }
});
if (server) await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = (existing || 'http://127.0.0.1:' + server.address().port) + base;
const browser = await chromium.launch({ executablePath: process.env.MOBILE_VIEWPORT_CHROMIUM || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--enable-unsafe-swiftshader'] });
const evidence = [];
const errors = [];
async function seed(context) {
  await context.addInitScript(() => {
    localStorage.setItem('statoz.games.web.auth.v2', JSON.stringify({ version: 2, authenticated: true, email: 'viewport@example.test' }));
    localStorage.setItem('statoz.games.web.accounts.v1', JSON.stringify({ version: 1, accounts: { 'viewport@example.test': { onboardingComplete: true } } }));
  });
}
async function gameFrame(page) {
  const locator = page.locator('iframe[data-mobile-game-frame]');
  await locator.waitFor({ timeout: 120000 });
  const frame = await (await locator.elementHandle()).contentFrame();
  await frame.waitForURL('**/play/**', { timeout: 120000 });
  await frame.waitForFunction(() => innerWidth > innerHeight && !document.querySelector('[data-mobile-game-viewport]') && document.readyState === 'complete', null, { timeout: 120000 });
  return frame;
}
try {
  const phone = await browser.newContext({ viewport: { width: 393, height: 851 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  await seed(phone);
  const page = await phone.newPage();
  page.on('pageerror', error => errors.push(error.message));
  const routes = process.argv.includes('--football-only') ? ['retro-football'] : ['vibe-basketball', 'retro-hoops', 'retro-circuit', 'retro-football', 'retro-innings', 'stadium-cricket', 'penalty-shootout', 'pitch-duel', 'football-chess', 'rally'];
  for (const route of routes) {
    await page.goto(origin + '/play/' + route, { waitUntil: 'domcontentloaded', timeout: 120000 });
    const frame = await gameFrame(page);
    const geometry = await frame.evaluate(() => ({ width: innerWidth, height: innerHeight, landscape: matchMedia('(orientation: landscape)').matches, nestedHosts: document.querySelectorAll('iframe[data-mobile-game-frame]').length }));
    assert.equal(geometry.width, 851, route);
    assert.equal(geometry.height, 393, route);
    assert.ok(geometry.landscape);
    assert.equal(geometry.nestedHosts, 0, 'must not recursively embed the app');
    if (['vibe-basketball', 'retro-hoops', 'retro-circuit', 'retro-football', 'retro-innings'].includes(route)) {
      const handle = await frame.locator('iframe').elementHandle({ timeout: 90000 });
      const nested = await handle.contentFrame();
      await nested.waitForFunction(() => document.readyState === 'complete' && (window.__STATOZ_HOST__ || window.__VIBE_HOST__), null, { timeout: 90000 });
      if (route.startsWith('retro-')) await nested.locator('.retro-rotation').waitFor({ state: 'attached', timeout: 90000 });
      if (route === 'retro-football') {
        await nested.locator('.handheld').waitFor({ timeout: 90000 });
        const nestedGeometry = await nested.evaluate(() => ({ width: innerWidth, height: innerHeight, client: [document.documentElement.clientWidth, document.documentElement.clientHeight], landscape: matchMedia('(orientation:landscape)').matches }));
        console.log('Football runtime viewport:', JSON.stringify(nestedGeometry));
        assert.ok(nestedGeometry.width > nestedGeometry.height && nestedGeometry.landscape, 'the inner football game must also receive landscape');
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await page.screenshot({ path: path.join(out, 'retro-football-live-verified.png') });
      }
      await nested.waitForFunction(() => innerWidth > innerHeight && !document.fullscreenElement);
      assert.equal(await page.evaluate(() => document.fullscreenElement === null), true, 'native fullscreen must not override the mobile rotation');
      assert.equal(await nested.locator('.portrait-guide:visible, .retro-rotation:visible').count(), 0, 'landscape must not show a rotate-screen guide');
    }
    const box = await page.locator('iframe[data-mobile-game-frame]').boundingBox();
    assert.ok(Math.abs(box.width - 393) < 1 && Math.abs(box.height - 851) < 1, 'rotated frame must fit physical phone viewport');
    await page.screenshot({ path: path.join(out, route + '-portrait-phone.png') });
    evidence.push({ route, ...geometry });
    console.log('Landscape phone:', route, geometry.width, geometry.height);
  }
  for (const route of ['tennis']) {
    await page.goto(origin + '/play/' + route, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    assert.equal(await page.locator('[data-mobile-game-viewport]').count(), 0, route + ' must keep its original layout');
    assert.ok(await page.evaluate(() => innerHeight > innerWidth));
    await page.screenshot({ path: path.join(out, route + '-unchanged.png') });
  }

  await page.goto(origin + '/play/vibe-basketball', { waitUntil: 'domcontentloaded' });
  const frame = await gameFrame(page);
  await frame.evaluate(() => {
    window.__viewportSession = 'preserved';
    const button = document.createElement('button');
    button.id = 'viewport-touch-probe';
    button.textContent = 'Touch probe';
    button.style.cssText = 'position:fixed;left:550px;top:100px;width:80px;height:44px;z-index:999999';
    button.addEventListener('pointerdown', event => { window.__viewportPointer = { x: event.clientX, y: event.clientY }; });
    document.body.appendChild(button);
  });
  await page.touchscreen.tap(393 - 122, 590);
  const pointer = await frame.evaluate(() => window.__viewportPointer);
  assert.ok(pointer && Math.abs(pointer.x - 590) < 2 && Math.abs(pointer.y - 122) < 2, 'touch coordinates must match the landscape game');
  await frame.locator('#viewport-touch-probe').evaluate(node => node.remove());
  await page.setViewportSize({ width: 851, height: 393 });
  await page.waitForFunction(() => document.querySelector('iframe[data-mobile-game-frame]')?.style.transform === 'none');
  await frame.waitForFunction(() => innerWidth === 851 && innerHeight === 393);
  assert.equal(await frame.evaluate(() => window.__viewportSession), 'preserved', 'turning device must not restart the game');
  assert.equal(await page.locator('iframe[data-mobile-game-frame]').evaluate(node => node.style.transform), 'none');
  const game = await (await frame.locator('iframe').elementHandle()).contentFrame();
  await game.locator('#mode-1v1').tap({ timeout: 90000 });
  await game.waitForFunction(() => window.__game?.players?.length === 2, null, { timeout: 90000 });
  await game.locator('#loading.done').waitFor({ state: 'attached', timeout: 90000 });
  await page.screenshot({ path: path.join(out, 'vibe-landscape-match.png') });
  await page.setViewportSize({ width: 393, height: 851 });
  await page.waitForFunction(() => document.querySelector('iframe[data-mobile-game-frame]')?.style.transform.includes('rotate(90deg)'));
  await frame.waitForFunction(() => innerWidth === 851 && innerHeight === 393);
  assert.equal(await frame.evaluate(() => window.__viewportSession), 'preserved');
  const pauseExit = game.locator('#vibe-pause [data-command="exit"]');
  if (await pauseExit.isVisible()) await pauseExit.tap();
  else await game.locator('[data-command="exit"]:visible').first().tap();
  await page.waitForURL(url => url.pathname.replace(/\/$/, '') === base + '/games/basketball', { timeout: 30000 });
  assert.equal(await page.locator('[data-mobile-game-viewport]').count(), 0, 'exit must leave the rotated app frame');
  assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden');
  await phone.close();

  const tablet = await browser.newContext({ viewport: { width: 768, height: 1024 }, hasTouch: true, isMobile: true });
  await seed(tablet);
  const tabletPage = await tablet.newPage();
  await tabletPage.goto(origin + '/play/retro-football');
  const tabletFrame = await gameFrame(tabletPage);
  assert.deepEqual(await tabletFrame.evaluate(() => [innerWidth, innerHeight]), [1024, 768]);
  await tabletPage.screenshot({ path: path.join(out, 'tablet-landscape.png') });
  await tablet.close();
  const desktop = await browser.newContext({ viewport: { width: 1365, height: 900 } });
  await seed(desktop);
  const desktopPage = await desktop.newPage();
  await desktopPage.goto(origin + '/play/vibe-basketball');
  await desktopPage.locator('iframe').waitFor();
  assert.equal(await desktopPage.locator('[data-mobile-game-viewport]').count(), 0, 'desktop must not gain another iframe');
  await desktop.close();
  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(out, 'results.json'), JSON.stringify({ evidence, touch: pointer, resizePreservesSession: true, exitWorks: true, tablet: true, desktop: true, errors }, null, 2));
  console.log('Passed: 9 landscape games, 2 exceptions, real touch mapping, resize without restart, exit, tablet and desktop.');
} catch (error) {
  console.log('Mobile viewport verification failed: ' + String(error));
  console.log('Browser errors: ' + JSON.stringify(errors));
  for (const context of browser.contexts()) for (const page of context.pages()) {
    await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {});
    console.log('Page diagnostics: ' + JSON.stringify(await page.evaluate(() => ({ url: location.href, ready: document.readyState, mobile: matchMedia('(pointer: coarse) and (max-width: 1366px)').matches, text: document.body.innerText.slice(0, 1000), pending: performance.getEntriesByType('resource').filter(item => !item.responseEnd).map(item => item.name) })).catch(() => ({}))));
  }
  process.exitCode = 1;
} finally {
  await browser.close();
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  await app?.close();
}
