import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';
import sharp from 'sharp';
const origin=process.env.HOLDOVER_TEST_ORIGIN || 'http://localhost:3000';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  await page.addInitScript(()=>{window.__STATOZ_BOOT__={stores:{'holdover.profile.v1':JSON.stringify({version:1,settings:{quality:'performance'}})}}});
  await page.goto(origin+'/embedded-games/holdover/index.html');
  await page.locator('.main-nav').waitFor({timeout:120000});
  await page.locator('.nav-item').filter({hasText:'Campaign'}).click();
  await page.getByRole('button',{name:'Deploy',exact:true}).click();
  await page.locator('.stage.in-game').waitFor();
  await page.waitForTimeout(5000);
  await page.addStyleTag({content:'.overlay-canvas,.hud,.grain{visibility:hidden!important}'});
  const pixels=await page.locator('.stage').screenshot();
  await fs.mkdir('public/games/holdover',{recursive:true});
  const art=await sharp(pixels).resize(720,960,{fit:'cover',position:'centre'}).modulate({brightness:1.1}).toBuffer();
  const overlay=Buffer.from(`<svg width="720" height="960" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="shade" x2="0" y2="1"><stop stop-color="#050607" stop-opacity=".92"/><stop offset=".43" stop-color="#050607" stop-opacity=".03"/><stop offset="1" stop-color="#050607" stop-opacity=".85"/></linearGradient></defs><rect width="720" height="960" fill="url(#shade)"/><g fill="none" stroke="#d9a03f" stroke-width="3"><circle cx="360" cy="96" r="24"/><circle cx="360" cy="96" r="8"/><path d="M360 59v24m0 26v24m-37-37h24m26 0h24"/></g><text x="360" y="213" fill="#ecebe2" font-family="Arial,sans-serif" font-size="78" font-weight="900" text-anchor="middle" letter-spacing="6">HOLDOVER</text><text x="360" y="250" fill="#d9a03f" font-family="Arial,sans-serif" font-size="16" font-weight="700" text-anchor="middle" letter-spacing="5">SARN VALLEY OPERATIONS</text><path d="M64 832h592" stroke="#d9a03f"/><text x="360" y="879" fill="#ecebe2" font-family="Arial,sans-serif" font-size="21" font-weight="700" text-anchor="middle" letter-spacing="3">ONE VALLEY. EVERY SHOT COUNTS.</text><text x="360" y="914" fill="#d9a03f" font-family="Arial,sans-serif" font-size="15" text-anchor="middle" letter-spacing="4">CAMPAIGN / QUICK DUEL</text></svg>`);
  await sharp(art).composite([{input:overlay}]).png().toFile('public/games/holdover/cover.png');
  const bytes=await fs.readFile('public/games/holdover/cover.png');
  await fs.writeFile('public/games/holdover/PROVENANCE.json', JSON.stringify({cover:{file:'cover.png',source:'Captured from the imported Holdover campaign renderer by scripts/capture-holdover-cover.mjs; title/crosshair overlay authored locally.',sha256:createHash('sha256').update(bytes).digest('hex')},runtime:'Built from src/features/games/holdover/source; see src/features/games/holdover/source/NOTICE.md, SOURCE.json and FONT-PROVENANCE.json.'},null,2)+'\n');
  console.log('Captured Holdover cover from its imported 3D campaign renderer.');
} finally {await browser.close();}
