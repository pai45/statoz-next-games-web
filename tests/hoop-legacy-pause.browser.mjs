import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {chromium} from '@playwright/test';

// Focused lifecycle regression using the current built bytes. This does not
// depend on a concurrently running Next build or the host download gate.
const source = await fs.readFile('public/embedded-games/hoop-legacy/index.html', 'utf8');
const boot = {sessionId: 'hoop-legacy-input-smoke', stores: {
  'hoop-legacy:settings': JSON.stringify({quality: 'low', resolution: .75, music: 0, crowd: 0, commentary: 0}),
}};
const html = source.replace('/*__STATOZ_BOOT__*/', 'window.__STATOZ_BOOT__=' + JSON.stringify(boot) + ';');
const server = http.createServer(async(request, response) => {
  const pathname=new URL(request.url,'http://local').pathname;
  if(pathname==='/'){response.writeHead(200, {'Content-Type': 'text/html'});response.end(html);return;}
  if(pathname==='/favicon.ico'){response.writeHead(204);response.end();return;}
  const assetRoot=path.resolve('public/embedded-games/hoop-legacy');
  const file=path.resolve(assetRoot,'.'+decodeURIComponent(pathname));
  if(!file.startsWith(assetRoot+path.sep)){response.writeHead(403);response.end();return;}
  try {const bytes=await fs.readFile(file);response.writeHead(200,{'Content-Type':path.extname(file)==='.json'?'application/json':'application/octet-stream'});response.end(bytes);}catch{response.writeHead(404);response.end();}
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({channel: 'chrome', headless: true});
try {
  const page = await browser.newPage({viewport: {width: 1000, height: 650}});
  page.setDefaultTimeout(120000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => window.__HOOP_LEGACY__?.().ready);
  assert.equal((await page.evaluate(()=>window.__HOOP_LEGACY__())).athletes.ready,true);
  await page.getByRole('button', {name: /Tap to start/i}).click();
  await page.getByRole('button', {name: /Play Now/i}).click();
  await page.getByRole('button', {name: 'Tip Off', exact: true}).click();
  await page.waitForFunction(() => window.__HOOP_LEGACY__().simulation?.hud?.gameClock < 299);
  await page.keyboard.down('KeyW');
  await page.keyboard.down('Space');
  await page.waitForFunction(() => window.__HOOP_LEGACY__().input.held.shoot);
  await page.evaluate(() => window.__STATOZ_COMMAND__({protocolVersion: 1, gameId: 'hoop-legacy', sessionId: 'hoop-legacy-input-smoke', type: 'pause'}));
  const state = () => page.evaluate(() => window.__HOOP_LEGACY__());
  assert.deepEqual((await state()).input.move, {x: 0, y: 0});
  assert.equal((await state()).input.held.shoot, false);
  const clock = (await state()).simulation.hud.gameClock;
  await page.keyboard.up('KeyW');
  await page.keyboard.up('Space');
  await page.waitForTimeout(300);
  assert.equal((await state()).simulation.hud.gameClock, clock);
  await page.getByRole('button', {name: 'Resume', exact: true}).click();
  assert.equal((await state()).input.held.shoot, false);
  await page.waitForFunction(clock => window.__HOOP_LEGACY__().simulation.hud.gameClock < clock, clock);
  assert.deepEqual(errors, []);
  const check = 'Host suspension clears held input and discards releases queued while paused';
  console.log(check);
  const file = 'test-results/hoop-legacy/validation.json';
  const report = JSON.parse(await fs.readFile(file, 'utf8').catch(() => '{"checks":[],"errors":[],"failures":[]}'));
  if (!report.checks.includes(check)) report.checks.push(check);
  await fs.mkdir('test-results/hoop-legacy', {recursive: true});
  await fs.writeFile(file, JSON.stringify(report, null, 2));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
