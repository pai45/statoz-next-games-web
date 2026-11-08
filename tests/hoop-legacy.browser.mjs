import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '@playwright/test';

const origin = process.env.HOOP_LEGACY_TEST_ORIGIN || 'http://localhost:3000';
const output = path.resolve('test-results/hoop-legacy');
await fs.mkdir(output, {recursive: true});
const browser = await chromium.launch({channel: 'chrome', headless: true});
const errors = [], failures = [], checks = [];
let activePage;
const record = value => {checks.push(value); console.log(value);};
const state = frame => frame.evaluate(() => window.__HOOP_LEGACY__());
async function waitForGame(page) {
  const until = Date.now() + 120000;
  while (Date.now() < until) {
    for (const candidate of page.frames()) {
      const online = candidate.getByRole('button', {name: 'Play online', exact: true});
      if (await online.isVisible().catch(() => false)) await online.click();
    }
    const frame = page.frames().find(frame => frame.url().includes('/embedded-games/hoop-legacy/'));
    if (frame) {
      await frame.waitForFunction(() => window.__HOOP_LEGACY__?.().ready, null, {timeout: 120000});
      return frame;
    }
    await page.waitForTimeout(200);
  }
  throw Error('The host did not launch the isolated Hoop Legacy frame');
}
async function open(context) {
  const page = await context.newPage();
  activePage = page;
  page.setDefaultTimeout(120000);
  page.on('pageerror', error => {errors.push(error.message); console.error('PAGE ERROR', error.message);});
  page.on('requestfailed', request => {
    if (!request.failure()?.errorText.includes('ERR_ABORTED')) failures.push(request.url());
  });
  await page.goto(origin + '/play/hoop-legacy?returnTo=%2Fgames%2Fbasketball', {waitUntil: 'domcontentloaded', timeout: 120000});
  console.log('Opened host', page.url());
  const frame = await waitForGame(page);
  console.log('Opened game frame');
  await Promise.all(page.frames().map(frame => frame.addStyleTag({content: 'nextjs-portal{display:none!important}'})));
  await frame.getByRole('button', {name: /Tap to start/i}).click();
  await frame.getByRole('button', {name: /Play Now/i}).waitFor();
  return {page, frame};
}
async function seed(context) {
  // Use the shipped Low setting for deterministic headless GPU load. No gameplay shortcuts.
  await context.addInitScript(() => {
    // Exercise the supported online fallback. Device caching is checked by its
    // own suite; this avoids downloading every other game in each phone context.
    Reflect.deleteProperty(Navigator.prototype, 'serviceWorker');
    if (window.parent !== window) return;
    const key = 'statoz.games.web.bundle.hoop-legacy.guest';
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({schemaVersion: 1,
      stores: {'hoop-legacy:settings': JSON.stringify({quality: 'low', resolution: .75, music: 0, crowd: 0, commentary: 0})}, resultIds: []}));
  });
}
async function quitMatch(page, frame) {
  await frame.getByRole('button', {name: 'Pause', exact: true}).click();
  await frame.getByRole('button', {name: 'Quit to Setup', exact: true}).click();
  await frame.getByRole('button', {name: 'Back', exact: true}).click();
  await frame.getByRole('button', {name: /Play Now/i}).waitFor();
}

try {
  const context = await browser.newContext({viewport: {width: 1280, height: 800}});
  await seed(context);
  let {page, frame} = await open(context);
  await page.screenshot({path: path.join(output, '01-menu.png'), timeout: 120000});
  await frame.getByRole('button', {name: /Play Now/i}).click();
  await frame.getByRole('button', {name: 'Tip Off', exact: true}).click();
  await frame.waitForFunction(() => window.__HOOP_LEGACY__().simulation?.hud?.teamSize === 1);
  await frame.waitForFunction(() => window.__HOOP_LEGACY__().simulation.hud.gameClock < 299, null, {timeout: 120000});
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(300);
  await page.keyboard.up('KeyW');
  await page.keyboard.down('Space');
  await page.waitForTimeout(500);
  await page.keyboard.up('Space');
  await page.screenshot({path: path.join(output, '02-1v1.png'), timeout: 120000});
  record('1v1 launches, advances its real simulation and accepts keyboard move/shoot input');

  // Verify the actual parent-message boundary, including rejection of a wrong session.
  await page.keyboard.down('KeyW');
  await page.keyboard.down('Space');
  await frame.waitForFunction(() => window.__HOOP_LEGACY__().input.held.shoot);
  await page.evaluate(() => {
    const frame = document.querySelector('iframe');
    frame.contentWindow.postMessage({protocolVersion: 1, gameId: 'hoop-legacy', sessionId: 'forged', type: 'pause'}, location.origin);
  });
  assert.equal((await state(frame)).hostPaused, false);
  await frame.evaluate(() => window.__STATOZ_COMMAND__({protocolVersion: 1, gameId: 'hoop-legacy', sessionId: window.__STATOZ_HOST__.sessionId, type: 'pause'}));
  await frame.getByRole('dialog', {name: 'Game paused', exact: true}).waitFor();
  assert.equal((await state(frame)).input.held.shoot, false);
  assert.deepEqual((await state(frame)).input.move, {x: 0, y: 0});
  await page.keyboard.up('KeyW');
  await page.keyboard.up('Space');
  const frozen = (await state(frame)).simulation.hud.gameClock;
  await page.waitForTimeout(600);
  assert.equal((await state(frame)).simulation.hud.gameClock, frozen);
  await frame.getByRole('button', {name: 'Resume', exact: true}).click();
  assert.equal((await state(frame)).input.held.shoot, false);
  await frame.waitForFunction(clock => window.__HOOP_LEGACY__().simulation.hud.gameClock < clock, frozen);
  record('Wrong-session commands are ignored; valid host suspension freezes play and explicit Resume restarts it');
  await quitMatch(page, frame);

  await frame.getByRole('button', {name: /Play Now/i}).click();
  await frame.getByRole('radio', {name: '3v3', exact: true}).click();
  await frame.getByRole('button', {name: 'Tip Off', exact: true}).click();
  await frame.waitForFunction(() => window.__HOOP_LEGACY__().simulation?.hud?.teamSize === 3);
  await page.screenshot({path: path.join(output, '03-3v3.png'), timeout: 120000});
  await quitMatch(page, frame);
  record('3v3 fields three players per side and returns through the original pause menu');

  await frame.getByRole('button', {name: /3PT Contest/i}).click();
  await frame.getByRole('button', {name: 'Start Contest', exact: true}).click();
  await frame.waitForFunction(() => window.__HOOP_LEGACY__().mode === 'contest');
  await page.screenshot({path: path.join(output, '04-contest.png'), timeout: 120000});
  await frame.getByRole('button', {name: 'Pause', exact: true}).click();
  await frame.getByRole('button', {name: 'Quit Contest', exact: true}).click();
  await frame.getByRole('button', {name: 'Back', exact: true}).click();
  record('Three-point contest setup, runtime and quit flow work');

  await frame.getByRole('button', {name: /My Career/i}).click();
  assert.equal(await frame.getByRole('button', {name: /New Career/}).count(), 3);
  await frame.getByRole('button', {name: /New Career/}).first().click();
  await frame.getByPlaceholder('First name', {exact: true}).fill('Court');
  await frame.getByPlaceholder('Last name', {exact: true}).fill('Tester');
  while (await frame.getByRole('button', {name: 'Next', exact: true}).count()) {
    await frame.getByRole('button', {name: 'Next', exact: true}).click();
  }
  await frame.getByRole('button', {name: 'Start Career', exact: true}).click();
  await frame.waitForFunction(() => window.__HOOP_LEGACY__().screen === 'career');
  await frame.getByRole('button', {name:'Browse career',exact:true}).click();
  await frame.getByRole('button', {name:/^Stats$/}).click();
  await frame.getByRole('button', {name:'Next event',exact:true}).click();
  assert.equal(await frame.getByRole('button', {name:'Browse career',exact:true}).getAttribute('aria-expanded'),'false');
  assert.equal((await state(frame)).slots[0].name, 'Court');
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('statoz.games.web.bundle.hoop-legacy.guest'))?.stores?.['hoop-legacy:career:0']);
  assert.equal(await page.evaluate(() => localStorage.getItem('hoop-legacy:career:0')), null);
  await page.screenshot({path: path.join(output, '05-career.png'), timeout: 120000});
  await page.reload({waitUntil: 'domcontentloaded'});
  frame = await waitForGame(page);
  assert.equal((await state(frame)).slots[0].name, 'Court');
  await frame.getByRole('button', {name: /Tap to start/i}).click();
  await frame.getByRole('button', {name: 'Back to Games', exact: true}).click();
  await page.waitForURL(url => url.pathname.endsWith('/') && url.searchParams.get('sport') === 'basketball');
  await page.getByRole('link', {name: /HOOP LEGACY/i}).first().waitFor();
  record('Three career slots, player creation, local save/reload and basketball-hub return work');
  await page.evaluate(() => {
    localStorage.setItem('statoz.games.web.auth.v2', JSON.stringify({version: 2, authenticated: true, email: 'hoop-check@example.test'}));
    localStorage.setItem('statoz.games.web.accounts.v1', JSON.stringify({version: 1, accounts: {'hoop-check@example.test': {onboardingComplete: true}}}));
    localStorage.setItem('statoz.games.web.bundle.hoop-legacy.hoop-check%40example.test', JSON.stringify({schemaVersion: 1,
      stores: {'hoop-legacy:settings': JSON.stringify({quality: 'low', resolution: .75, music: 0, crowd: 0, commentary: 0})}, resultIds: []}));
  });
  await page.close();
  ({page, frame} = await open(context));
  assert.equal((await state(frame)).slots[0], null, 'another account does not inherit the guest career');
  await frame.getByRole('button', {name: 'Settings', exact: true}).click();
  await frame.getByRole('radio', {name: 'Close', exact: true}).click();
  await page.waitForFunction(() => JSON.parse(JSON.parse(localStorage.getItem('statoz.games.web.bundle.hoop-legacy.hoop-check%40example.test')).stores['hoop-legacy:settings']).camera === 'close');
  assert.equal(await page.evaluate(() => JSON.parse(JSON.parse(localStorage.getItem('statoz.games.web.bundle.hoop-legacy.guest')).stores['hoop-legacy:settings']).camera), 'broadcast');
  assert.ok(await page.evaluate(() => JSON.parse(localStorage.getItem('statoz.games.web.bundle.hoop-legacy.guest')).stores['hoop-legacy:career:0']));
  record('Switching accounts isolates career slots and settings while preserving the guest career');
  await context.close();

  for (const viewport of [{width: 844, height: 390}, {width: 390, height: 844}]) {
    const mobile = await browser.newContext({viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 1});
    await seed(mobile);
    const {page, frame} = await open(mobile);
    assert.equal((await state(frame)).slots[0], null, 'separate browser profile has separate career saves');
    await frame.getByRole('button', {name: /Play Now/i}).click();
    await frame.getByRole('button', {name: 'Tip Off', exact: true}).click();
    await frame.waitForFunction(() => window.__HOOP_LEGACY__().mode === 'match');
    await frame.getByRole('button', {name: 'Shoot', exact: true}).waitFor();
    const geometry=await frame.evaluate(()=>window.__HOOP_LEGACY__({geometry:true}).athletes.bounds);
    assert.equal(geometry.length,2);
    assert.ok(geometry.every(b=>b.finite&&b.maxCoordinate<4&&Math.max(...b.size)<4),'mobile athletes remain inside their posed bounds');
    const bounds = await frame.getByRole('button', {name: 'Shoot', exact: true}).boundingBox();
    assert.ok(bounds && bounds.width >= 44 && bounds.height >= 44);
    await page.screenshot({path: path.join(output, `06-touch-${viewport.width}x${viewport.height}.png`), timeout: 120000});
    await mobile.close();
  }
  record('Landscape and portrait phones launch the landscape game with visible touch controls and isolated saves');
  assert.deepEqual(errors, []);
  assert.deepEqual(failures, []);
  await fs.writeFile(path.join(output, 'validation.json'), JSON.stringify({checks, errors, failures}, null, 2));
} catch (error) {
  if (activePage && !activePage.isClosed()) {
    console.error('SCREEN', await activePage.locator('body').innerText().catch(() => 'unavailable'));
    for (const frame of activePage.frames()) if (frame.url().includes('/embedded-games/hoop-legacy/')) {
      console.error('GAME', await frame.locator('body').innerText().catch(() => 'unavailable'));
    }
    await activePage.screenshot({path: path.join(output, 'failure.png'), timeout: 120000}).catch(() => {});
  }
  throw error;
} finally {
  await browser.close();
}
