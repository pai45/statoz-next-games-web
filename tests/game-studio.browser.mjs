import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { createStudioServer } from '../tools/game-studio/server.mjs';

const origin = process.argv.find(arg => arg.startsWith('--url='))?.slice(6) ?? 'http://127.0.0.1:3040';
const output = path.resolve('test-results/game-studio'); await fs.mkdir(output, { recursive: true });
let page;
const { server, token } = createStudioServer({ origin, capture: async () => page.getByRole('region', { name: 'Game preview', exact: true }).screenshot({ type: 'png' }) }); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const bridge = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
await context.addInitScript(() => {
  localStorage.setItem('statoz.games.web.auth.v2', JSON.stringify({ version: 2, authenticated: true, email: 'engine@example.test' }));
  localStorage.setItem('statoz.games.web.accounts.v1', JSON.stringify({ version: 1, accounts: { 'engine@example.test': { onboardingComplete: true } } }));
});
page = await context.newPage(); const errors = [];
page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
page.on('console', message => { if (message.type() === 'error') console.error(message.text().slice(0, 300)); });
try {
  await page.goto(`${origin}/studio/games#bridge=${bridge}&token=${token}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.getByText('Local workspace connected', { exact: true }).waitFor({ timeout: 60000 });
  assert.equal(await page.getByRole('navigation', { name: 'Game library' }).getByRole('button').count(), 14);
  await page.getByRole('navigation', { name: 'Game library' }).getByRole('button', { name: /Yorker/ }).click();
  await page.getByRole('button', { name: 'Inspect candidate' }).click({ timeout: 60000 });
  await page.locator('canvas[aria-label^="Interactive asset"]').waitFor({ timeout: 60000 });
  await page.waitForTimeout(2000); await page.screenshot({ path: path.join(output, 'studio-model.png') });
  await page.getByRole('button', {name:'Capture preview', exact:true}).click();
  await page.getByText(/Saved output\/game-studio\/yorker\//).waitFor({ timeout: 30000 });
  await page.getByRole('button', {name:'Preview candidate in game', exact:true}).click();
  await page.waitForTimeout(6000);
  const candidateSessions = (await Promise.all(page.frames().map(frame => frame.evaluate(() => window.__STATOZ_ENGINE__?.sessions() ?? []).catch(() => [])))).flat();
  assert.ok(candidateSessions.some(session => session.gameId === 'yorker' && session.status === 'running' && session.details.assets?.some(asset => asset.id === 'bowler' && asset.source === 'studio-candidate')));
  await page.screenshot({path:path.join(output,'studio-in-game-candidate.png')});
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log('Studio: 14 games, authenticated local bridge and real Blender candidate preview passed');
  await page.goto(origin + '/play/rally', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.getByRole('heading', { name: /RALLY/ }).first().waitFor({ timeout: 60000 });
  await page.getByRole('button', { name: /^Choose a Stage Attack course/ }).click();
  await page.getByRole('button', { name: 'Frostvale', exact: true }).click({ timeout: 15000 });
  await page.waitForTimeout(1500); await page.screenshot({ path: path.join(output, 'rally-pixi.png') });
  const diagnostics = await page.evaluate(() => window.__STATOZ_ENGINE__?.sessions());
  assert.ok(diagnostics?.some(session => session.gameId === 'grand-prix-dash' && session.status === 'running'));
  assert.equal(errors.length, 0, errors.join('\n')); console.log('Rally: live Pixi scene and stage switching passed');
} catch (error) {
  console.error(await Promise.all(page.frames().map(async frame => ({url:frame.url(),text:(await frame.locator('body').innerText().catch(()=>'' )).slice(-1800),sessions:await frame.evaluate(()=>window.__STATOZ_ENGINE__?.sessions()).catch(()=>null)}))));
  await page.screenshot({ path: path.join(output, 'failure.png'), timeout: 15000 }).catch(() => {});
  throw error;
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
