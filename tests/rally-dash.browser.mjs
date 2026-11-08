// Rally Dash in a real browser: the home and event screens on a desktop window and a phone held
// sideways and upright (the upright phone gets the rotated landscape frame), keyboard and touch
// driving, the handbrake, pause, a full Stage Attack and Rallycross to their result cards, the
// v1 save, the old /play/grand-prix address, and frame cost from the game's own counters.
//   npm run test:rally-dash:browser                (starts its own dev server)
//   npm run test:rally-dash:browser -- --url=http://localhost:3000
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import next from 'next';
import { chromium } from '@playwright/test';

const root = process.cwd();
const out = path.join(root, 'test-results/rally-dash');
await fs.mkdir(out, { recursive: true });
const existing = process.argv.find((value) => value.startsWith('--url='))?.slice(6);
const app = existing ? null : next({ dev: true, dir: root });
await app?.prepare();
const handler = app?.getRequestHandler();
const server = existing ? null : http.createServer((request, response) => void handler(request, response));
if (server) await new Promise((resolve) => server.listen(0, 'localhost', resolve));
const origin = existing || `http://localhost:${server.address().port}`;
const browser = await chromium.launch({
  executablePath: process.env.MOBILE_VIEWPORT_CHROMIUM || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const saveKey = 'statoz.games.web.rally-dash.v1';
const oldKey = 'statoz.games.web.grandprix.v2';
const oldSave = JSON.stringify({ version: 2, rulesVersion: 2, setup: { team: 4 }, records: {}, recent: [], tutorialSeen: true });
const errors = [];
const checks = [];
const check = (label, value = true) => { checks.push({ label, value }); console.log(`✓ ${label}`); };

async function open(options, route = '/play/rally') {
  const context = await browser.newContext(options);
  await context.addInitScript(({ oldKey, oldSave }) => {
    if (sessionStorage.getItem('rd-seeded')) return;
    sessionStorage.setItem('rd-seeded', '1');
    localStorage.setItem('statoz.games.web.auth.v2', JSON.stringify({ version: 2, authenticated: true, email: 'rally@example.test' }));
    localStorage.setItem('statoz.games.web.accounts.v1', JSON.stringify({ version: 1, accounts: { 'rally@example.test': { onboardingComplete: true } } }));
    localStorage.setItem(oldKey, oldSave);
  }, { oldKey, oldSave });
  const page = await context.newPage();
  const tag = `${options.viewport.width}x${options.viewport.height}`;
  page.on('pageerror', (error) => errors.push(`${tag}: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error' && !/Download the React DevTools|favicon/.test(message.text())) errors.push(`${tag} console: ${message.text()}`); });
  page.on('response', (response) => { if (response.status() >= 400 && !/favicon/.test(response.url())) errors.push(`${tag} ${response.status()} ${response.url()}`); });
  await page.goto(origin + route, { waitUntil: 'domcontentloaded', timeout: 180000 });
  const mobile = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
  let target = page;
  if (mobile) target = await (await page.locator('iframe[data-mobile-game-frame]').elementHandle({ timeout: 180000 })).contentFrame();
  await target.getByRole('heading', { name: /RALLY/ }).first().waitFor({ timeout: 180000 });
  const size = await target.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  assert.ok(size.width > size.height, `${tag}: landscape layout (${size.width}x${size.height})`);
  return { context, page, target, tag };
}
const fits = (target) => target.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.documentElement.scrollHeight <= innerHeight + 1);
const inside = (target, locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(); return r.top >= -1 && r.left >= -1 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1; });
const inspect = (target, fn, arg) => target.evaluate(([source, value]) => new Function('api', 'value', `return (${source})(api, value)`)(window.__RALLY_DASH_INSPECT__, value), [fn.toString(), arg]);
const snapshot = (target) => inspect(target, (api) => api.snapshot());

// Desktop: home, event screen, keyboard driving, handbrake, pause, full Stage Attack, retry.
{
  const { context, page, target, tag } = await open({ viewport: { width: 1440, height: 900 } });
  assert.ok(await fits(target)); check(`${tag}: home fits without scrolling`);
  await page.screenshot({ path: path.join(out, 'desktop-home.png') });
  await target.getByRole('button', { name: /^Choose a Stage Attack course/ }).click();
  await target.getByRole('button', { name: 'Frostvale', exact: true }).click();
  assert.ok(await fits(target)); check(`${tag}: event screen fits`);
  await target.getByRole('button', { name: 'Pine Ridge', exact: true }).click();
  await page.screenshot({ path: path.join(out, 'desktop-event.png') });
  await target.getByRole('button', { name: /START STAGE/ }).click();
  await target.getByRole('dialog', { name: 'PINE RIDGE' }).getByRole('button', { name: /START STAGE/ }).click();
  await page.waitForFunction(() => window.__RALLY_DASH_INSPECT__?.snapshot().phase === 'running', null, { timeout: 15000 });
  check(`${tag}: countdown hands over to the stage`);
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(1800);
  const moving = await snapshot(target);
  assert.ok(moving.player.speed > 8, `keyboard gas moves the car (${moving.player.speed})`); check(`${tag}: keyboard gas (${(moving.player.speed * 3.6).toFixed(0)} km/h)`);
  assert.ok(moving.notes.length >= 1); check(`${tag}: pace notes are being called`);
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('Space');
  await page.waitForTimeout(450);
  const drift = await snapshot(target);
  await page.keyboard.up('Space');
  await page.keyboard.up('ArrowRight');
  await page.keyboard.up('ArrowUp');
  assert.ok(drift.player.slip > 1.5, `handbrake slides the car (${drift.player.slip})`); check(`${tag}: handbrake drift (slip ${drift.player.slip.toFixed(1)} m/s)`);
  await page.screenshot({ path: path.join(out, 'desktop-drift.png') });
  await page.keyboard.press('Escape');
  await target.getByRole('dialog', { name: 'PAUSED' }).waitFor();
  const paused = (await snapshot(target)).raceClock;
  await page.waitForTimeout(500);
  assert.equal((await snapshot(target)).raceClock, paused); check(`${tag}: Escape pauses and the clock stops`);
  await target.getByRole('button', { name: /RESUME/ }).click();
  await inspect(target, (api) => api.autopilot(true));
  await page.waitForFunction(() => window.__RALLY_DASH_INSPECT__.snapshot().phase === 'running', null, { timeout: 5000 });
  await page.waitForTimeout(3000);
  const perf = await inspect(target, (api) => api.perf());
  check(`${tag}: frame cost step ${perf.stepMs.toFixed(2)} ms, render ${perf.renderMs.toFixed(2)} ms, ${perf.tiles} tiles (${perf.tileMB} MB)`, perf);
  await inspect(target, (api) => api.advance(800));
  await inspect(target, (api) => { const s = api.session; s.cars[0].x += 300; s.cars[0].px = s.cars[0].x; });
  await page.waitForTimeout(1500);
  const trails = await snapshot(target);
  assert.ok(trails.marks > 20 && trails.longestMark < 3.6, `tyre marks never bridge gaps (${trails.marks} marks, longest ${trails.longestMark})`); check(`${tag}: tyre tracks stay short segments, even after the car jumps (${trails.marks} marks, longest ${trails.longestMark.toFixed(2)})`);
  await inspect(target, (api) => api.advance(150000, 'auto'));
  const result = target.getByRole('dialog').filter({ hasText: 'PINE RIDGE · STAGE ATTACK' });
  await result.waitFor({ timeout: 15000 });
  assert.ok(await inside(target, result.getByRole('button', { name: /RETRY/ }))); check(`${tag}: stage result with medal ladder and retry`);
  await page.screenshot({ path: path.join(out, 'desktop-result.png') });
  const save = JSON.parse(await page.evaluate((key) => localStorage.getItem(key), saveKey));
  assert.equal(save.version, 1);
  assert.equal(save.recent.length, 1);
  assert.ok(Object.keys(save.records).some((key) => key.startsWith('pine-ridge:'))); check(`${tag}: best time and ghost saved under ${saveKey}`);
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), oldKey), oldSave); check(`${tag}: the old Grand Prix Dash save is untouched`);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__RALLY_DASH_INSPECT__?.snapshot().phase === 'countdown', null, { timeout: 10000 });
  check(`${tag}: retry restarts straight into the countdown`);
  await context.close();
}

const box = (target, locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; });
const overlaps = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
const touchAt = (locator, type, id, x, y) => locator.dispatchEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: true, button: 0, clientX: x, clientY: y, bubbles: true });

// Phones held sideways: touch driving (auto gas, slide steering, handbrake) and a full Rallycross on Red Mesa.
for (const [width, height, dpr] of [[844, 390, 3], [667, 375, 2]]) {
  const { context, page, target, tag } = await open({ viewport: { width, height }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true });
  assert.ok(await fits(target)); check(`${tag}: home fits`);
  await target.getByRole('button', { name: /^Rallycross: six cars/ }).click();
  await target.getByRole('button', { name: 'Red Mesa', exact: true }).click();
  assert.ok(await fits(target)); check(`${tag}: rallycross event screen fits`);
  assert.ok(await inside(target, target.getByRole('button', { name: /TO THE GRID/ }))); check(`${tag}: start button is on screen`);
  await page.screenshot({ path: path.join(out, `phone-${width}-event.png`) });
  await target.getByRole('button', { name: /TO THE GRID/ }).click();
  await target.getByRole('dialog').getByRole('button', { name: /TO THE GRID/ }).click();
  await target.waitForFunction(() => window.__RALLY_DASH_INSPECT__?.snapshot().phase === 'running', null, { timeout: 15000 });
  assert.equal(await target.getByRole('button', { name: 'Accelerate' }).count(), 0); check(`${tag}: first touch visit starts with auto gas (no gas pedal)`);
  await page.waitForTimeout(1500);
  const rolling = await snapshot(target);
  assert.ok(rolling.player.speed > 5, `auto gas moves the car (${rolling.player.speed})`); check(`${tag}: auto gas (${(rolling.player.speed * 3.6).toFixed(0)} km/h)`);
  const pad = target.getByRole('group', { name: /Steering pad/ }), padBox = await box(target, pad), mid = padBox.top + padBox.height / 2;
  await touchAt(pad, 'pointerdown', 21, padBox.right - 8, mid);
  const right = (await snapshot(target)).input.steer;
  await touchAt(pad, 'pointermove', 21, padBox.left + padBox.width / 2, mid);
  const centre = (await snapshot(target)).input.steer;
  await touchAt(pad, 'pointerup', 21, padBox.left + padBox.width / 2, mid);
  const released = (await snapshot(target)).input.steer;
  assert.ok(right > .9 && Math.abs(centre) < .05 && released === 0, `slide steering ${right} / ${centre} / ${released}`); check(`${tag}: slide pad steers (edge ${right.toFixed(2)}, centre ${centre.toFixed(2)}, released ${released})`);
  const handbrake = target.getByRole('button', { name: 'Handbrake', exact: true });
  await handbrake.dispatchEvent('pointerdown', { pointerId: 22, pointerType: 'touch', isPrimary: true, button: 0 });
  const pulled = (await snapshot(target)).input.handbrake;
  await handbrake.dispatchEvent('pointerup', { pointerId: 22, pointerType: 'touch', isPrimary: true, button: 0 });
  assert.ok(pulled && !(await snapshot(target)).input.handbrake); check(`${tag}: handbrake holds while pressed`);
  const pedals = [await box(target, handbrake), await box(target, target.getByRole('button', { name: 'Brake', exact: true }))];
  assert.ok(pedals.every((b) => b.width >= 44 && b.height >= 44) && padBox.height >= 44); check(`${tag}: touch controls are at least 44px`);
  const hud = [target.getByRole('list', { name: 'Standings' }), target.getByRole('button', { name: 'Pause' })];
  for (const item of hud) for (const control of [padBox, ...pedals]) assert.ok(!overlaps(await box(target, item), control), `${tag}: HUD clear of controls`);
  check(`${tag}: standings and buttons stay clear of the touch controls`);
  await page.screenshot({ path: path.join(out, `phone-${width}-race.png`) });
  await inspect(target, (api) => api.advance(400000, 'auto'));
  const result = target.getByRole('dialog').filter({ hasText: 'RED MESA · RALLYCROSS' });
  await result.waitFor({ timeout: 15000 });
  assert.equal(await result.locator('tbody tr').count(), 6);
  assert.ok(await inside(target, result.getByRole('button', { name: /RETRY/ }))); check(`${tag}: six-car classification with retry on screen`);
  await page.screenshot({ path: path.join(out, `phone-${width}-result.png`) });
  await context.close();
}

// Phone held upright: the rotated frame still gives the game a landscape screen. Old address and reduced motion.
{
  const { context, page, tag } = await open({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }, '/play/grand-prix');
  check(`${tag}: /play/grand-prix opens Rally Dash in the landscape frame (reduced motion)`);
  await page.screenshot({ path: path.join(out, 'phone-upright.png') });
  await context.close();
}

assert.deepEqual(errors, []); check('no page errors, console errors or failed requests');
await fs.writeFile(path.join(out, 'checks.json'), JSON.stringify({ origin, checks }, null, 2));
await browser.close();
server?.close();
await app?.close?.();
process.exit(0);
