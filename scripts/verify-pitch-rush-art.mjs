import fs from 'node:fs/promises';
import http from 'node:http';
import assert from 'node:assert/strict';
import path from 'node:path';
import {chromium} from '@playwright/test';

const root = process.cwd(), output = path.join(root, 'test-results/pitch-rush/kenney');
await fs.mkdir(output, {recursive: true});
const html = await fs.readFile(path.join(root, 'public/embedded-games/pitch-rush/index.html'));
const server = http.createServer((req, res) => {res.setHeader('Content-Type','text/html');res.end(html);});
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-gpu']});
const errors = [], remote = [], evidence = [];
try {
  const context = await browser.newContext({viewport:{width:1280,height:800}});
  const page = await context.newPage();page.on('pageerror',e => errors.push(e.message));
  page.on('request',request => {if (!request.url().startsWith(origin) && !request.url().startsWith('data:')) remote.push(request.url());});
  await page.addInitScript(() => {
    const decode = Image.prototype.decode;
    Image.prototype.decode = function() {
      if (!this.src.startsWith('data:image/png')) return decode.call(this);
      return new Promise((resolve,reject) => {window.__releaseArt = () => decode.call(this).then(resolve,reject);});
    };
  });
  await page.goto(origin);
  await page.waitForFunction(() => typeof window.__releaseArt === 'function');
  assert.equal(await page.locator('#start').isDisabled(), true);
  assert.equal(await page.evaluate(() => typeof window.__game), 'undefined');
  await page.evaluate(() => window.__releaseArt());
  await page.waitForFunction(() => document.documentElement.dataset.artState === 'ready');
  assert.equal(await page.locator('#start').isDisabled(), false);
  evidence.push('Atlas decoding gates input, renderer construction and ready');
  await page.screenshot({path:path.join(output,'lobby-desktop.png')});
  await page.locator('[data-action="quick"]').click();
  await page.locator('#start').click();
  await page.locator('[data-action="skip-offer"]').click();
  await page.evaluate(() => {
    const game = window.__game, s = game.state;game.paused = true;s.phase = 'play';s.message = '';s.ball.owner = null;
    Object.assign(s.ball, {x:400,y:580,z:0,vx:0,vy:0,kicker:{team:0,idx:5,ticks:20}});
    for(let t=0;t<2;t++)for(let i=0;i<11;i++) {
      const p=s.teams[t].players[i], angle=(i%8)*Math.PI/4;
      Object.assign(p,{x:160+(i%6)*95,y:400+Math.floor(i/6)*90+t*190,vx:70,vy:0,dirX:Math.cos(angle),dirY:Math.sin(angle),cooldown:i===5?10:0,slide:i===2?12:0,down:i===3?12:0,charging:i===4,charge:i===4?40:0});
    }
  });
  await page.waitForTimeout(120);
  await page.screenshot({path:path.join(output,'players-headings-poses.png')});
  await page.evaluate(() => {for(const team of window.__game.state.teams)for(const p of team.players)p.x+=7;});
  await page.waitForTimeout(100);
  await page.screenshot({path:path.join(output,'players-run-stride.png')});
  for (const [name, y, z] of [['goal-top',80,0],['goal-bottom',1080,0],['airborne-ball',580,150]]) {
    await page.evaluate(({y,z}) => {Object.assign(window.__game.state.ball,{y,z});}, {y,z});
    await page.waitForTimeout(500);
    await page.screenshot({path:path.join(output,`${name}.png`)});
  }
  evidence.push('Native-scale headings, running limbs, slides, down poses, keepers, both goals and airborne ball');
  await context.setOffline(true);await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => document.documentElement.dataset.artState), 'ready');
  await context.close();

  const failure = await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
  failure.on('pageerror',e => errors.push(e.message));
  await failure.addInitScript(() => {
    const decode = Image.prototype.decode;let fail = true;
    Image.prototype.decode = function() {if (fail && this.src.startsWith('data:image/png')) {fail=false;return Promise.reject(Error('Simulated decode failure'));}return decode.call(this);};
  });
  await failure.goto(origin);
  await failure.waitForFunction(() => document.documentElement.dataset.artState === 'error');
  assert.equal(await failure.evaluate(() => typeof window.__game),'undefined');
  await failure.screenshot({path:path.join(output,'asset-failure.png')});
  await failure.locator('#retryArt').click();
  await failure.waitForFunction(() => document.documentElement.dataset.artState === 'ready');
  await failure.screenshot({path:path.join(output,'lobby-mobile.png')});
  evidence.push('Decode failure is visible and retry initializes successfully');
  await failure.close();

  const disposed = await browser.newPage();
  await disposed.addInitScript(() => {const decode=Image.prototype.decode;Image.prototype.decode=function(){return new Promise(resolve=>{window.__releaseArt=()=>decode.call(this).then(resolve);});};});
  await disposed.goto(origin);await disposed.waitForFunction(() => !!window.__releaseArt);
  await disposed.evaluate(() => {window.__STATOZ_HOST__.command('dispose');window.__releaseArt();});
  await disposed.waitForTimeout(120);
  assert.equal(await disposed.evaluate(() => typeof window.__game),'undefined');
  evidence.push('Disposal during decode does not start the runtime');
  await disposed.close();
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
  const report = {passed:true,evidence,errors,remote};
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
} finally {
  server.close();const shutdown=setTimeout(() => process.exit(process.exitCode || 0),10000);
  await browser.close();clearTimeout(shutdown);
}
