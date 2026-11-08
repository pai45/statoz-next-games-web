// Renders the Rally Dash cover from the game's own renderer: a staged autopilot run, HUD hidden.
//   node scripts/render-rally-dash-cover.mjs [--url=http://localhost:3000] [--stage=pine-ridge] [--at=9] [--slip=4] [--zoom=3] [--crew=0] [--out=public/assets/games/rally-dash/cover.webp]
// The shot is taken at the first moment after --at seconds when the car slides sideways faster than --slip m/s.
// Needs a running dev server. Output: 1200×800 WebP (via sharp), the same size as the other covers.
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const arg = (name, fallback) => process.argv.find(v => v.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const origin = arg('url', 'http://localhost:3000'), stage = arg('stage', 'pine-ridge'), at = Number(arg('at', '9')), zoom = Number(arg('zoom', '3')), crew = Number(arg('crew', '0')), slip = Number(arg('slip', '4'));
const out = path.resolve(arg('out', 'public/assets/games/rally-dash/cover.webp'));
const browser = await chromium.launch({ executablePath: process.env.MOBILE_VIEWPORT_CHROMIUM || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
await context.addInitScript(({ stage, crew }) => {
  localStorage.setItem('statoz.games.web.auth.v2', JSON.stringify({ version: 2, authenticated: true, email: 'cover@example.test' }));
  localStorage.setItem('statoz.games.web.accounts.v1', JSON.stringify({ version: 1, accounts: { 'cover@example.test': { onboardingComplete: true } } }));
  localStorage.setItem('statoz.games.web.rally-dash.v1', JSON.stringify({ version: 1, rulesVersion: 1, setup: { version: 1, mode: 'stage', stage, crew, rivals: 'pro', laps: 3, autoThrottle: false, brakeAssist: false, noteSounds: false, camera: 'chase', engineVolume: 0, effectsVolume: 0, muted: true, touchSize: 68, touchOpacity: .85 }, records: {}, recent: [], tutorialSeen: true }));
}, { stage, crew });
const page = await context.newPage();
await page.goto(`${origin}/play/rally`, { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.getByRole('button', { name: /QUICK START/ }).click({ timeout: 180000 });
await page.waitForFunction(() => window.__RALLY_DASH_INSPECT__?.snapshot().phase === 'running', null, { timeout: 30000 });
await page.addStyleTag({ content: 'main canvas ~ *:not(canvas){visibility:hidden!important} nextjs-portal{display:none!important}' });
await page.evaluate(z => { window.__RALLY_DASH_INSPECT__.autopilot(true); window.__RALLY_DASH_INSPECT__.zoom(z); }, zoom);
await page.waitForFunction(([t, min]) => { const s = window.__RALLY_DASH_INSPECT__.snapshot(); return s.raceClock >= t && s.player.slip >= min; }, [at, slip], { timeout: 120000, polling: 16 });
const shot = await page.locator('canvas').first().screenshot();
await fs.mkdir(path.dirname(out), { recursive: true });
await sharp(shot).resize(1200, 800, { fit: 'cover' }).webp({ quality: 84 }).toFile(out);
console.log('cover', out, JSON.stringify(await page.evaluate(() => window.__RALLY_DASH_INSPECT__.snapshot().player)));
await browser.close();
