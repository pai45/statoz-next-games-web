// End-to-end return navigation, including the separate mobile landscape history.
import assert from 'node:assert/strict';
import http from 'node:http';
import next from 'next';
import { chromium } from '@playwright/test';

const existing = process.argv.find(value => value.startsWith('--url='))?.slice(6);
const app = existing ? null : next({ dev: false, dir: process.cwd() });
await app?.prepare();
const handler = app?.getRequestHandler();
const server = existing ? null : http.createServer((req, res) => void handler(req, res));
if (server) await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = existing || `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.MOBILE_VIEWPORT_CHROMIUM || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const errors = [];
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext(mobile
      ? { viewport: { width: 393, height: 851 }, isMobile: true, hasTouch: true }
      : { viewport: { width: 1440, height: 900 } });
    // Navigation checks use the supported online mode; device-download coverage
    // lives in device-assets.browser.mjs and does not need repeating here.
    await context.route('**/_game-assets/*.json', route => route.abort());
    await context.addInitScript(() => {
      localStorage.setItem('statoz.games.web.auth.v2', JSON.stringify({ version: 2, authenticated: true, email: 'navigation@example.test' }));
      localStorage.setItem('statoz.games.web.accounts.v1', JSON.stringify({ version: 1, accounts: { 'navigation@example.test': { onboardingComplete: true } } }));
      localStorage.setItem('statoz.games.web.economy.v1', JSON.stringify({ version: 1, coins: 500, owned: { playerCardIds: [], actionCardIds: [] }, starterClaims: { football: { claimedAt: '2026-11-02', playerCardIds: [], actionCardIds: [] } }, transactions: [] }));
    });
    const page = await context.newPage();
    page.setDefaultTimeout(180000);
    page.setDefaultNavigationTimeout(30000);
    console.log(`Checking ${mobile ? 'phone' : 'desktop'} at ${origin} (process ${process.pid})`);
    page.on('pageerror', error => errors.push(error.message));
    const hub = () => mobile ? page.frameLocator('iframe[data-mobile-platform-frame]') : page;
    const game = () => mobile ? page.frameLocator('iframe[data-mobile-game-frame]') : page;
    const leavePitchDuel = async () => {
      const screen = game();
      await screen.locator('[data-pitch-duel-screen="home"], [data-pitch-duel-screen="debut"]').first().waitFor({ timeout: 90000 });
      if (await screen.locator('[data-pitch-duel-option="debut-open"]').count()) {
        await screen.locator('[data-pitch-duel-option="debut-open"]').click();
        await screen.locator('[data-pitch-duel-option="debut-skip"]').click();
        await screen.locator('[data-pitch-duel-option="debut-club"]').click();
      }
      await screen.getByRole('button', { name: 'Leave Fot Duel', exact: true }).click({ timeout: 60000 });
    };
    for (const surface of mobile ? [page, hub(), game()] : [page]) {
      await page.addLocatorHandler(surface.getByRole('button', { name: 'Play online', exact: true }), async button => button.click());
    }
    for (const sport of [null, 'football']) {
      console.log('List round trip:', sport ?? 'all');
      const home = sport ? '/?sport=football' : '/';
      await page.goto(origin + home);
      await hub().getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Library', exact: true }).click();
      const list = hub().getByRole('dialog', { name: 'Game Library' });
      await list.getByRole('tab', { name: 'Football', exact: true }).click();
      await list.getByRole('tab', { name: 'Football', exact: true }).and(hub().locator('[aria-selected="true"]')).waitFor();
      const play = list.getByRole('link', { name: /^Play Fot Duel$/i });
      await play.waitFor();
      const launch = new URL(await play.getAttribute('href'), origin);
      const destination = launch.searchParams.get('returnTo');
      const returnParams = new URL(destination, origin).searchParams;
      assert.equal(returnParams.get('sport'), sport);
      assert.equal(returnParams.get('view'), 'all');
      assert.equal(returnParams.get('listSport'), 'football');
      assert.equal(returnParams.get('game'), 'pitch-duel');
      await play.click();
      await page.waitForURL(url => url.pathname === '/play/pitch-duel', { timeout: 60000 });
      console.log('Opened:', page.url());
      await leavePitchDuel();
      console.log('Exit clicked:', page.url());
      await page.waitForURL(url => url.pathname === '/' && url.search === new URL(destination, origin).search);
      await hub().getByRole('dialog', { name: 'Game Library' }).waitFor();
      assert.equal(await hub().getByRole('tab', { name: 'Football', exact: true }).last().getAttribute('aria-selected'), 'true');
      await hub().getByRole('button', { name: 'Close all games', exact: true }).click();
      await page.waitForURL(url => !url.searchParams.has('view') && url.searchParams.get('sport') === sport && url.searchParams.get('game') === 'pitch-duel');
      await hub().locator('[data-shelf-id="lineup"]:visible').waitFor();
    }
    // Cover launches and native browser Back preserve the selected sport.
    console.log('Game strip and browser Back');
    await page.goto(origin + '/?sport=football');
    // An action lets the online-mode handlers dismiss the download screen.
    await hub().getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Library', exact: true }).click();
    await hub().getByRole('button', { name: 'Close all games', exact: true }).click();
    const lineup = hub().locator('[data-shelf-id="lineup"]:visible');
    const launch = lineup.getByRole('link', { name: /^Play Fot Duel$/i });
    const launchReturn = new URL(new URL(await launch.getAttribute('href'), origin).searchParams.get('returnTo'), origin);
    assert.equal(launchReturn.searchParams.get('sport'), 'football');
    assert.equal(launchReturn.searchParams.get('game'), 'pitch-duel');
    await launch.click();
    await page.waitForURL(url => url.pathname.startsWith('/play/'));
    await page.goBack();
    await page.waitForURL(url => url.pathname === '/' && url.searchParams.get('sport') === 'football');
    await hub().locator('[data-shelf-id="lineup"]:visible').waitFor();
    // Direct visits have a useful fallback even without launch history.
    console.log('Direct visit and legacy catalog');
    await page.goto(origin + '/play/pitch-duel');
    await leavePitchDuel();
    await page.waitForURL(origin + '/');
    await hub().locator('[data-shelf-id="lineup"]:visible').waitFor();
    await page.goto(origin + '/games/cricket');
    await hub().locator('[data-shelf-id="cricket"]:visible').waitFor();
    await page.waitForURL(origin + '/?sport=cricket');
    console.log(`${mobile ? 'phone' : 'desktop'} return journeys passed`);
    await context.close();
  }
  assert.deepEqual(errors, []);
} catch (error) {
  process.exitCode = 1;
  console.error(error);
} finally {
  // Next's standalone server can retain idle handles after all assertions and
  // browser contexts are closed. Bound shutdown for this dedicated test process.
  setTimeout(() => process.exit(process.exitCode || 0), 5000).unref();
  await browser.close();
  server?.closeAllConnections();
  server?.close();
  await app?.close?.();
}
