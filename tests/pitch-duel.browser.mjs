// Fot Duel in a real browser, landscape: the first-run debut XI reveal, phones held sideways and upright
// (the upright phone gets the rotated landscape frame), a desktop window, the
// drag-and-drop lineup, a full eleven-a-side match to the result screen, the
// v4 save, and a v3 save moving onto eleven a side.
//   npm run test:pitch-duel:browser            (starts its own dev server)
//   npm run test:pitch-duel:browser -- --url=http://localhost:3000
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import next from 'next';
import { chromium } from '@playwright/test';

const root = process.cwd();
const out = path.join(root, 'test-results/pitch-duel');
await fs.mkdir(out, { recursive: true });
const existing = process.argv.find((value) => value.startsWith('--url='))?.slice(6);
const app = existing ? null : next({ dev: true, dir: root });
await app?.prepare();
const handler = app?.getRequestHandler();
const server = existing ? null : http.createServer((request, response) => void handler(request, response));
if (server) await new Promise((resolve) => server.listen(0, 'localhost', resolve));
const origin = existing || `http://localhost:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.MOBILE_VIEWPORT_CHROMIUM || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--enable-unsafe-swiftshader'] });
const errors = [];

const owned = {
  players: ['arg-lionel-messi', 'arg-lautaro-martinez', 'arg-julian-alvarez', 'arg-rodrigo-de-paul', 'arg-cristian-romero', 'arg-lisandro-martinez', 'arg-nahuel-molina', 'arg-emiliano-martinez', 'bra-alisson-becker'],
  actions: ['act1-gold', 'act2-silver', 'act7-bronze', 'act15-gold', 'act16-bronze'],
};

async function seeded(options, extra = {}) {
  const context = await browser.newContext(options);
  await context.addInitScript(({ ids, extra }) => {
    if (sessionStorage.getItem('pd-seeded')) return;
    sessionStorage.setItem('pd-seeded', '1');
    localStorage.setItem('statoz.games.web.auth.v2', JSON.stringify({ version: 2, authenticated: true, email: 'pitch-duel@example.test' }));
    localStorage.setItem('statoz.games.web.accounts.v1', JSON.stringify({ version: 1, accounts: { 'pitch-duel@example.test': { onboardingComplete: true } } }));
    localStorage.setItem('statoz.games.web.economy.v1', JSON.stringify({
      version: 1, coins: 500, owned: { playerCardIds: ids.players, actionCardIds: ids.actions },
      starterClaims: { football: { claimedAt: new Date().toISOString(), playerCardIds: ids.players.slice(0, 5), actionCardIds: ids.actions } }, transactions: [],
    }));
    for (const [key, value] of Object.entries(extra)) localStorage.setItem(key, value);
  }, { ids: owned, extra });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(`${options.viewport.width}x${options.viewport.height}: ${error.message}`));
  return { context, page };
}

/**
 * Signing day: a fresh career opens on the debut XI reveal. Opens the pack,
 * taps through a few signings (or skips straight away), checks the finale and
 * that the eleven were granted and saved as the club, then goes to the club house.
 */
async function signDebut(page, label, target, { watch = false } = {}) {
  await target.locator('[data-pitch-duel-option="debut-open"]').waitFor({ timeout: 60000 });
  assert.ok(await fits(target), `${label}: the debut pack must not scroll the page`);
  await checkTargets(target, `${label} debut pack`);
  if (watch) await page.screenshot({ path: path.join(out, `${label}-debut-pack.png`) });
  await target.locator('[data-pitch-duel-option="debut-open"]').click();
  if (watch) {
    const spot = target.locator('[data-pitch-duel-option="debut-next"]');
    await spot.waitFor({ timeout: 10000 });
    await page.screenshot({ path: path.join(out, `${label}-debut-card.png`) });
    for (let i = 0; i < 6; i += 1) await spot.click({ timeout: 3000 }).catch(() => {});
    assert.ok(await fits(target), `${label}: the reveal must not scroll the page`);
  }
  await target.locator('[data-pitch-duel-option="debut-skip"]').click();
  await target.locator('[data-pitch-duel-option="debut-club"]').waitFor({ timeout: 10000 });
  await checkTargets(target, `${label} debut finale`);
  assert.ok(await fits(target), `${label}: the debut finale must not scroll the page`);
  if (watch) await page.screenshot({ path: path.join(out, `${label}-debut-finale.png`) });
  const saved = await target.evaluate(() => JSON.parse(localStorage.getItem('statoz.games.web.pitch-duel.v4') ?? 'null'));
  assert.equal(saved?.debut?.outfield?.length, 10, `${label}: the debut XI is drawn and saved before it is signed`);
  await target.locator('[data-pitch-duel-option="debut-club"]').click();
  await target.locator('[data-pitch-duel-screen="home"]').waitFor({ timeout: 30000 });
  const after = await target.evaluate(() => ({
    career: JSON.parse(localStorage.getItem('statoz.games.web.pitch-duel.v4')),
    owned: JSON.parse(localStorage.getItem('statoz.games.web.economy.v1')).owned.playerCardIds,
  }));
  const eleven = [after.career.debut.keeperId, ...after.career.debut.outfield];
  assert.equal(after.career.debut.claimed, true, `${label}: the debut is signed once`);
  assert.deepEqual([after.career.club.keeperId, ...after.career.club.outfield], eleven, `${label}: the debut XI becomes the club`);
  assert.ok(eleven.every((id) => after.owned.includes(id)), `${label}: the eleven are granted`);
}

/**
 * Opens Fot Duel. On a phone the game runs inside the landscape frame, so the
 * checks run in that frame; on a desktop window they run in the page itself.
 * A fresh career signs its debut XI first.
 */
async function open(page, label, { watchDebut = false } = {}) {
  await page.goto(`${origin}/play/pitch-duel`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  const mobile = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
  let target = page;
  if (mobile) {
    const handle = await page.locator('iframe[data-mobile-game-frame]').elementHandle({ timeout: 180000 });
    target = await handle.contentFrame();
  }
  await target.locator('[data-pitch-duel-screen="home"], [data-pitch-duel-screen="debut"]').first().waitFor({ timeout: 180000 });
  if (await target.locator('[data-pitch-duel-screen="debut"]').count()) await signDebut(page, label, target, { watch: watchDebut });
  await target.locator('[data-pitch-duel-screen="home"]').waitFor({ timeout: 180000 });
  const size = await target.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  assert.ok(size.width > size.height, `${label}: the game is laid out in landscape (${size.width}x${size.height})`);
  return { target, size };
}

const fits = (target) => target.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.documentElement.scrollHeight <= innerHeight + 1);

async function checkTargets(target, label) {
  // Let the buttons finish dealing in before measuring them (looping animations never finish).
  await target.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))));
  const bad = await target.evaluate(() => [...document.querySelectorAll('[data-pitch-duel-option]')].map((el) => {
    const r = el.getBoundingClientRect();
    return { id: el.getAttribute('data-pitch-duel-option'), w: r.width, h: r.height, inside: r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1 };
  }).filter((t) => t.w < 44 || t.h < 44 || !t.inside));
  assert.deepEqual(bad, [], `${label}: every option must be on screen and at least 44px`);
}

/** Taps through a whole match, then waits for the result screen. */
async function playMatch(page, label, target = page) {
  const shot = (name) => page.screenshot({ path: path.join(out, `${label}-${name}.png`) });
  await target.locator('[data-pitch-duel-option="play-match"]').click();
  await target.locator('[data-pitch-duel-screen="prematch"]').waitFor({ timeout: 30000 });
  assert.ok(await fits(target), `${label}: prematch must not scroll the page`);
  await target.locator('[data-pitch-duel-option="kick-off"]').click();
  await target.locator('[data-pitch-duel-screen="match"]').waitFor({ timeout: 30000 });
  assert.ok(await fits(target), `${label}: match screen must not scroll`);
  await target.getByRole('button', { name: /^KICK OFF$/ }).click();
  await checkTargets(target, label);
  await shot('match');
  let scenes = 0;
  let goals = 0;
  for (let i = 0; i < 400; i += 1) {
    const finish = target.getByRole('button', { name: /^SEE THE RESULT$/ });
    if (await finish.count()) {
      await shot('fulltime');
      await finish.first().click();
      break;
    }
    const goal = target.locator('#pd-goal-title');
    if (await goal.count()) {
      if (!goals) await shot('goal');
      goals += 1;
      await target.locator('[role="dialog"]').getByRole('button', { name: /CONTINUE/ }).click({ timeout: 3000 }).catch(() => {});
      continue;
    }
    const scene = target.locator('[data-kind][data-role]');
    if (await scene.count()) {
      if (!scenes) {
        await checkTargets(target, `${label} set piece`);
        await shot('set-piece');
      }
      scenes += 1;
    }
    const nextButton = target.getByRole('button', { name: /^(NEXT|CONTINUE|START SECOND HALF|KICK OFF)$/ });
    // A plain reveal also moves on by itself, so the button can vanish before the tap lands.
    if (await nextButton.count()) { await nextButton.first().click({ timeout: 3000 }).catch(() => {}); continue; }
    const options = target.locator('[data-pitch-duel-option]');
    const count = await options.count();
    if (count) { await options.nth(i % count).click({ timeout: 5000 }).catch(() => {}); continue; }
    await target.waitForTimeout(100);
  }
  await target.locator('[data-pitch-duel-summary]').waitFor({ timeout: 30000 });
  await shot('summary');
  return { scenes, goals };
}

/** The XI as the lineup editor shows it: place → aria label. */
const lineupLabels = (page) => page.locator('[data-place]').evaluateAll((els) => Object.fromEntries(els.map((el) => [el.getAttribute('data-place'), el.getAttribute('aria-label')])));

async function editLineup(page, label, target = page) {
  await target.getByRole('button', { name: /^Your squad/i }).click();
  await target.locator('[data-pitch-duel-screen="lineup"]').waitFor({ timeout: 30000 });
  assert.equal(await target.locator('[data-place]').count(), 11, `${label}: eleven places`);
  assert.ok(await fits(target), `${label}: lineup must not scroll the page`);
  await checkTargets(target, `${label} lineup`);
  await page.screenshot({ path: path.join(out, `${label}-lineup.png`) });

  // Drag place 0 onto place 1: the two players swap.
  const before = await lineupLabels(target);
  const a = await target.locator('[data-place="0"]').boundingBox();
  const b = await target.locator('[data-place="1"]').boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 12, a.y + a.height / 2 + 6, { steps: 3 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();
  const swapped = await lineupLabels(target);
  const name = (text) => text.split(': ')[1];
  assert.equal(name(swapped['0']), name(before['1']), `${label}: drag swaps the players`);
  assert.equal(name(swapped['1']), name(before['0']), `${label}: drag swaps both ways`);

  // Tap a place, then a squad card: the card comes in.
  await target.locator('[data-place="9"]').click();
  const incoming = target.locator('[data-bench] button').first();
  const incomingName = (await incoming.getAttribute('aria-label')).replace(/^Bring in /, '').split(',')[0];
  await incoming.click();
  const after = await lineupLabels(target);
  assert.ok(after['9'].includes(incomingName), `${label}: a squad card replaces the picked place`);

  await target.locator('[data-pitch-duel-option="save-lineup"]').click();
  await target.locator('[data-pitch-duel-screen="home"]').waitFor({ timeout: 30000 });
  const saved = await target.evaluate(() => JSON.parse(localStorage.getItem('statoz.games.web.pitch-duel.v4') ?? 'null'));
  assert.equal(saved?.club?.outfield?.length, 10, `${label}: the eleven is saved`);
  return incomingName;
}

try {
  // 1. A phone held sideways (the frame is not turned): lineup drag and tap, then a whole match.
  // 2. A small phone held upright: the frame turns it to 740x360, then a whole match.
  for (const [viewport, lineup] of [[{ width: 844, height: 390 }, true], [{ width: 360, height: 740 }, false]]) {
    const label = `${viewport.width}x${viewport.height}`;
    const { context, page } = await seeded({ viewport, hasTouch: true, isMobile: true });
    const { target, size } = await open(page, label, { watchDebut: lineup });
    assert.ok(await fits(target), `${label}: home must not scroll the page`);
    await checkTargets(target, `${label} home`);
    await page.screenshot({ path: path.join(out, `${label}-home.png`) });
    if (lineup) await editLineup(page, label, target);
    const played = await playMatch(page, label, target);
    const saved = await target.evaluate(() => JSON.parse(localStorage.getItem('statoz.games.web.pitch-duel.v4') ?? 'null'));
    assert.equal(saved?.played, 1, `${label}: the finished match is saved`);
    assert.ok(saved.history[0].decisions >= 26 && saved.history[0].decisions <= 36, `${label}: about thirty decisions`);
    console.log(`${label} (game ${size.width}x${size.height}): ${played.scenes} set-piece screens, ${played.goals} goals`);
    await context.close();
  }

  // 3. A big phone held sideways and a desktop window: every screen fits without scrolling.
  for (const [viewport, phone] of [[{ width: 932, height: 430 }, true], [{ width: 1280, height: 800 }, false]]) {
    const label = `${viewport.width}x${viewport.height}`;
    const { context, page } = await seeded(phone ? { viewport, hasTouch: true, isMobile: true } : { viewport });
    const { target } = await open(page, label);
    assert.ok(await fits(target), `${label}: home must not scroll`);
    await page.screenshot({ path: path.join(out, `${label}-home.png`) });
    await target.getByRole('button', { name: /^Your squad/i }).click();
    await target.locator('[data-pitch-duel-screen="lineup"]').waitFor({ timeout: 30000 });
    assert.ok(await fits(target), `${label}: lineup must not scroll`);
    await checkTargets(target, `${label} lineup`);
    await page.screenshot({ path: path.join(out, `${label}-lineup.png`) });
    await target.locator('[data-pitch-duel-option="save-lineup"]').click();
    await target.locator('[data-pitch-duel-option="play-match"]').click();
    await target.locator('[data-pitch-duel-screen="prematch"]').waitFor({ timeout: 30000 });
    assert.ok(await fits(target), `${label}: prematch must not scroll`);
    await page.screenshot({ path: path.join(out, `${label}-prematch.png`) });
    await target.locator('[data-pitch-duel-option="kick-off"]').click();
    await target.locator('[data-pitch-duel-screen="match"]').waitFor({ timeout: 30000 });
    await target.getByRole('button', { name: /^KICK OFF$/ }).click();
    assert.ok(await fits(target), `${label}: match must not scroll`);
    await checkTargets(target, label);
    await page.screenshot({ path: path.join(out, `${label}-match.png`) });
    await context.close();
  }

  // 4. A v3 five-a-side save opens as an eleven, with its progress.
  {
    const v3 = { version: 3, club: { formation: '1-2-1', keeperId: 'arg-emiliano-martinez', outfield: ['arg-cristian-romero', 'arg-rodrigo-de-paul', 'arg-lionel-messi', 'arg-lautaro-martinez'], tactics: [] }, points: 12, xp: 480, wins: 4, draws: 0, losses: 1, played: 5, goalsFor: 9, goalsAgainst: 4, currentStreak: 2, bestStreak: 3, tutorialSeen: true, history: [], rewardedDivisions: [2], settings: { haptics: true } };
    const { context, page } = await seeded({ viewport: { width: 1280, height: 800 } }, { 'statoz.games.web.pitch-duel.v3': JSON.stringify(v3) });
    await open(page, 'v3 save');
    await page.waitForFunction(() => localStorage.getItem('statoz.games.web.pitch-duel.v4'), null, { timeout: 30000 });
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('statoz.games.web.pitch-duel.v4')));
    assert.equal(saved.version, 4);
    assert.equal(saved.points, 12);
    assert.equal(saved.migratedFrom, 3);
    assert.equal(saved.debut, undefined, "an existing career skips the debut reveal");
    assert.equal(saved.club.outfield.length, 10);
    assert.ok(saved.club.outfield.includes('arg-lionel-messi'), 'old players keep their places');
    assert.ok(await page.getByText(/DIV 2/).first().isVisible(), 'division carries over');
    await context.close();
  }

  assert.deepEqual(errors, []);
  console.log('Passed: debut XI reveal and signing, 844x390 lineup drag + full match, 360x740 upright (rotated) full match, 932x430 and desktop layouts, v3 → v4 save.');
} catch (error) {
  console.log('Fot Duel browser check failed: ' + String(error));
  console.log('Browser errors: ' + JSON.stringify(errors));
  process.exitCode = 1;
} finally {
  await browser.close();
  if (server) { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
  await app?.close();
}
