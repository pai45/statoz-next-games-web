// Longbow visual gallery: screenshots of every range on desktop and phone, with draw-call and frame-time stats.
// Usage: node tests/longbow-gallery.browser.mjs [--out=test-results/longbow-gallery]
// Build first with `npm run build:longbow`. Compare runs side by side to judge graphics changes.
import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createLongbowServer} from '../scripts/preview-longbow.mjs';

const outArg = process.argv.find(a => a.startsWith('--out='));
const out = path.resolve(outArg ? outArg.slice(6) : 'test-results/longbow-gallery'); await fs.mkdir(out, {recursive: true});
const server = createLongbowServer(); await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = 'http://127.0.0.1:' + server.address().port;
// Uncapped frame rate, so the measured frame times reflect rendering cost rather than the display refresh.
const browser = await chromium.launch({channel: 'chrome', headless: true, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--disable-gpu-vsync', '--disable-frame-rate-limit']});

// Every lane and rival unlocked, so all three ranges can be visited.
const arrows = [3, 3, 6, 6, 6, 6, 6, 6, 6, 9, 6, 6, 6, 6, 6, 6, 6, 9, 6, 9, 6, 6, 6, 6, 6, 6, 6, 9, 9, 9];
const ids = arrows.map((_, i) => `level-${String(i + 1).padStart(2, '0')}`);
const save = {
  schemaVersion: 1, stars: Object.fromEntries(ids.map(id => [id, 3])), best: Object.fromEntries(ids.map((id, i) => [id, arrows[i] * 9])),
  rivals: Object.fromEntries(['wren', 'tamsin', 'odette'].map(id => [id, {played: 1, won: 1, best: 120}])),
  sound: false, reducedMotion: false, checkpoint: null, resultId: null,
};
const scenes = [
  {key: 'meadow', tab: 'Meadow', level: 'Long Grass'},
  {key: 'pine', tab: 'Pinewood', level: 'Timber Line'},
  {key: 'canyon', tab: 'Red Canyon', level: 'Gust Corridor'},
];
const stats = [], errors = [], warnings = [];

async function capture(contextOptions, prefix, full) {
  const context = await browser.newContext(contextOptions), page = await context.newPage();
  page.on('pageerror', e => errors.push(`${prefix}: ${e.message}`));
  page.on('console', m => {if (['error', 'warning'].includes(m.type()) && !(m.location().url ?? '').endsWith('/favicon.ico')) warnings.push(`${prefix}: ${m.text().slice(0, 300)} ${m.location().url ?? ''}`);});
  page.on('response', r => {if (r.status() >= 400 && !r.url().endsWith('/favicon.ico')) warnings.push(`${prefix}: HTTP ${r.status()} ${r.url()}`);});
  const account = 'gallery-' + prefix;
  await page.goto(`${origin}/fixture?account=none`);
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), ['longbow.fixture.' + account, JSON.stringify({schemaVersion: 1, stores: {'longbow.progress.v1': JSON.stringify(save)}, resultIds: []})]);
  await page.goto(`${origin}/fixture?account=${account}&manual=1`);
  const frame = page.frames().find(f => f.url().includes('/embedded-games/longbow/'));
  await frame.waitForFunction(() => window.__LONGBOW_INSPECT__?.snapshot().mode === 'menu', null, {timeout: 60000});
  const snapshot = () => frame.evaluate(() => window.__LONGBOW_INSPECT__.snapshot());
  const advance = async t => {await frame.evaluate(t => window.__LONGBOW_INSPECT__.advance(t), t); await page.waitForTimeout(60);};
  const waitPhase = async test => {for (let i = 0; i < 150; i++) {const s = await snapshot(); if (test(s)) return s; await advance(0.1);} throw Error('phase wait timed out');};
  const frameTimes = () => frame.evaluate(() => new Promise(resolve => {
    const t = []; let last = performance.now();
    const tick = now => {t.push(now - last); last = now; if (t.length < 90) requestAnimationFrame(tick); else {t.shift(); t.sort((a, b) => a - b); resolve({avgMs: +(t.reduce((a, b) => a + b) / t.length).toFixed(1), p95Ms: +t[Math.floor(t.length * 0.95)].toFixed(1)});}};
    requestAnimationFrame(tick);
  }));
  const shot = async (name, clean = false) => {
    if (clean) await frame.evaluate(() => {const s = document.createElement('style'); s.id = '__gallery_clean'; s.textContent = '[data-longbow] > :not(canvas){visibility:hidden !important}'; document.head.append(s);});
    await page.waitForTimeout(120);
    await page.screenshot({path: path.join(out, `${prefix}-${name}.png`)});
    const view = await frame.evaluate(() => window.__LONGBOW_INSPECT__.view());
    stats.push({shot: `${prefix}-${name}`, drawCalls: view.drawCalls, triangles: view.triangles, lowPower: view.lowPower, tier: view.tier});
    if (clean) await frame.evaluate(() => document.getElementById('__gallery_clean')?.remove());
  };

  for (const scene of scenes) {
    await frame.getByRole('button', {name: /^CAREER/}).click();
    await frame.getByRole('tab', {name: new RegExp('^' + scene.tab)}).click();
    await frame.getByRole('button', {name: new RegExp(scene.level)}).click();
    await advance(0.3); await shot(`${scene.key}-ready`, true);
    if (scene.key === 'meadow') stats.push({shot: `${prefix}-meadow-ready-realtime`, ...await frameTimes()});
    await frame.locator('canvas').focus(); await page.keyboard.down('Space'); await advance(1.4);
    await frame.evaluate(() => window.__LONGBOW_INSPECT__.aim(0, 1.3));
    await shot(`${scene.key}-drawn`);
    if (full) {
      await page.keyboard.up('Space'); await advance(0.12); await shot(`${scene.key}-flight`, true);
      await waitPhase(s => s.game.phase === 'impact'); await advance(0.4); await shot(`${scene.key}-impact`, true);
    } else await page.keyboard.up('Space');
    await frame.getByRole('button', {name: 'Pause game'}).click(); await frame.getByRole('button', {name: /SAVE AND QUIT/}).click();
    await page.waitForTimeout(400); await shot(`${scene.key}-menu`, !full);
    if (full) await shot(`${scene.key}-menu-clean`, true);
  }
  stats.push({shot: `${prefix}-menu-realtime`, ...await frameTimes()});
  await context.close();
}

try {
  await capture({viewport: {width: 1280, height: 720}, deviceScaleFactor: 1}, 'desktop', true);
  await capture({viewport: {width: 844, height: 390}, deviceScaleFactor: 3, hasTouch: true, isMobile: true}, 'phone', false);
  await fs.writeFile(path.join(out, 'gallery.json'), JSON.stringify({stats, errors, warnings}, null, 2));
  console.log(JSON.stringify({out, stats, errors, warnings}, null, 2));
  if (errors.length) process.exitCode = 1;
} finally {await browser.close(); await new Promise(r => server.close(r));}
