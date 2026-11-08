import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import next from 'next';
import { chromium, expect } from '@playwright/test';

const root = process.cwd(), pages = process.argv.includes('--pages');
const launchOnly = process.argv.includes('--launch-only');
const base = pages ? '/statoz-games-web' : '';
const out = path.join(root, 'test-results', pages ? 'device-assets-pages' : 'device-assets');
await fs.mkdir(out, { recursive: true });
const app = pages ? null : next({ dev: false, dir: root });
await app?.prepare();
const handle = pages ? async (request, response) => {
  try {
    let relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).slice(base.length);
    if (!path.extname(relative)) relative += '/index.html';
    const file = path.resolve(root, 'out', '.' + relative);
    if (!file.startsWith(path.join(root, 'out') + path.sep)) throw Error('Invalid static path');
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.wasm': 'application/wasm' };
    response.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    response.end(await fs.readFile(file));
  } catch { response.writeHead(404); response.end(); }
} : app.getRequestHandler();

const requests = [], pageErrors = [], popupPaints = [];
let failFile, slowFile;
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  requests.push(pathname);
  if (pathname === failFile) { response.writeHead(503); response.end('Interrupted download'); return; }
  if (pathname === slowFile) { setTimeout(() => { if (!response.destroyed) void handle(request, response); }, 8000); return; }
  void handle(request, response);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
const profileRoot = path.resolve(root, '.cache/device-cache-e2e');
const profile = path.join(profileRoot, randomUUID());
await fs.mkdir(profile, { recursive: true });
const options = {
  executablePath: process.env.DEVICE_ASSETS_CHROMIUM || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true, viewport: { width: 1365, height: 900 }, args: ['--enable-unsafe-swiftshader'],
};
let context;
const observeDownloadScreens = async value => {
  await value.exposeBinding('__recordDownloadScreen', ({ frame }, state) => {
    popupPaints.push({ url: frame.url(), state });
  });
  await value.addInitScript(() => {
    const record = node => {
      if (!(node instanceof Element)) return;
      const screens = [...node.querySelectorAll('[data-game-download]')];
      if (node.matches('[data-game-download]')) screens.push(node);
      for (const screen of screens) void window.__recordDownloadScreen(screen.getAttribute('data-game-download')).catch(() => {});
    };
    // Start before the HTML parser and hydration, across every navigation and
    // iframe. A screenshot taken after lobby readiness misses a one-frame flash.
    new MutationObserver(records => {
      for (const change of records) {
        if (change.type === 'attributes') record(change.target);
        else for (const node of change.addedNodes) record(node);
      }
    }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-game-download'] });
  });
};
const openContext = async () => {
  const value = await chromium.launchPersistentContext(profile, options);
  value.on('page', page => page.on('pageerror', error => pageErrors.push(error.message)));
  await observeDownloadScreens(value);
  return value;
};

const workerRequest = (page, message) => page.evaluate(message => new Promise((resolve, reject) => {
  const channel = new MessageChannel();
  const timeout = setTimeout(() => reject(Error('Worker request timed out')), 30000);
  channel.port1.onmessage = event => {
    if (!['installed', 'not-installed', 'error', 'cancelled', 'ready'].includes(event.data.state)) return;
    clearTimeout(timeout); channel.port1.close(); resolve(event.data);
  };
  navigator.serviceWorker.controller.postMessage(message, [channel.port2]);
}), message);

const waitForLobby = async (page, game) => {
  await page.waitForFunction(() => !document.querySelector('[data-game-download], [data-game-preparing]') || document.querySelector('[data-game-download="error"]'), null, { timeout: 180000 });
  if (await page.locator('[data-game-download="error"]').count()) throw Error(await page.locator('[data-game-download="error"]').innerText());
  if (['pitch-duel', 'football-chess'].includes(game)) {
    const selector = game === 'pitch-duel' ? '[data-pitch-duel-screen]' : '[data-game="football-chess"]';
    await page.locator(selector + ', [data-ui-role="starter-summary"]').first().waitFor({ timeout: 60000 });
    if (await page.getByRole('button', { name: 'SKIP REVEAL', exact: true }).count()) await page.getByRole('button', { name: 'SKIP REVEAL', exact: true }).click();
    await page.locator(selector).waitFor({ timeout: 60000 });
  } else if (game === 'grand-prix-dash') {
    await page.getByRole('button', { name: /STAGE ATTACK/i }).first().waitFor({ timeout: 60000 });
  } else if (game === 'open-golf') {
    await page.locator('[data-hole="1"]').waitFor({ timeout: 60000 });
  } else {
    await page.locator('iframe').first().waitFor({ timeout: 60000 });
    await expect.poll(async () => page.frames().some(frame => frame.url().includes('/embedded-games/') || frame.url() === 'about:srcdoc'), { timeout: 60000 }).toBe(true);
  }
};

try {
  // The first HTML paint must not contain an install panel. Hydration used to
  // remove this panel after checking an already-installed pack, causing a flash.
  const lobbyHtml = await (await fetch(origin + base + '/play/pitch-rush')).text();
  assert.ok(!lobbyHtml.includes('data-game-download="checking"'), 'prerendered lobby must not paint a download popup while checking installed files');
  const html = await (await fetch(origin + base + '/')).text();
  const buildId = /<meta name="statoz-assets-build" content="([\w-]+)"/.exec(html)?.[1];
  assert.ok(buildId);
  const index = await (await fetch(origin + base + '/_game-assets/' + buildId + '/index.json')).json();
  const manifests = Object.fromEntries(await Promise.all(Object.entries({ core: index.core, ...index.games }).map(async ([id, summary]) => [id, await (await fetch(origin + summary.manifestUrl)).json()])));
  context = await openContext();
  let page = await context.newPage();
  await page.goto(origin + base + '/');
  await page.locator('[data-console-dashboard]').waitFor();
  await expect.poll(async () => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), { timeout: 60000 }).toBe(true);
  await expect.poll(async () => (await workerRequest(page, { type: 'GET_PACK_STATUS', packId: 'core', revision: index.core.revision })).installed, { timeout: 120000 }).toBe(true);
  assert.ok(!requests.some(url => url.startsWith(base + '/embedded-games/') || url.startsWith(base + '/games/')), 'startup must fetch no game runtimes');
  const coreUrls = new Set(manifests.core.files.map(file => file.url));
  const lazyUrls = new Set(Object.values(manifests).flatMap(manifest => manifest.files).filter(file => file.url.includes('/_next/static/') && !coreUrls.has(file.url)).map(file => file.url));
  assert.ok(!requests.some(url => lazyUrls.has(url)), 'startup must not preload game chunks');
  console.log('Startup: core only; no game runtime or game chunk requests.');
  await page.screenshot({ path: path.join(out, '01-library.png') });
  await page.evaluate(() => localStorage.setItem('device-cache-save-check', 'saved progress'));

  // A real server failure leaves the library and its selected control in place.
  const rush = manifests['pitch-rush'];
  failFile = rush.files.find(file => file.url.includes('/embedded-games/pitch-rush/')).url;
  const beforePlay = requests.length;
  await page.getByRole('button', { name: 'Game Library', exact: false }).first().click();
  await page.getByRole('dialog').locator('a[data-game-cover="pitch-rush"]').click();
  const rushControl = page.getByRole('dialog').locator('a[data-game-cover="pitch-rush"]');
  await expect(rushControl).toHaveAttribute('data-game-play-state', 'error', { timeout: 120000 });
  await expect(rushControl).toContainText('Retry download');
  await expect(page.locator('[data-console-dashboard]')).toBeVisible();
  await expect(page.locator('[data-game-download]')).toHaveCount(0);
  assert.equal(new URL(page.url()).pathname.replace(/\/$/, ''), base, 'download occurs before lobby navigation');
  assert.equal(await page.getByRole('button', { name: 'Play online', exact: true }).count(), 0);
  await page.screenshot({ path: path.join(out, '02-retry.png') });
  const retained = rush.files.find(file => requests.slice(beforePlay).includes(file.url) && file.url !== failFile);
  assert.ok(retained);
  const retainedCount = requests.filter(url => url === retained.url).length;
  failFile = undefined;
  const retryPaintStart = popupPaints.length;
  await rushControl.click();
  await page.waitForURL(url => url.pathname.replace(/\/$/, '') === base + '/play/pitch-rush', { timeout: 120000 });
  await waitForLobby(page, 'pitch-rush');
  assert.deepEqual(popupPaints.slice(retryPaintStart), [], 'verified PLAY must never mount a download panel during lobby navigation');
  assert.equal(requests.filter(url => url === retained.url).length, retainedCount);
  const playedRequests = requests.slice(beforePlay);
  assert.ok(!playedRequests.some(url => /\/embedded-games\/(?!pitch-rush\/)/.test(url)));
  console.log('PLAY: selected game only; retry resumed and opened its lobby.');

  // Eviction and cached corruption both require repair before launch.
  const engine = rush.files.find(file => file.url.includes('/embedded-games/pitch-rush/'));
  await page.evaluate(async file => {
    const name = (await caches.keys()).find(name => name.endsWith('files-v1'));
    const cache = await caches.open(name);
    const key = (await cache.keys()).find(key => key.url.includes('/files/' + file.hash + '/'));
    await cache.put(key, new Response('broken cached game'));
  }, engine);
  const beforeRepair = requests.filter(url => url === engine.url).length;
  await page.reload(); await waitForLobby(page, 'pitch-rush');
  assert.equal(requests.filter(url => url === engine.url).length, beforeRepair + 1);

  await page.goto(origin + base + '/?game=longbow');
  await page.locator('[data-console-dashboard]').waitFor();
  slowFile = manifests.longbow.files.find(file => file.url.includes('/embedded-games/')).url;
  const hero = page.locator('section[aria-label="Game spotlight"] a').first();
  await hero.click();
  await expect(hero).toContainText(/Downloading \d+%/, { timeout: 60000 });
  await expect(hero).toHaveAttribute('aria-busy', 'true');
  await expect(hero).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('[data-game-download]')).toHaveCount(0);
  assert.equal(new URL(page.url()).pathname.replace(/\/$/, ''), base, 'progress stays on the library');
  // Keyboard activation must not bypass the pending link or duplicate its job.
  await hero.focus();
  await hero.press('Enter');
  await expect(hero).toHaveAttribute('aria-busy', 'true');
  await page.screenshot({ path: path.join(out, '03-progress.png') });
  // Choosing an installed game supersedes the slow launch without a popup.
  const installedPaintStart = popupPaints.length;
  await page.locator('a[data-game-cover="pitch-rush"]').first().click();
  await page.waitForURL(url => url.pathname.replace(/\/$/, '') === base + '/play/pitch-rush', { timeout: 120000 });
  await waitForLobby(page, 'pitch-rush');
  assert.deepEqual(popupPaints.slice(installedPaintStart), [], 'installed PLAY must open the lobby without even a transient download panel');
  assert.equal((await workerRequest(page, { type: 'GET_PACK_STATUS', packId: 'game:longbow', revision: index.games.longbow.revision })).installed, false);
  slowFile = undefined;
  console.log('Inline progress: busy Play button, duplicate prevention and superseded launch passed.');
  await page.goto(origin + base + '/');
  await page.locator('[data-console-dashboard]').waitFor();

  // A cold offline library can explain a missing game without a navigation error.
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Game Library', exact: false }).first().click();
  await page.getByRole('dialog').getByRole('searchbox', { name: 'Search games' }).fill('open golf');
  await expect(page.getByRole('dialog').locator('a[data-game-cover]')).toHaveCount(1);
  await page.getByRole('dialog').locator('a[data-game-cover="open-golf"]').click();
  await expect(page.getByRole('dialog').locator('[data-game-download-error="open-golf"]')).toContainText('Internet required', { timeout: 60000 });
  await expect(page.locator('[data-game-download]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Close all games', exact: true }).click();
  await page.goto(origin + base + '/play/open-golf');
  await page.locator('[data-offline-game]').waitFor();
  await context.setOffline(false);

  if (launchOnly) {
    // On a fresh phone, progress stays inside the platform frame until verified
    // completion opens the lobby at the top level.
    await context.close();
    const browser = await chromium.launch(options);
    try {
      context = await browser.newContext({ viewport: { width: 393, height: 851 }, isMobile: true, hasTouch: true });
      await observeDownloadScreens(context);
      const phone = await context.newPage();
      phone.on('pageerror', error => pageErrors.push(error.message));
      slowFile = rush.files.find(file => file.url.includes('/embedded-games/pitch-rush/')).url;
      await phone.goto(origin + base + '/?game=pitch-rush');
      const library = phone.frameLocator('iframe[data-mobile-platform-frame]');
      await library.locator('[data-console-dashboard]').waitFor({ timeout: 60000 });
      const phonePlay = library.locator('section[aria-label="Game spotlight"] a').first();
      const phonePaintStart = popupPaints.length;
      await phonePlay.click();
      await expect(phonePlay).toContainText(/Downloading/, { timeout: 60000 });
      await expect(phonePlay).toHaveAttribute('aria-busy', 'true');
      await expect(library.locator('[data-console-dashboard]')).toBeVisible();
      await expect(library.locator('[data-game-download]')).toHaveCount(0);
      await phone.screenshot({ path: path.join(out, '05-phone-progress.png') });
      await phone.waitForURL(url => url.pathname.replace(/\/$/, '') === base + '/play/pitch-rush', { timeout: 120000 });
      await expect.poll(() => phone.frames().some(frame => frame.url().includes('/embedded-games/pitch-rush/')), { timeout: 60000 }).toBe(true);
      assert.deepEqual(popupPaints.slice(phonePaintStart), [], 'phone PLAY must not flash an install panel in the parent or either landscape frame');
      await phone.screenshot({ path: path.join(out, '06-phone-lobby.png') });
      assert.deepEqual(pageErrors, []);
      await fs.writeFile(path.join(out, 'launch-results.json'), JSON.stringify({ buildId, inlineProgress: true, inlineRetry: true, supersededLaunch: true, phoneDownloadToLobby: true, noTransientDownloadPanels: true, pageErrors }, null, 2));
      console.log('Phone: inline download completed and opened its landscape lobby directly.');
    } catch (error) {
      console.error('Phone page errors:', pageErrors);
      for (const current of context.pages()) {
        console.error('Phone page:', current.url(), await current.locator('body').innerText().catch(() => 'Unavailable'));
        await current.screenshot({ path: path.join(out, 'phone-failure.png') }).catch(() => {});
      }
      throw error;
    } finally { await browser.close(); }
  } else {
  const routeResults = [];
  for (const [game, summary] of Object.entries(index.games)) {
    await page.goto(origin + summary.entryUrl);
    await waitForLobby(page, game);
    assert.equal((await workerRequest(page, { type: 'GET_PACK_STATUS', packId: summary.packId, revision: summary.revision })).current, true);
    routeResults.push(game);
    console.log('Installed and launched: ' + game);
  }

  // Remove the HTTP cache, close every document and restart the browser profile.
  const session = await context.newCDPSession(page);
  await session.send('Network.clearBrowserCache');
  await context.close();
  context = await openContext();
  await context.setOffline(true);
  const missingRuntimeFiles = [];
  context.on('requestfailed', request => {
    if (!request.serviceWorker() && /\/(?:assets|embedded-games|_next\/static|games)\//.test(new URL(request.url()).pathname)) missingRuntimeFiles.push(request.url());
  });
  page = await context.newPage();
  await page.goto(origin + base + '/');
  await page.locator('[data-console-dashboard]').waitFor({ timeout: 60000 });
  assert.equal(await page.evaluate(() => localStorage.getItem('device-cache-save-check')), 'saved progress');
  for (const [game, summary] of Object.entries(index.games)) {
    await page.goto(origin + summary.entryUrl);
    await waitForLobby(page, game);
    const badFiles = await page.evaluate(async files => {
      const bad = [];
      for (const file of files) {
        try {
          const bytes = await (await fetch(file.url, { cache: 'no-store' })).arrayBuffer();
          const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(value => value.toString(16).padStart(2, '0')).join('');
          if (bytes.byteLength !== file.bytes || hash !== file.hash) bad.push(file.url);
        } catch { bad.push(file.url); }
      }
      return bad;
    }, manifests[game].files);
    assert.deepEqual(badFiles, [], game + ' must serve every verified file offline');
    console.log('Cold offline launch and all pack hashes: ' + game);
  }
  await page.screenshot({ path: path.join(out, '04-offline-lobby.png') });
  assert.deepEqual(missingRuntimeFiles, [], 'games must not make uncached runtime requests while offline');
  await context.close();
  context = await chromium.launchPersistentContext(profile, { ...options, viewport: { width: 393, height: 851 }, isMobile: true, hasTouch: true });
  context.on('page', value => value.on('pageerror', error => pageErrors.push(error.message)));
  await context.setOffline(true);
  page = await context.newPage();
  await page.goto(origin + base + '/');
  const mobileLibrary = page.frameLocator('iframe[data-mobile-platform-frame]');
  await mobileLibrary.locator('[data-console-dashboard]').waitFor({ timeout: 60000 });
  await mobileLibrary.locator('a[data-game-cover="pitch-rush"]').first().click();
  await page.waitForURL(url => url.pathname.replace(/\/$/, '') === base + '/play/pitch-rush', { timeout: 120000 });
  await expect.poll(() => page.frames().some(frame => frame.url().includes('/embedded-games/pitch-rush/')), { timeout: 60000 }).toBe(true);
  await page.screenshot({ path: path.join(out, '05-phone-offline.png') });
  console.log('Phone: offline PLAY leaves the library frame and opens the landscape lobby.');
  assert.deepEqual(pageErrors, []);
  await fs.writeFile(path.join(out, 'results.json'), JSON.stringify({ buildId, coreBytes: index.core.totalBytes, games: routeResults, requests: requests.length, pageErrors, coldBrowserRestart: true, offlinePackHashes: true, phoneOfflineFrame: true }, null, 2));
  console.log('Per-game offline flow passed for all ' + routeResults.length + ' games.');
  }
} catch (error) {
  process.exitCode = 1;
  console.error(error);
  for (const page of context?.pages() ?? []) {
    console.error(await page.locator('body').innerText().catch(() => 'Page unavailable'));
    await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {});
  }
} finally {
  await context?.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  await app?.close();
  if (!process.exitCode && profile.startsWith(profileRoot + path.sep)) await fs.rm(profile, { recursive: true, force: true });
}
