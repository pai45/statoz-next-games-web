// Yorker gameplay in a real browser: the offline bundle inside the fixture host, driven through the UI and the
// manual clock. Screenshots go to test-results/yorker/. Run `npm run build:yorker` first.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {createYorkerServer} from '../scripts/preview-yorker.mjs';

const out = path.resolve('test-results/yorker'); await fs.mkdir(out, {recursive: true});
const server = createYorkerServer(); await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = 'http://127.0.0.1:'+server.address().port;
const executablePath = process.env.CHROME_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const browser = await chromium.launch({...(executablePath ? {executablePath} : {channel: 'chrome'}), headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
const context = await browser.newContext({viewport: {width: 1280, height: 720}, deviceScaleFactor: 1, hasTouch: true});
const page = await context.newPage(), errors = [], failed = [], remote = [], checks = [];
page.on('pageerror', e => errors.push(e.message));
// Failed responses are tracked below with their URL; the console copy of a 404 carries none.
page.on('console', m => {if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 300));});
page.on('response', r => {if (r.status() >= 400 && !r.url().endsWith('/favicon.ico')) failed.push(r.url());});
page.on('request', r => {if (/^https?:/.test(r.url()) && !r.url().startsWith(origin)) remote.push(r.url());});
let frame;
const open = async (account = 'a') => {
  frame = null;
  await page.goto(`${origin}/fixture?account=${account}&manual=1`);
  for (let i = 0; i < 200 && !frame?.url().includes('/embedded-games/yorker/'); i++) {frame = page.frames().find(f => f.url().includes('/embedded-games/yorker/')); await page.waitForTimeout(50);}
  await frame.waitForFunction(() => window.__YORKER_INSPECT__?.snapshot().mode === 'menu', null, {timeout: 120000});
};
const snap = () => frame.evaluate(() => window.__YORKER_INSPECT__.snapshot());
const act = (name, ...args) => frame.evaluate(([n, a]) => window.__YORKER_INSPECT__.act[n](...a), [name, args]);
const advance = async t => {await frame.evaluate(t => window.__YORKER_INSPECT__.advance(t), t); await page.waitForTimeout(80);};
// SwiftShader can take longer than Playwright's default while flushing a newly lit 3D scene.
const shot = async name => {await page.waitForTimeout(250); await page.screenshot({path: path.join(out, name+'.png'), timeout: 120000});};
// Every 120 Hz engine step still runs; only phase polling/rendering is coarser. Keep the original simulated deadline.
const until = async (test, limit = 200, stepSeconds = .5) => {const polls = Math.ceil(limit*.1/stepSeconds); for (let i = 0; i < polls; i++) {const s = await snap(); if (test(s)) return s; await advance(stepSeconds);} throw Error('timed out: '+JSON.stringify((await snap()).match?.phase));};
/** One ball through the real controls: keyboard target nudges are skipped; the target is set directly, Space bowls and releases. */
const bowlBall = async ({x = .08, z = -5.4, delivery, meter = .86, review = true, name} = {}) => {
  await until(s => s.mode === 'finished' || s.match?.phase === 'plan');
  if ((await snap()).mode === 'finished') return null;
  await act('target', x, z); if (delivery) await act('delivery', delivery);
  await frame.locator('canvas').focus(); await page.keyboard.press('Space');
  assert.equal((await snap()).match.phase, 'runup');
  await act('releaseAt', meter); await advance(.02);
  if (name) {await advance(.25); await shot(name+'-flight');}
  const before = (await snap()).match.checkpoint;
  let reviewed = false;
  const done = await until(s => {if (s.match?.phase === 'review') return true; return s.mode === 'finished' || (s.match && s.match.checkpoint > before);}, 400);
  if (done.match?.phase === 'review') {if (name) await shot(name+'-review'); await act('review', review); reviewed = true; if (review) {await advance(4); if (name) await shot(name+'-tracking');} await until(s => s.mode === 'finished' || s.match.checkpoint > before, 400);}
  const s = await snap();
  return {result: s.match?.results.at(-1), reviewed, s};
};

try {
  await open(); await shot('01-menu');
  checks.push('Offline bundle boots with local assets and reaches the menu');

  // Academy lesson 1 with the coach.
  await frame.getByRole('button', {name: /^ACADEMY/}).click(); await shot('02-academy');
  await frame.getByRole('button', {name: /Line & Length/}).click(); await advance(.1); await shot('03-coach');
  let s = await snap(); assert.equal(s.coach, 0); assert.equal(s.match.phase, 'plan');
  assert.equal(await frame.getByRole('button', {name: /^BOWL/}).isDisabled(), true, 'coach holds the first ball until acknowledged');
  await frame.getByRole('button', {name: 'GOT IT'}).click(); await advance(.1);
  await act('target', .1, -5.6); await advance(.1); s = await snap(); assert.equal(s.coach, 2, 'placing the target in the box advances the coach');
  await shot('04-lesson-plan');
  let ball = await bowlBall({x: .1, z: -5.6, name: '05-lesson'});
  assert.ok(ball.result.pitch, 'the ball pitched'); checks.push('Lesson coach steps advance on target, bowl and release');
  for (let i = 0; i < 6 && (await snap()).mode !== 'finished'; i++) await bowlBall({x: .1, z: -5.7});
  s = await until(st => st.mode === 'finished'); assert.equal(s.match.result.won, true, 'three balls in the box win the lesson'); await shot('06-lesson-done');
  assert.ok(s.save.lessons.includes('lesson-length')); checks.push('Lesson completion is saved');

  // Career spell 1 against the tail.
  await frame.getByRole('button', {name: /^MENU/}).click();
  await frame.getByRole('button', {name: /^BROWSE SPELLS/}).click(); await shot('07-career');
  await frame.getByRole('button', {name: /First Spell/}).click(); await shot('08-brief');
  await frame.getByRole('button', {name: /TAKE THE BALL/}).click(); await advance(.1); await shot('09-plan');
  const plans = [{x: .05, z: -1.6, delivery: 'seam'}, {x: .16, z: -5.3, delivery: 'outswing'}, {x: .02, z: -4.6, delivery: 'inswing'}, {x: .05, z: -5, delivery: 'slower'}];
  const seen = new Set();
  for (let i = 0; i < 14 && (await snap()).mode !== 'finished'; i++) {
    const r = await bowlBall({...plans[i%plans.length], name: i < 3 ? `1${i}-ball` : undefined});
    if (r?.result) seen.add(r.result.tone);
  }
  s = await until(st => st.mode === 'finished'); await shot('20-spell-result');
  assert.ok(s.match.result, 'the spell finishes'); assert.ok(s.match.legal <= 12);
  checks.push(`Spell finished (${s.match.result.won ? 'won' : 'lost'}, ${s.match.runs}/${s.match.wickets} in ${s.match.legal} balls; outcomes ${[...seen].join(', ')})`);

  // A full death over: every ball is bowled, so runs, boundaries and reviews show up.
  await frame.getByRole('button', {name: /^MENU/}).click();
  await act('start', 'spell-2'); await advance(.1);
  const over = [{x: .03, z: -1.5}, {x: .3, z: -9.5}, {x: .1, z: -5.6, delivery: 'outswing'}, {x: .02, z: -4.6, delivery: 'inswing'}, {x: .05, z: -1.0}, {x: .05, z: -6, delivery: 'slower'}];
  for (let i = 0; i < 9 && (await snap()).mode !== 'finished'; i++) {const r = await bowlBall({...over[i%over.length], name: i === 1 || i === 3 ? `3${i}-over` : undefined}); if (r?.result) seen.add(r.result.tone);}
  s = await until(st => st.mode === 'finished'); await shot('40-over-result');
  checks.push(`Death over finished (${s.match.result.won ? 'defended' : 'lost'}, ${s.match.runs}/${s.match.wickets}; outcomes ${[...seen].join(', ')})`);

  // Reload: progress persists through the host save.
  await open(); s = await snap(); assert.ok(s.save.spells['spell-1'], 'spell record survives a reload'); checks.push('Career record persists across reload');
  if (process.env.YORKER_CAPTURE_COVER) {
    // Deliberate cover refresh from real gameplay: a night spell mid-delivery with the HUD hidden.
    await act('start', 'spell-11'); await advance(.1);
    await act('target', .02, -1.7); await frame.locator('canvas').focus(); await page.keyboard.press('Space');
    await act('releaseAt', .86); await advance(.3);
    await frame.evaluate(() => document.querySelector('[data-yorker]').setAttribute('data-capture', ''));
    await page.waitForTimeout(400); await page.screenshot({path: path.join(out, 'cover-raw.png'), timeout: 120000});
    const sharp = (await import('sharp')).default;
    await sharp(path.join(out, 'cover-raw.png')).png({palette: true, quality: 88, effort: 10}).toFile('public/games/yorker/cover.png');
    checks.push('Cover refreshed from gameplay');
  }
  assert.deepEqual(failed, [], 'no failed requests'); assert.deepEqual(remote, [], 'no remote requests');
  assert.deepEqual(errors, [], 'no page errors');
  console.log('PASS\n- '+checks.join('\n- '));
} catch (e) {
  await shot('zz-failure').catch(() => {});
  console.error('FAIL', e, '\nchecks so far:\n- '+checks.join('\n- '), '\nerrors:', errors.slice(0, 10), '\nfailed:', failed.slice(0, 10));
  process.exitCode = 1;
} finally {await browser.close(); server.close();}
