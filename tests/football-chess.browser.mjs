// Football Chess in a real browser, landscape: the hub, quick match setup,
// team sheets and the match screen on phones held sideways and upright (the
// upright phone gets the rotated landscape frame) and on a desktop window;
// full short matches to the result screen; the v2 save; and a v1 record
// carried over.
//   npm run test:football-chess:browser             (starts its own dev server)
//   npm run test:football-chess:browser -- --url=http://localhost:3000
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import next from 'next';
import { chromium } from '@playwright/test';

const root = process.cwd();
const out = path.join(root, 'test-results/football-chess');
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
const errors = [];
const keeperReleaseScreens = new Set();
const saveKey = 'statoz.games.web.football-chess.v2';
const legacyKey = 'statoz.games.web.footballchess.v1';

/**
 * A signed-in account that has claimed its football starter pack but has no
 * complete deck, so the Academy five play: this is also the check that the
 * launcher lets Football Chess past the full-deck gate.
 */
async function seeded(options, extra = {}) {
  const context = await browser.newContext(options);
  await context.addInitScript(({ extra }) => {
    // Both the host and rotated game frame have a dev toolbar; it can cover
    // the pager on upright phones. Keep development chrome out of UI checks.
    document.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style');
      style.textContent = 'nextjs-portal { display: none !important; }';
      document.head.appendChild(style);
    }, { once: true });
    if (sessionStorage.getItem('fc-seeded')) return;
    sessionStorage.setItem('fc-seeded', '1');
    localStorage.setItem('statoz.games.web.auth.v2', JSON.stringify({ version: 2, authenticated: true, email: 'football-chess@example.test' }));
    localStorage.setItem('statoz.games.web.accounts.v1', JSON.stringify({ version: 1, accounts: { 'football-chess@example.test': { onboardingComplete: true } } }));
    localStorage.setItem('statoz.games.web.economy.v1', JSON.stringify({
      version: 1, coins: 100, owned: { playerCardIds: [], actionCardIds: [] },
      starterClaims: { football: { claimedAt: new Date().toISOString(), playerCardIds: [], actionCardIds: [] } }, transactions: [],
    }));
    for (const [key, value] of Object.entries(extra)) localStorage.setItem(key, value);
  }, { extra });
  const page = await context.newPage();
  const tag = `${options.viewport.width}x${options.viewport.height}`;
  page.on('pageerror', (error) => errors.push(`${tag}: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error' && !/Download the React DevTools|favicon/.test(message.text())) errors.push(`${tag} console: ${message.text()}`);
  });
  return { context, page };
}

/** Opens the game. On a phone it runs inside the landscape frame, so checks run there. */
async function open(page, label) {
  await page.goto(`${origin}/play/football-chess`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  const mobile = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
  let target = page;
  if (mobile) {
    const handle = await page.locator('iframe[data-mobile-game-frame]').elementHandle({ timeout: 180000 });
    target = await handle.contentFrame();
  }
  await target.locator('[data-screen="hub"]').waitFor({ timeout: 180000 });
  const size = await target.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  assert.ok(size.width > size.height, `${label}: the game is laid out in landscape (${size.width}x${size.height})`);
  return { target, size, mobile };
}

const fits = (target) =>
  target.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2 && document.documentElement.scrollHeight <= innerHeight + 2);

/** Every visible button is on screen and at least 44px in both directions. */
async function checkTargets(target, label) {
  await target.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))));
  const bad = await target.evaluate(() =>
    [...document.querySelectorAll('[data-game] button')]
      .filter((el) => el.getClientRects().length > 0)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { label: el.getAttribute('aria-label') || el.textContent.trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height), inside: r.top >= -1 && r.left >= -1 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1 };
      })
      .filter((t) => t.w < 44 || t.h < 44 || !t.inside),
  );
  assert.deepEqual(bad, [], `${label}: every button must be on screen and at least 44px`);
}

/** The game's own type, never the StatOz fonts. */
async function checkFonts(target, label) {
  const families = await target.evaluate(() => [...document.querySelectorAll('[data-game] h1, [data-game] button, [data-game] p')].slice(0, 30).map((el) => getComputedStyle(el).fontFamily));
  assert.ok(families.length > 0, `${label}: text to measure`);
  for (const family of families) assert.ok(!/orbitron|space grotesk|barlow|bebas/i.test(family), `${label}: StatOz or Pitch Duel font in use: ${family}`);
}

async function shot(page, label, name) {
  await page.screenshot({ path: path.join(out, `${label}-${name}.png`) });
}

/** Hub → recommended setup → Customize (Easy, Short) → team sheets → kick off. */
async function startMatch(page, target, label) {
  await target.locator('[data-action="quick-match"]').click();
  await target.locator('[data-screen="setup"]').waitFor({ timeout: 30000 });
  assert.ok(await fits(target), `${label}: setup must not scroll the page`);
  await checkTargets(target, `${label} setup`);
  assert.equal(await target.locator('[data-ui-role="recommended-setup"]').count(), 1, `${label}: setup starts with recommended defaults`);
  await target.getByRole('button', { name: /^Customize$/ }).click();
  await target.getByRole('button', { name: /^Easy$/ }).click();
  await target.getByRole('button', { name: /^Short/ }).click();
  await shot(page, label, 'setup');
  await target.locator('[data-action="find-rival"]').click();
  await target.locator('[data-screen="prematch"]').waitFor({ timeout: 30000 });
  assert.ok(await fits(target), `${label}: team sheets must not scroll the page`);
  await checkTargets(target, `${label} prematch`);
  await shot(page, label, 'prematch');
  await target.locator('[data-action="kick-off"]').click();
  await target.locator('[data-screen="match"]').waitFor({ timeout: 30000 });
  await target.locator('[data-board]').waitFor({ timeout: 30000 });
  assert.ok(await fits(target), `${label}: the match must not scroll the page`);
  const pieces = await target.locator('[data-piece]').count();
  assert.equal(pieces, 10, `${label}: ten pieces on the board`);
}

/** Plays our side with simple taps: shoot when a shot is offered, otherwise anything legal. */
async function takeTurn(target, rng) {
  const confirm = target.locator('[data-confirm]');
  if (await confirm.count()) {
    await confirm.click();
    return 'confirm';
  }
  const targets = target.locator('[data-target]');
  const kinds = await targets.evaluateAll((els) => els.map((el) => el.getAttribute('data-target')));
  const keeperRelease = target.locator('[data-status][data-keeper-release="required"]:has-text("Your ball"):has([data-turn="you"])');
  if (await keeperRelease.count()) {
    assert.match(await keeperRelease.innerText(), /Keeper must release/);
    assert.deepEqual(await target.locator('[data-piece][data-live]').evaluateAll((els) => els.map((el) => el.getAttribute('data-piece'))), ['hk'], 'only the keeper can act after setup');
    assert.ok(kinds.length > 0 && kinds.every((kind) => kind === 'pass'), 'keeper is selected automatically with throw targets');
    const size = await target.evaluate(() => `${innerWidth}x${innerHeight}`);
    if (!keeperReleaseScreens.has(size)) {
      keeperReleaseScreens.add(size);
      await target.locator('[data-screen="match"]').screenshot({ path: path.join(out, `keeper-release-${size}.png`) });
    }
  }
  if (kinds.length > 0) {
    const shotIndex = kinds.indexOf('shot');
    const forward = kinds.map((kind, index) => [kind, index]).filter(([kind]) => kind !== 'move');
    const index = shotIndex >= 0 && rng() < 0.7 ? shotIndex : forward.length > 0 && rng() < 0.6 ? forward[Math.floor(rng() * forward.length)][1] : Math.floor(rng() * kinds.length);
    await targets.nth(index).click();
    return kinds[index];
  }
  const hold = target.getByRole('button', { name: 'Hold position' });
  if (await hold.count()) {
    await hold.click();
    return 'hold';
  }
  const carrier = target.locator('[data-piece][data-live][aria-label*="has the ball"]');
  const live = target.locator('[data-piece][data-live]');
  // Exercise the allowance when a keeper has possession, rather than always
  // throwing immediately. The following own turn must automatically offer throws.
  if (await target.locator('[data-status][data-keeper-release="setup"]:has-text("Your ball")').count()) {
    const outfield = target.locator('[data-piece][data-live]:not([data-piece="hk"])');
    if (await outfield.count()) {
      await outfield.first().click();
      return 'keeper-setup';
    }
  }
  const pick = (await carrier.count()) > 0 && rng() < 0.8 ? carrier.first() : live.nth(Math.floor(rng() * Math.max(1, await live.count())));
  if ((await live.count()) === 0) return 'wait';
  await pick.click();
  return 'select';
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Plays to full time and checks the result is banked once. */
async function playToResult(page, target, label) {
  const rng = seededRandom(label.length * 97);
  const seen = new Set();
  let screenshots = 0;
  for (let step = 0; step < 900; step += 1) {
    if (await target.locator('[data-screen="result"]').count()) break;
    if (await target.locator('[data-turn="you"], [data-confirm]').count()) {
      const did = await takeTurn(target, rng);
      seen.add(did);
      if (did === 'select' && screenshots === 0) {
        screenshots += 1;
        await target.locator('[data-target]').first().waitFor({ timeout: 3000 }).catch(() => {});
        await checkTargets(target, `${label} match`);
        await shot(page, label, 'match-selected');
      }
      if (did === 'shot' && screenshots === 1) {
        screenshots += 1;
        await shot(page, label, 'match-odds');
      }
    } else {
      await target.waitForTimeout(150);
    }
  }
  await target.locator('[data-screen="result"]').waitFor({ timeout: 60000 });
  assert.ok(await fits(target), `${label}: the result must not scroll the page`);
  await checkTargets(target, `${label} result`);
  await shot(page, label, 'result');
  const save = await target.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey);
  assert.equal(save.record.played, 1, `${label}: the match is banked`);
  assert.equal(save.history.length, 1);
  const verdict = await target.locator('[data-verdict]').getAttribute('data-verdict');
  console.log(`${label}: ${verdict} ${save.history[0].scored}-${save.history[0].conceded}, actions seen: ${[...seen].join(', ')}`);
  await target.locator('[data-action="hub"]').click();
  await target.locator('[data-screen="hub"]').waitFor({ timeout: 30000 });
  await target.locator('[data-action="record"]').click();
  await target.locator('[data-screen="record"]').waitFor({ timeout: 30000 });
  assert.ok(await fits(target), `${label}: the record must not scroll the page`);
  await checkTargets(target, `${label} record`);
  await shot(page, label, 'record');
}

const sizes = [
  { label: 'phone-844x390', viewport: { width: 844, height: 390 }, phone: true, full: true },
  { label: 'phone-upright-360x740', viewport: { width: 360, height: 740 }, phone: true, full: false },
  { label: 'phone-932x430', viewport: { width: 932, height: 430 }, phone: true, full: false },
  { label: 'desktop-1280x800', viewport: { width: 1280, height: 800 }, phone: false, full: true },
];

try {
  for (const { label, viewport, phone, full } of sizes) {
    const { context, page } = await seeded(phone ? { viewport, hasTouch: true, isMobile: true } : { viewport });
    const { target, mobile } = await open(page, label);
    assert.equal(mobile, phone, `${label}: pointer type`);
    assert.ok(await fits(target), `${label}: the hub must not scroll the page`);
    await checkTargets(target, `${label} hub`);
    await checkFonts(target, `${label} hub`);
    assert.match(await target.locator('[data-screen="hub"]').innerText(), /Academy five/, `${label}: no deck, so the Academy five play`);
    await shot(page, label, 'hub');

    await target.locator('[data-action="rules"]').click();
    await target.locator('[data-rules]').waitFor({ timeout: 10000 });
    assert.ok(await fits(target), `${label}: the rules must not scroll the page`);
    for (let i = 0; i < 4; i += 1) await target.getByRole('button', { name: 'Next page' }).click();
    await shot(page, label, 'rules');
    await target.getByRole('button', { name: 'Got it' }).click();

    await startMatch(page, target, label);
    if (full) {
      await playToResult(page, target, label);
    } else {
      for (let i = 0; i < 40 && !(await target.locator('[data-target]').count()); i += 1) {
        if (await target.locator('[data-turn="you"], [data-confirm]').count()) await takeTurn(target, seededRandom(i + 1));
        else await target.waitForTimeout(200);
      }
      await checkTargets(target, `${label} match`);
      await shot(page, label, 'match');
      await target.getByRole('button', { name: 'Menu' }).click();
      await target.getByRole('button', { name: /Leave match/ }).click();
      await target.getByRole('button', { name: /^Leave$/ }).click();
      await target.locator('[data-screen="hub"]').waitFor({ timeout: 30000 });
      const save = await target.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), saveKey);
      assert.equal(save?.record?.played ?? 0, 0, `${label}: a match left early is not banked`);
    }
    await context.close();
  }

  // A v1 player: the record carries over, v2 is written, and v1 is kept.
  const v1 = JSON.stringify({ wins: 3, losses: 1, draws: 1, currentStreak: 1, bestStreak: 2, formation: 'diamond' });
  const { context, page } = await seeded({ viewport: { width: 932, height: 430 }, hasTouch: true, isMobile: true }, { [legacyKey]: v1 });
  const { target } = await open(page, 'v1-player');
  const hub = await target.locator('[data-screen="hub"]').innerText();
  assert.match(hub, /record carried over/i, 'v1 players are told about the new rules');
  assert.match(hub, /3W 1D 1L/, 'the v1 record shows on the hub');
  const stored = await target.evaluate(([v2, v1]) => ({ v2: JSON.parse(localStorage.getItem(v2) ?? 'null'), v1: localStorage.getItem(v1) }), [saveKey, legacyKey]);
  assert.equal(stored.v2?.migratedFrom, 1, 'the migrated save is written');
  assert.equal(stored.v2?.quick?.formation, 'diamond');
  assert.equal(stored.v1, v1, 'the v1 record is never deleted');
  await shot(page, 'v1-player', 'hub');
  await context.close();

  assert.deepEqual(errors, [], 'no page errors');
  console.log(`Football Chess browser checks passed; keeper release checked at ${[...keeperReleaseScreens].join(', ') || 'no keeper setup encountered'}. Screenshots in ${path.relative(root, out)}`);
} finally {
  await browser.close();
  server?.close();
  await app?.close?.();
}
