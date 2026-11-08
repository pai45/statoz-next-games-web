// Content hierarchy and first-click flows at desktop and phone landscape sizes.
// Run against a local dev server: node tests/game-ui-simplification.browser.mjs --url=http://localhost:3200
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const origin = process.argv.find(arg => arg.startsWith('--url='))?.slice(6) || 'http://localhost:3200';
const output = path.resolve('test-results/game-ui-simplification');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const reports = [], failures = [];
const starterOnly = process.argv.includes('--starter-only');
const only = process.argv.find(arg => arg.startsWith('--only='))?.slice(7);
const cases = [
  { id: 'cricketer', root: '[aria-label="Cricketer main menu"]', actions: 'button', primary: '[data-primary]' },
  { id: 'yorker', root: '[aria-label="Yorker main menu"]', actions: 'button', primary: '[data-primary]' },
  { id: 'longbow', root: '[aria-label="Longbow main menu"]', actions: 'button', primary: '[data-primary]' },
  { id: 'rim-rush', root: '[aria-label="Rim Rush main menu"]', actions: 'button', primary: '[data-primary]' },
  { id: 'f1-racing', root: '[aria-label="Racer menu"]', actions: ':scope > button', primary: '[data-primary]' },
  { id: 'holdover', root: '.main-nav', actions: 'button', primary: '[data-primary]' },
  { id: 'hoop-legacy', root: '.clip-tile:has-text("My Career")', actions: '.clip-tile', globalActions: true, primary: '[data-primary]', enter: /Tap to start/i },
  { id: 'portfolio-formula', root: '.fm-mode-grid', actions: 'button', primary: '[data-primary]' },
  { id: 'penalty-cup', root: '[data-ui-role="lobby-actions"]', actions: 'button:not([data-ui-role="utility"])', primary: '[data-primary]' },
  { id: 'pitch-rush', root: '.homeChoices', actions: ':scope > .modeCard', primary: '[data-action="career"]' },
  { id: 'vibe-basketball', root: '#mode-menu', actions: '#mode-1v1,#mode-three-point', primary: '[data-primary]' },
  { id: 'rally', app: true, root: 'main[aria-label="RALLY DASH"]', actions: '[class*="quick"], [class*="modeCard"]', primary: '[data-primary]' },
  { id: 'football-chess', app: true, root: '[data-screen="hub"]', actions: '[data-action="quick-match"],[data-action="rules"],[data-action="record"]', primary: '[data-action="quick-match"]' },
  { id: 'pitch-duel', app: true, root: '[data-pitch-duel-screen="home"]', actions: '[data-pitch-duel-option="play-match"],button[aria-label^="Your squad"]', primary: '[data-pitch-duel-option="play-match"]' },
];

async function seed(context, claimed = true) {
  await context.addInitScript(({ claimed }) => {
    Reflect.deleteProperty(Navigator.prototype, 'serviceWorker');
    if (window.parent !== window) return;
    if (sessionStorage.getItem('ui-audit-seeded')) return;
    sessionStorage.setItem('ui-audit-seeded', '1');
    localStorage.setItem('statoz.games.web.auth.v2', JSON.stringify({ version: 2, authenticated: true, email: 'ui-audit@example.test' }));
    localStorage.setItem('statoz.games.web.accounts.v1', JSON.stringify({ version: 1, accounts: { 'ui-audit@example.test': { onboardingComplete: true } } }));
    if (claimed) localStorage.setItem('statoz.games.web.economy.v1', JSON.stringify({ version: 1, coins: 100, owned: { playerCardIds: [], actionCardIds: [] }, starterClaims: { football: { claimedAt: new Date().toISOString(), playerCardIds: [], actionCardIds: [] } }, transactions: [] }));
    window.__STATOZ_BOOT__ = { stores: { 'hoop-legacy:settings': JSON.stringify({ quality: 'low', music: 0, crowd: 0 }), 'holdover.profile.v1': '' } };
  }, { claimed });
}

async function fit(target, selector, label) {
  const locator = typeof selector === 'string' ? target.locator(selector) : selector;
  const bad = await locator.evaluateAll(elements => elements.filter(el => { const closed = el.closest('details:not([open])'); return el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' && (!closed || el.tagName === 'SUMMARY' && el.parentElement === closed); }).map(el => {
    const r = el.getBoundingClientRect();
    return { text: el.textContent.trim().slice(0, 50), x: r.x, y: r.y, width: r.width, height: r.height, inside: r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 };
  }).filter(item => !item.inside || item.width < 43 || item.height < 43));
  assert.deepEqual(bad, [], label + ': every decision is on screen and at least 44px');
  assert.ok(await target.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2 && document.documentElement.scrollHeight <= innerHeight + 2), label + ': no page scrolling');
}

async function trap(target, page, selector) {
  const controls = target.locator(`${selector} button:visible:not(:disabled),${selector} summary:visible,${selector} input:visible`);
  if (!(await controls.count())) return;
  await controls.last().focus();
  await page.keyboard.press('Tab');
  assert.ok(await target.locator(selector).evaluate(el => el.contains(document.activeElement)), 'Tab remains in the modal');
}

try {
  if (starterOnly) for (const viewport of [{ width: 1440, height: 900 }, { width: 844, height: 390 }]) {
    for (const id of ['football-chess', 'pitch-duel']) {
      const context = await browser.newContext({ viewport, ...(viewport.width === 844 ? { hasTouch: true, isMobile: true, deviceScaleFactor: 1 } : {}) });
      await seed(context, false);
      const page = await context.newPage();
      try {
        await page.goto(`${origin}/play/${id}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
        let target = page;
        if (viewport.width === 844) target = await (await page.locator('iframe[data-mobile-game-frame]').elementHandle({ timeout: 120000 })).contentFrame();
        await target.locator('[data-ui-role="starter-summary"]').waitFor({ timeout: 120000 });
        assert.equal(await target.locator('[data-ui-role="starter-summary"] h1').count(), 1);
        await fit(target, '[data-ui-role="starter-summary"] button', `${id}-starter-${viewport.width}`);
        await page.screenshot({ path: path.join(output, `${id}-starter-${viewport.width}.png`) });
        await target.getByRole('button', { name: 'SKIP REVEAL', exact: true }).click();
        await target.locator(id === 'pitch-duel' ? '[data-pitch-duel-option="debut-skip"]' : '[data-screen="hub"]').waitFor();
        if (id === 'pitch-duel') {
          await target.locator('[data-pitch-duel-option="debut-skip"]').click();
          await target.locator('[data-pitch-duel-option="debut-club"]').click();
        }
        await page.reload({ waitUntil: 'domcontentloaded' });
        if (viewport.width === 844) target = await (await page.locator('iframe[data-mobile-game-frame]').elementHandle({ timeout: 120000 })).contentFrame();
        await target.locator(id === 'pitch-duel' ? '[data-pitch-duel-screen="home"]' : '[data-screen="hub"]').waitFor({ timeout: 120000 });
        assert.equal(await target.locator('[data-ui-role="starter-summary"]').count(), 0, 'the squad is granted once and does not repeat after reload');
        reports.push({ label: `${id}-starter-${viewport.width}`, result: 'passed' });
        console.log(`PASS ${id}-starter-${viewport.width}`);
      } catch (error) { failures.push({ label: `${id}-starter-${viewport.width}`, error: error.message }); }
      finally { await context.close(); }
    }
  }
  if (!starterOnly)
  for (const viewport of [{ width: 1440, height: 900 }, { width: 844, height: 390 }]) {
    for (const game of cases) {
      if (only && game.id !== only) continue;
      const label = `${game.id}-${viewport.width}x${viewport.height}`;
      const context = await browser.newContext({ viewport, ...(viewport.width === 844 ? { hasTouch: true, isMobile: true, deviceScaleFactor: 1 } : {}) });
      await seed(context);
      const page = await context.newPage();
      page.setDefaultTimeout(60000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      try {
        await page.goto(origin + (game.app ? `/play/${game.id}` : `/embedded-games/${game.id}/index.html`), { waitUntil: 'domcontentloaded', timeout: 180000 });
        let target = page;
        if (game.app && viewport.width === 844) {
          const handle = await page.locator('iframe[data-mobile-game-frame]').elementHandle({ timeout: 120000 });
          target = await handle.contentFrame();
        }
        if (game.enter) await target.getByRole('button', { name: game.enter }).click();
        if (game.id === 'pitch-duel') {
          await target.locator('[data-pitch-duel-option="debut-skip"]').waitFor();
          await target.locator('[data-pitch-duel-option="debut-skip"]').click();
          await target.locator('[data-pitch-duel-option="debut-club"]').click();
        }
        await target.locator(game.root).waitFor({ timeout: 120000 });
        const root = target.locator(game.root);
        const actions = game.globalActions ? target.locator(game.actions) : root.locator(game.actions);
        const count = await actions.count();
        assert.ok(count >= 1 && count <= 3, label + ': at most three decision branches, got ' + count);
        assert.equal(await target.locator(game.primary).filter({ visible: true }).count(), 1, label + ': exactly one primary action');
        await page.waitForTimeout(450);
        await fit(target, actions, label);
        if (['cricketer', 'yorker', 'longbow', 'rim-rush', 'f1-racing'].includes(game.id)) await trap(target, page, game.root);
        await page.screenshot({ path: path.join(output, label + '.png') });

        if (game.id === 'football-chess') {
          await target.locator('[data-action="quick-match"]').click();
          await target.locator('[data-ui-role="recommended-setup"]').waitFor();
          assert.equal(await target.getByRole('button', { name: 'Easy', exact: true }).count(), 0, 'advanced setup is initially hidden');
          await fit(target, '[data-screen="setup"] button', label + '-recommended');
          await target.getByRole('button', { name: 'Customize', exact: true }).click();
          await target.getByRole('button', { name: 'Easy', exact: true }).click();
          await target.locator('[data-action="find-rival"]').click();
          await target.locator('[data-screen="prematch"]').waitFor();
        }
        if (game.id === 'holdover') {
          await target.locator('.main-nav [data-primary]').click();
          await target.getByRole('button', { name: 'Deploy', exact: true }).waitFor();
        }
        if (game.id === 'f1-racing') {
          await target.getByText('CUSTOMIZE', { exact: true }).click();
          await target.getByRole('button', { name: 'Future', exact: true }).click();
          assert.equal(await target.getByRole('button', { name: 'Future', exact: true }).getAttribute('aria-pressed'), 'true');
        }
        if (game.id === 'portfolio-formula') {
          await target.getByRole('button', { name: /Start Career/ }).click();
          await target.locator('[data-ui-role="next-career-event"]').waitFor();
          assert.equal(await target.locator('.fm-tier-list').count(), 0, 'career opens on its next event');
          await fit(target, '.fm-career-layout button', label + '-next-event');
          await page.screenshot({ path: path.join(output, label + '-career-next.png') });
          await target.getByRole('button', { name: 'Browse career', exact: true }).click();
          await target.getByRole('button', { name: 'standings', exact: true }).click();
          await target.getByRole('button', { name: 'Next race', exact: true }).click();
          await target.locator('[data-ui-role="next-career-event"]').waitFor();
        }
        assert.deepEqual(errors, [], label + ': runtime errors');
        reports.push({ label, count, result: 'passed' });
        console.log('PASS ' + label);
      } catch (error) {
        await page.screenshot({ path: path.join(output, label + '-failure.png') }).catch(() => {});
        failures.push({ label, error: error.message, errors });
        console.error('FAIL ' + label + ': ' + error.message);
      } finally { await context.close(); }
    }
  }
  await fs.writeFile(path.join(output, starterOnly ? 'starter-checks.json' : only ? `${only}-checks.json` : 'checks.json'), JSON.stringify({ reports, failures }, null, 2));
  assert.deepEqual(failures, []);
} finally { await browser.close(); }
