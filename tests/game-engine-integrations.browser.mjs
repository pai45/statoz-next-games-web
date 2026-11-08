import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { readGameCatalog } from '../tools/game-studio/server.mjs';
const origin = process.argv.find(arg => arg.startsWith('--url='))?.slice(6) ?? 'http://127.0.0.1:3040';
const output = path.resolve('test-results/game-engine/browser'); await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
const report = [];
try {
  for (const game of await readGameCatalog()) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(() => {
      localStorage.setItem('statoz.games.web.auth.v2', JSON.stringify({ version: 2, authenticated: true, email: 'engine@example.test' }));
      localStorage.setItem('statoz.games.web.accounts.v1', JSON.stringify({ version: 1, accounts: { 'engine@example.test': { onboardingComplete: true } } }));
    });
    const page = await context.newPage(), errors = [], failed = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => { if (!request.failure()?.errorText.includes('ERR_ABORTED')) failed.push(request.url()); });
    try {
      await page.goto(origin + game.route, { waitUntil: 'domcontentloaded', timeout: 180000 });
      await page.waitForTimeout(6000);
      const frames = page.frames();
      const text = (await Promise.all(frames.map(frame => frame.locator('body').innerText().catch(() => '')))).join('\n');
      assert.ok(text.length > 50, 'Game rendered an interface');
      assert.ok(!/Failed to resolve module specifier|Error loading game|Could not load game/i.test(text));
      assert.deepEqual(errors, [], errors.join('\n'));
      assert.deepEqual(failed, [], failed.join('\n'));
      const sessions = (await Promise.all(frames.map(frame => frame.evaluate(() => window.__STATOZ_ENGINE__?.sessions() ?? []).catch(() => [])))).flat();
      await page.screenshot({ path: path.join(output, `${game.id}.png`) });
      report.push({ gameId: game.id, passed: true, sessions }); console.log(`PASS ${game.title}: browser load, modules and local assets`);
    } catch (error) { report.push({ gameId: game.id, passed: false, error: error.message, errors, failed }); console.error(`FAIL ${game.title}: ${error.message}`); }
    finally { await context.close(); }
  }
} finally { await browser.close(); await fs.writeFile(path.join(output, 'summary.json'), JSON.stringify(report, null, 2)); }
assert.ok(report.every(game => game.passed), 'All 14 game integrations must load without errors');
