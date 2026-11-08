// Runs Longbow inside the exported product (npm run build:pages first), served under the Pages prefix.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';

const out = path.resolve('test-results/longbow-app'); await fs.mkdir(out, {recursive: true});
const root = path.resolve('out'), prefix = '/statoz-games-web';
const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'};
const server = http.createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (!pathname.startsWith(prefix + '/')) throw Error();
    pathname = pathname.slice(prefix.length);
    let file = path.resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + path.sep)) throw Error();
    if ((await fs.stat(file)).isDirectory()) file = path.join(file, 'index.html');
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream'); res.end(await fs.readFile(file));
  } catch {res.writeHead(404).end();}
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({channel: 'chrome', headless: true, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11']});
const context = await browser.newContext({viewport: {width: 1280, height: 720}, hasTouch: true});
const page = await context.newPage(), errors = [], failed = [], remote = [], checks = [];
page.on('pageerror', e => errors.push(e.message));
page.on('response', r => {if (r.status() >= 400) failed.push(r.url());});
page.on('request', r => {if (/^https?:/.test(r.url()) && !r.url().startsWith(origin)) remote.push(r.url());});
try {
  await page.goto(origin + prefix + '/games/archery/');
  await page.locator('a[href$="/play/longbow"],a[href$="/play/longbow/"]').first().waitFor();
  assert.ok(await page.locator('a[href$="/play/archery-test"],a[href$="/play/archery-test/"]').count());
  await page.screenshot({path: path.join(out, 'archery-library.png')});
  checks.push('Archery library lists Longbow beside Archery Master');

  await page.goto(origin + prefix + '/how-to-play/longbow/');
  await page.getByRole('heading', {name: 'LONGBOW', exact: true}).first().waitFor();
  checks.push('Longbow How to Play prerenders with its own instructions');

  await page.goto(origin + prefix + '/play/longbow/');
  await page.waitForFunction(() => [...document.querySelectorAll('iframe')].some(f => f.contentWindow?.__LONGBOW_INSPECT__?.snapshot().mode === 'menu'), null, {timeout: 60000});
  const game = page.frames().find(f => f.url().includes('/embedded-games/longbow/')); assert.ok(game);
  await page.screenshot({path: path.join(out, 'product-play.png')});
  await game.getByRole('button', {name: /^CAREER/}).click(); await game.getByRole('button', {name: /First Draw/}).click();
  await game.getByRole('button', {name: 'Pause game'}).click(); await game.getByRole('button', {name: /RESUME/}).click();
  checks.push('The exported product route boots as a guest and supports pause and resume');

  await page.setViewportSize({width: 844, height: 390}); await page.waitForTimeout(200);
  await page.screenshot({path: path.join(out, 'product-mobile.png')});
  await page.setViewportSize({width: 390, height: 844}); await game.locator('[data-mode="paused"]').waitFor();
  checks.push('The product iframe pauses on a physical portrait turn');
  await page.setViewportSize({width: 844, height: 390});
  await game.getByRole('button', {name: 'Back to Archery', exact: true}).click();
  await page.waitForURL(/\/games\/archery\/?$/);
  checks.push('Exit returns to the archery library');

  assert.deepEqual(errors, []); assert.deepEqual(failed, []); assert.deepEqual(remote, []);
  await fs.writeFile(path.join(out, 'checks.json'), JSON.stringify({checks, errors, failed, remote}, null, 2));
  console.log(JSON.stringify({checks, errors, failed, remote}, null, 2));
} catch (e) {
  await page.screenshot({path: path.join(out, 'failure.png')});
  await fs.writeFile(path.join(out, 'failure.json'), JSON.stringify({error: e.stack, checks, errors, failed, remote}, null, 2));
  throw e;
} finally {await context.close(); await browser.close(); await new Promise(r => server.close(r));}
