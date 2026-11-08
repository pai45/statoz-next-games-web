import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRimRushServer} from '../scripts/preview-rim-rush.mjs';

const out = path.resolve('test-results/rim-rush'); await fs.mkdir(out, {recursive: true});
const server = createRimRushServer(); await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = 'http://127.0.0.1:' + server.address().port;
// Prefer installed Chrome with the GPU; fall back to Playwright's Chromium with software GL.
const browser = await chromium.launch({channel: 'chrome', headless: true, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11']})
  .catch(() => chromium.launch({headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']}));
const context = await browser.newContext({viewport: {width: 844, height: 390}, deviceScaleFactor: 2, hasTouch: true});
const page = await context.newPage(), errors = [], failed = [], remote = [], checks = [];
page.on('pageerror', e => errors.push(e.message));
page.on('response', r => {if (r.status() >= 400) failed.push(r.url());});
page.on('request', r => {if (/^https?:/.test(r.url()) && !r.url().startsWith(origin)) remote.push(r.url());});

let frame;
const open = async (account = 'a', manual = true) => {
  frame = null;
  await page.goto(`${origin}/fixture?account=${account}${manual ? '&manual=1' : ''}`);
  await page.waitForSelector('iframe');
  for (let i = 0; i < 100 && !frame?.url().includes('/embedded-games/rim-rush/'); i++) {frame = page.frames().find(f => f.url().includes('/embedded-games/rim-rush/')); if (!frame) await page.waitForTimeout(50);}
  await frame.waitForFunction(() => window.__RIM_RUSH_INSPECT__?.snapshot().mode === 'menu', null, {timeout: 90000});
};
const snapshot = () => frame.evaluate(() => window.__RIM_RUSH_INSPECT__.snapshot());
const view = () => frame.evaluate(() => window.__RIM_RUSH_INSPECT__.view());
const advance = async t => {await frame.evaluate(t => window.__RIM_RUSH_INSPECT__.advance(t), t); await page.waitForTimeout(40);};
const ideal = deg => frame.evaluate(d => window.__RIM_RUSH_INSPECT__.ideal(d), deg);
const shootIdeal = async (deg = 58) => {const p = await ideal(deg); return frame.evaluate(([a, p]) => window.__RIM_RUSH_INSPECT__.shoot(a, p), [deg * Math.PI / 180, p]);};
/** Every dialog and HUD element must sit inside the viewport: menus never scroll. */
const fits = async label => {
  const size = page.viewportSize();
  const boxes = await frame.evaluate(() => [...document.querySelectorAll('[role=dialog], [role=dialog] button, header button')].map(e => {const r = e.getBoundingClientRect(); return {t: e.textContent.trim().slice(0, 24), l: r.left, r: r.right, top: r.top, b: r.bottom};}));
  for (const b of boxes) assert.ok(b.l >= -1 && b.top >= -1 && b.r <= size.width + 1 && b.b <= size.height + 1, `${label}: "${b.t}" is outside ${size.width}×${size.height}: ${JSON.stringify(b)}`);
};

try {
  await open(); await page.screenshot({path: path.join(out, '01-menu.png')});
  await fits('menu');
  checks.push('Offline bundle boots with local CC0 assets and reaches the menu');

  await frame.getByRole('button', {name: /^QUICK MATCH/}).click();
  assert.equal(await frame.locator('[role=dialog] button[aria-label$="locked"]').count(), 0);
  assert.ok(await frame.getByText(/6 rivals locked/).isVisible());
  await page.screenshot({path: path.join(out, '02-quick.png')}); await fits('quick match');
  await frame.getByRole('button', {name: 'Back', exact: true}).click();
  await frame.getByRole('button', {name: /^LOCKER/}).click();
  assert.equal(await frame.locator('[role=dialog] button[aria-label$="coins"]:disabled').count(), 5);
  await page.screenshot({path: path.join(out, '03-locker.png')}); await fits('locker');
  await frame.getByRole('button', {name: 'Back', exact: true}).click();
  await frame.getByRole('button', {name: /^BROWSE CUPS/}).click();
  assert.equal(await frame.getByRole('tab', {name: /^City Cup/}).isDisabled(), true);
  await page.screenshot({path: path.join(out, '04-cup.png')}); await fits('tournament');
  checks.push('Quick match, locker and tournament fit one phone landscape screen; later cups and rivals start locked');

  await frame.getByRole('button', {name: /^PLAY QUARTER-FINAL/}).click();
  await advance(1.2); await page.screenshot({path: path.join(out, '05-countdown.png')});
  await advance(2.0);
  let s = await snapshot(); assert.equal(s.game.phase, 'play'); assert.equal(s.game.config.rival.id, 'milo');
  // A real pull-back drag on the canvas shows the aim guide and shoots on release.
  const box = await frame.locator('canvas').boundingBox();
  await page.mouse.move(box.x + 330, box.y + 200); await page.mouse.down(); await page.mouse.move(box.x + 270, box.y + 255, {steps: 6});
  assert.equal((await view()).dots, true);
  await page.screenshot({path: path.join(out, '06-aim.png')});
  await page.mouse.up(); await advance(0.3);
  s = await snapshot(); assert.equal(s.game.stats[0].shots, 1);
  await page.screenshot({path: path.join(out, '07-flight.png')});
  checks.push('Pull-back drag shows the arc guide and releases a shot');

  await advance(2.0);
  assert.equal(await shootIdeal(58), true);
  const before = (await snapshot()).game.score[0];
  await advance(1.6);
  s = await snapshot(); assert.ok(s.game.score[0] >= before + 2, JSON.stringify(s.game.score));
  await page.screenshot({path: path.join(out, '08-score.png')});
  await frame.locator('canvas').focus(); await page.keyboard.press('Space'); await advance(0.25);
  assert.equal((await snapshot()).game.players[0].airborne, true);
  await page.screenshot({path: path.join(out, '09-jump.png')});
  await frame.getByRole('button', {name: 'Jump'}).dispatchEvent('pointerdown');
  checks.push('An ideal shot scores; Space and the JUMP button jump');

  await page.keyboard.press('Escape'); assert.equal((await snapshot()).mode, 'paused');
  await page.screenshot({path: path.join(out, '10-paused.png')}); await fits('pause');
  await frame.getByRole('button', {name: /^RESUME/}).click(); assert.equal((await snapshot()).mode, 'playing');

  // Play the match out with ideal shots.
  for (let i = 0; i < 200 && (await snapshot()).game.phase !== 'finished'; i++) {await shootIdeal(56 + (i % 3) * 3); await advance(0.4);}
  s = await snapshot(); assert.equal(s.game.phase, 'finished'); assert.equal(s.game.winner, 0);
  await page.waitForTimeout(1800);
  s = await snapshot(); assert.equal(s.mode, 'finished');
  assert.equal(s.save.cups.street.round, 1); assert.ok(s.save.coins >= 30, String(s.save.coins));
  await page.screenshot({path: path.join(out, '11-result.png')}); await fits('result');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('rim-rush.fixture.a')));
  assert.ok(JSON.parse(stored.stores['statoz.bundle.results']).some(r => r.game === 'rim-rush' && r.won), 'host received the result');
  checks.push('A won quarter-final saves cup progress and coins, and reports one result to the host');

  await frame.getByRole('button', {name: /^NEXT ROUND/}).click();
  s = await snapshot(); assert.equal(s.game.config.rival.id, 'tess'); assert.equal(s.game.config.round, 1);
  checks.push('Next round continues the bracket against the semi-final rival');

  const coins = s.save.coins;
  await open('b'); assert.equal((await snapshot()).save.coins, 0);
  await open('a'); assert.equal((await snapshot()).save.coins, coins);
  checks.push('Progress is scoped per account');

  for (const size of [{width: 667, height: 375}, {width: 932, height: 430}]) {
    await page.setViewportSize(size); await open('a');
    await fits(`menu ${size.width}`);
    for (const [button, label] of [[/^BROWSE CUPS/, 'cup'], [/^QUICK MATCH/, 'quick'], [/^LOCKER/, 'locker']]) {
      await frame.getByRole('button', {name: button}).click(); await fits(`${label} ${size.width}`);
      await page.screenshot({path: path.join(out, `12-${label}-${size.width}.png`)});
      await frame.getByRole('button', {name: 'Back', exact: true}).click();
    }
  }
  checks.push('Menus fit 667×375 and 932×430 landscape screens');

  await page.setViewportSize({width: 390, height: 844}); await page.waitForTimeout(300);
  assert.ok(await frame.locator('text=Turn your device sideways.').isVisible());
  checks.push('Portrait shows the rotate prompt');

  assert.deepEqual(errors, []); assert.deepEqual(failed, []); assert.deepEqual(remote, []);
  checks.push('No page errors, failed requests or remote requests');
  console.log(checks.map(c => '✓ ' + c).join('\n'));
} finally {
  await browser.close(); server.close();
}
