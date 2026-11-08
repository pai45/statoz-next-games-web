import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createLongbowServer} from '../scripts/preview-longbow.mjs';

const out = path.resolve('test-results/longbow'); await fs.mkdir(out, {recursive: true});
const server = createLongbowServer(); await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({channel: 'chrome', headless: true, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11']});
const context = await browser.newContext({viewport: {width: 1280, height: 720}, deviceScaleFactor: 1, hasTouch: true});
const page = await context.newPage(), errors = [], failed = [], remote = [], checks = [];
page.on('pageerror', e => errors.push(e.message));
page.on('response', r => {if (r.status() >= 400) failed.push(r.url());});
page.on('request', r => {if (/^https?:/.test(r.url()) && !r.url().startsWith(origin)) remote.push(r.url());});

let frame;
const open = async (account = 'a', prefix = '', manual = true) => {
  await page.goto(`${origin}${prefix}/fixture?account=${account}${manual ? '&manual=1' : ''}`);
  frame = page.frames().find(f => f.url().includes('/embedded-games/longbow/'));
  await frame.waitForFunction(() => window.__LONGBOW_INSPECT__?.snapshot().mode === 'menu', null, {timeout: 60000});
};
const snapshot = () => frame.evaluate(() => window.__LONGBOW_INSPECT__.snapshot());
const advance = async t => {await frame.evaluate(t => window.__LONGBOW_INSPECT__.advance(t), t); await page.waitForTimeout(60);};
const aim = (x, y) => frame.evaluate(([x, y]) => window.__LONGBOW_INSPECT__.aim(x, y), [x, y]);
const waitPhase = async (test, limit = 120) => {for (let i = 0; i < limit; i++) {const s = await snapshot(); if (test(s)) return s; await advance(0.1);} throw Error('phase wait timed out: ' + JSON.stringify((await snapshot()).game?.phase));};
/** One player arrow through the real keyboard path: hold Space, aim at the centre, release. */
const shoot = async (x = 0, y = 1.3, hold = 1.4) => {
  await waitPhase(s => s.mode === 'finished' || s.game?.phase === 'ready' && s.game.turn === 'player');
  if ((await snapshot()).mode === 'finished') return;
  await frame.locator('canvas').focus();
  await page.keyboard.down('Space'); await advance(hold); await aim(x, y); await page.keyboard.up('Space');
  const before = (await snapshot()).game.checkpoint;
  await waitPhase(s => s.game.checkpoint > before);
};
const finishGame = async (x = 0, y = 1.3) => {for (let i = 0; i < 40; i++) {const s = await snapshot(); if (s.mode === 'finished') return s; await shoot(x, y);} throw Error('game did not finish');};
const startLevel = async name => {await frame.getByRole('button', {name: /^BROWSE LANES/}).click(); await frame.getByRole('button', {name: new RegExp(name)}).click();};

try {
  await open(); await page.screenshot({path: path.join(out, '01-menu.png')});
  checks.push('Offline bundle boots with local CC0 assets and reaches the menu');

  await frame.getByRole('button', {name: /^BROWSE LANES/}).click();
  assert.equal(await frame.locator('[role=dialog] button[aria-label*="locked"]').count(), 0);
  assert.ok(await frame.getByText(/9 lanes locked/).isVisible());
  assert.equal(await frame.getByRole('tab', {name: /^Pinewood/}).isDisabled(), true);
  await page.screenshot({path: path.join(out, '02-career.png')});
  await frame.getByRole('button', {name: /First Draw/}).click();
  await advance(0.3); await page.screenshot({path: path.join(out, '03-ready.png')});
  await frame.locator('canvas').focus(); await page.keyboard.down('Space'); await advance(1.4); await aim(0, 1.3);
  await page.screenshot({path: path.join(out, '04-drawn.png')});
  let state = await snapshot(); assert.equal(state.game.phase, 'drawing');
  assert.ok((await frame.evaluate(() => window.__LONGBOW_INSPECT__.view())).fov < 25, 'camera zooms at full draw');
  await page.keyboard.up('Space'); await advance(0.1); await page.screenshot({path: path.join(out, '05-flight.png')});
  await waitPhase(s => s.game.phase === 'impact'); await advance(0.4); await page.screenshot({path: path.join(out, '06-impact.png')});
  state = await snapshot(); assert.ok(state.game.last.score >= 9, JSON.stringify(state.game.last));
  state = await finishGame(); await page.screenshot({path: path.join(out, '07-result.png')});
  assert.equal(state.game.stars, 3); assert.equal(state.save.stars['level-01'], 3); assert.equal(state.save.checkpoint, null);
  checks.push('Keyboard draw, aim and release scores in the gold; a cleared lane earns three stars and saves');

  await frame.getByRole('button', {name: /NEXT LANE/}).click(); await advance(0.2);
  state = await snapshot(); assert.equal(state.game.config.level.id, 'level-02');
  const box = await frame.locator('canvas').boundingBox(), cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  const before = state.game.aim;
  await page.mouse.move(cx, cy); await page.mouse.down(); await advance(0.3); await page.mouse.move(cx + 120, cy - 60, {steps: 4});
  state = await snapshot(); assert.equal(state.game.phase, 'drawing'); assert.ok(state.game.aim.x > before.x + 0.05 && state.game.aim.y > before.y + 0.02, JSON.stringify([before, state.game.aim]));
  await advance(1); await page.mouse.up(); state = await snapshot(); assert.equal(state.game.phase, 'flight');
  checks.push('Press-drag-release with a pointer draws, moves the sight with the finger and shoots');

  await waitPhase(s => s.game.phase === 'ready');
  await frame.locator('canvas').focus(); await page.keyboard.down('Space'); await advance(0.05); await page.keyboard.up('Space');
  state = await snapshot(); assert.equal(state.game.phase, 'ready'); assert.equal(state.game.results.length, 1);
  await frame.getByText('Hold until the bow is fully drawn').waitFor();
  checks.push('A dry release (barely drawn) fires nothing and explains why');

  await page.reload(); frame = page.frames().find(f => f.url().includes('/embedded-games/longbow/'));
  await frame.waitForFunction(() => window.__LONGBOW_INSPECT__?.snapshot().mode === 'menu');
  await frame.getByRole('button', {name: /^CONTINUE/}).click();
  state = await snapshot(); assert.equal(state.game.config.level.id, 'level-02'); assert.equal(state.game.results.length, 1); assert.equal(state.game.phase, 'ready');
  checks.push('Reload continues the lane from the last completed arrow');

  await frame.getByRole('button', {name: 'Pause game'}).click(); state = await snapshot(); await advance(2);
  assert.equal((await snapshot()).game.time, state.game.time);
  await frame.getByText('SETTINGS', {exact: true}).click(); await frame.getByRole('checkbox', {name: /Reduce motion/}).check(); await frame.getByRole('button', {name: /RESUME/}).click();
  assert.equal((await snapshot()).save.reducedMotion, true);
  await finishGame();
  checks.push('Pause freezes the range; the reduced-motion preference persists');

  await frame.getByRole('button', {name: /BACK TO LANES/}).click(); await frame.getByRole('button', {name: 'Back', exact: true}).click();
  await frame.getByRole('button', {name: /DUEL A RIVAL/}).click();
  assert.equal(await frame.getByRole('button', {name: /Tamsin Rook/}).isDisabled(), true);
  await page.screenshot({path: path.join(out, '08-rivals.png')});
  await frame.getByRole('button', {name: /Wren Hollis/}).click();
  await shoot(); await waitPhase(s => s.game.turn === 'ai' && s.game.phase === 'ai-aim'); await page.screenshot({path: path.join(out, '09-rival-aiming.png')});
  await waitPhase(s => s.game.phase === 'impact' && s.game.last.shooter === 'ai'); await advance(0.3); await page.screenshot({path: path.join(out, '10-rival-impact.png')});
  state = await finishGame(); await page.screenshot({path: path.join(out, '11-duel-result.png')});
  assert.equal(state.game.results.length, 30); assert.equal(state.save.rivals.wren.played, 1);
  checks.push('A full duel alternates thirty arrows with the rival and records the result');

  await open('b'); state = await snapshot(); assert.deepEqual(state.save.stars, {}); assert.deepEqual(state.save.rivals, {});
  checks.push('A different account fixture starts with its own empty progress');

  await startLevel('First Draw'); await advance(0.3);
  for (const size of [{width: 915, height: 412}, {width: 844, height: 390}, {width: 667, height: 375}]) {
    await page.setViewportSize(size); await page.waitForTimeout(150);
    for (const label of ['Score', 'Back to Archery', 'Pause game']) {
      const r = await frame.getByLabel(label, {exact: true}).first().boundingBox();
      assert.ok(r && r.x >= 0 && r.y >= 0 && r.x + r.width <= size.width && r.y + r.height <= size.height, `${label} at ${size.width}: ${JSON.stringify(r)}`);
    }
    await page.screenshot({path: path.join(out, `mobile-${size.width}.png`)});
  }
  await frame.getByRole('button', {name: 'Pause game'}).click(); await frame.getByRole('button', {name: /EXIT TO MENU/}).click();
  await frame.getByRole('button', {name: /^BROWSE LANES/}).click();
  const dialog = await frame.getByRole('dialog', {name: 'Choose a level'}).boundingBox();
  assert.ok(dialog.y >= 0 && dialog.y + dialog.height <= 375 && dialog.x + dialog.width <= 667, JSON.stringify(dialog));
  await page.screenshot({path: path.join(out, 'mobile-career-667.png')});
  checks.push('HUD and career menu fit three landscape phone viewports without scrolling');

  await frame.getByRole('button', {name: /First Draw/}).click(); await advance(0.2);
  await page.setViewportSize({width: 390, height: 844}); await page.waitForTimeout(150);
  assert.equal((await snapshot()).mode, 'paused'); await page.screenshot({path: path.join(out, 'portrait.png')});
  await page.setViewportSize({width: 844, height: 390}); await page.waitForTimeout(120); await frame.getByRole('button', {name: /RESUME/}).click();
  assert.equal((await snapshot()).mode, 'playing');
  checks.push('Portrait pauses behind a rotate notice; landscape resumes explicitly');

  await page.setViewportSize({width: 1280, height: 720});
  await open('c', '/statoz-games-web'); await page.route('**/games/longbow/**', r => r.abort());
  await startLevel('First Draw'); await finishGame();
  await page.unroute('**/games/longbow/**');
  checks.push('Subdirectory bundle plays a whole lane with asset network access blocked');

  await open('real', '', false); await startLevel('First Draw');
  await frame.waitForFunction(() => window.__LONGBOW_INSPECT__.snapshot().game?.phase === 'ready');
  await frame.locator('canvas').focus(); await page.keyboard.down('Space'); await page.waitForTimeout(1500);
  await aim(0, 1.3); await page.keyboard.up('Space');
  await frame.waitForFunction(() => window.__LONGBOW_INSPECT__.snapshot().game?.results.length === 1, null, {timeout: 10000});
  checks.push('A real-time rendered shot completes from ordinary keyboard input');

  await page.evaluate(() => localStorage.setItem('longbow.fixture.incompatible', JSON.stringify({schemaVersion: 1, stores: {'longbow.progress.v1': '{"schemaVersion":99}'}, resultIds: []})));
  await open('incompatible'); await frame.getByText(/incompatible version/).waitFor();
  await startLevel('First Draw'); await finishGame();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('longbow.fixture.incompatible')).stores['longbow.progress.v1']), '{"schemaVersion":99}');
  checks.push('An incompatible save stays byte-for-byte intact during temporary play');

  const recovery = await browser.newContext({viewport: {width: 900, height: 500}});
  await recovery.addInitScript(() => {window.__QA_WEBGL_DISABLED = true; const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (type, ...args) {return type.startsWith('webgl') && window.__QA_WEBGL_DISABLED ? null : get.call(this, type, ...args);};});
  const recoveryPage = await recovery.newPage(); await recoveryPage.goto(origin + '/fixture?account=recovery');
  const recoveryFrame = recoveryPage.frames().find(f => f.url().includes('/embedded-games/longbow/'));
  await recoveryFrame.locator('[data-mode="error"]').waitFor();
  await recoveryFrame.evaluate(() => {window.__QA_WEBGL_DISABLED = false;});
  await recoveryFrame.getByRole('button', {name: 'RETRY LOADING'}).click();
  await recoveryFrame.waitForFunction(() => window.__LONGBOW_INSPECT__?.snapshot().mode === 'menu');
  await recovery.close();
  checks.push('Unavailable WebGL shows a retry screen that recovers');

  assert.deepEqual(errors, []); assert.deepEqual(failed, []); assert.deepEqual(remote, []);
  await fs.writeFile(path.join(out, 'checks.json'), JSON.stringify({checks, errors, failed, remote, limits: ['Chrome desktop with touch emulation; physical Android/iOS acceptance is still pending.']}, null, 2));
  console.log(JSON.stringify({checks, errors, failed, remote}, null, 2));
} catch (e) {
  await page.screenshot({path: path.join(out, 'failure.png')});
  await fs.writeFile(path.join(out, 'failure.json'), JSON.stringify({error: e.stack, checks, errors, failed, remote}, null, 2));
  throw e;
} finally {await context.close(); await browser.close(); await new Promise(r => server.close(r));}
