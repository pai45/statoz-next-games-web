// Render the actual Yorker cast and stadium in controlled close-ups, not replacement mock models.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {createYorkerServer} from '../scripts/preview-yorker.mjs';

const baseline = process.env.YORKER_ART_BASELINE === '1';
const out = path.resolve('test-results/yorker-app', baseline ? 'art-before' : 'art-after');
await fs.mkdir(out, {recursive: true});
const font = (await fs.readFile('src/features/games/yorker/barlow-condensed.woff2')).toString('base64');
const bundle = await build({
  stdin: {
    resolveDir: process.cwd(), loader: 'js', contents: `
      import * as T from 'three';
      import {YorkerView} from './src/features/games/yorker/renderer';
      import {POSES, bowlingAction, stride} from './src/features/games/yorker/character';
      import {newMatch} from './src/features/games/yorker/engine';
      import {SPELLS, VENUES} from './src/features/games/yorker/data';
      const canvas = document.querySelector('canvas'), view = new YorkerView(canvas);
      await view.load('/games/yorker/');
      let match, venue;
      const cast = () => [...view.bowlers.values(), ...view.batters.values(), view.keeper, view.umpire, view.legUmpire, ...view.fielders].filter(Boolean);
      const select = role => role === 'batter' ? [...view.batters.values()][0] : role === 'bowler' ? view.bowlers.get(match.bowler.kind) : role === 'fielder' ? view.fielders[0] : view[role];
      const camera = (target, angle = .25, distance = 4, height = 1.5, fov = 30) => {
        view.camera.position.set(target.x + Math.sin(angle) * distance, height, target.z + Math.cos(angle) * distance);
        view.camera.fov = fov; view.camera.aspect = canvas.clientWidth / canvas.clientHeight;
        view.camera.updateProjectionMatrix(); view.camera.lookAt(target);
        cast().forEach(p => {if (p.outer.visible) p.updateDetail(view.camera);});
        view.renderer.render(view.scene, view.camera);
      };
      const setVenue = (time = 'night', kind = 'pace') => {
        venue = Object.values(VENUES).find(v => v.time === time);
        const challenge = {...SPELLS[0], venue: venue.id, team: 'hawks', bowler: 'any'};
        match = newMatch(challenge, kind, 22);
        view.lastPhase = ''; view.draw(match, 10, {reduced: false});
      };
      setVenue();
      const solo = (role, pose = 'stand', t = 0) => {
        cast().forEach(p => p.outer.visible = false);
        const p = select(role); p.outer.visible = true; p.place(0, -4, 0);
        p.begin(100, 'review-' + pose, .01);
        p.pose(pose === 'bowl' ? bowlingAction(match.bowler.kind === 'spin', t) : pose === 'run' ? stride(t, .9) : POSES[pose]);
        p.end(); p.begin(101, 'review-' + pose, .01);
        p.pose(pose === 'bowl' ? bowlingAction(match.bowler.kind === 'spin', t) : pose === 'run' ? stride(t, .9) : POSES[pose]);
        p.end(); p.outer.updateMatrixWorld(true);
        view.stadium.showTarget(false);
        const box = new T.Box3().setFromObject(p.outer);
        return {role, pose, min: box.min.toArray(), max: box.max.toArray(), ...p.inspection()};
      };
      window.__YORKER_ART__ = {
        venue: setVenue,
        solo,
        full: (angle = .25) => camera(new T.Vector3(0, .95, -4), angle, 4.4, 1.55),
        face: role => {const p = select(role), head = p.headWorld().add(new T.Vector3(0, .13, 0)); camera(head, .18, 1.08, head.y + .06, 27);},
        row: (angle = 0) => {
          cast().forEach(p => p.outer.visible = false);
          ['batter', 'bowler', 'keeper', 'umpire'].forEach((role, i) => {const p = select(role); p.outer.visible = true; p.place((i - 1.5) * 1.3, -4, 0); p.begin(100, 'review-stand'); p.pose(POSES.stand); p.end(); p.begin(101, 'review-stand'); p.pose(POSES.stand); p.end();});
          view.stadium.showTarget(false); camera(new T.Vector3(0, .95, -4), angle, 8.5, 1.65, 29);
        },
        gameplay: time => {setVenue(time); view.lastPhase = ''; view.draw(match, 10, {reduced: false});},
        metrics: () => ({...view.inspection(), geometries: view.renderer.info.memory.geometries, textures: view.renderer.info.memory.textures,
          bodyVertices: select('bowler').body.geometry.getAttribute('position').count,
          bodyTriangles: (select('bowler').body.geometry.index?.count ?? select('bowler').body.geometry.getAttribute('position').count) / 3,
          face: (() => {const p = select('bowler'), b = p.body, h = p.bone('Head'), i = b.skeleton.bones.indexOf(h); const m = b.matrixWorld.clone().multiply(b.bindMatrixInverse).multiply(h.matrixWorld).multiply(b.skeleton.boneInverses[i]).multiply(b.bindMatrix); return {head: p.headWorld().toArray(), crown: p.bone('HeadTop_End').getWorldPosition(new T.Vector3()).toArray(), forward: new T.Vector3(0, 0, 1).transformDirection(m).toArray()};})()}),
        dispose: () => view.dispose()
      };
    `,
  },
  bundle: true, format: 'esm', target: 'es2022', write: false,
});
const assets = createYorkerServer();
const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.setHeader('Content-Type', 'text/html');
    res.end(`<!doctype html><meta charset="utf-8"><style>@font-face{font-family:YorkerCondensed;src:url(data:font/woff2;base64,${font});font-weight:700}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#070d18}canvas{display:block;width:100%;height:100%}</style><canvas></canvas><script type="module" src="/review.js"></script>`);
  } else if (req.url === '/review.js') {
    res.setHeader('Content-Type', 'text/javascript'); res.end(bundle.outputFiles[0].text);
  } else if (req.url === '/favicon.ico') res.writeHead(204).end();
  else assets.emit('request', req, res);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
const executablePath = process.env.CHROME_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const browser = await chromium.launch({
  ...(executablePath ? {executablePath} : {channel: 'chrome'}), headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({viewport: {width: 1280, height: 800}, deviceScaleFactor: 1});
const errors = [], failed = [], poses = [], metrics = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {if (message.type() === 'error') errors.push(message.text().slice(0, 500));});
page.on('response', response => {if (response.status() >= 400) failed.push(response.url());});
page.on('request', request => {if (/^https?:/.test(request.url()) && !request.url().startsWith(origin)) failed.push(request.url());});
const lab = (name, ...args) => page.evaluate(([name, args]) => window.__YORKER_ART__[name](...args), [name, args]);
const shot = async name => {
  await page.screenshot({path: path.join(out, name + '.png')});
  metrics.push({name, ...await lab('metrics')});
};

try {
  await page.goto(origin, {timeout: 120000});
  await page.waitForFunction(() => window.__YORKER_ART__, null, {timeout: 120000});
  await lab('row'); await shot('01-night-lineup');
  await lab('row', Math.PI); await shot('02-night-lineup-back');
  for (const role of ['bowler', 'batter', 'umpire']) {
    await lab('solo', role); await lab('face', role); await shot('03-face-' + role);
  }
  await lab('venue', 'day');
  await lab('row'); await shot('04-day-lineup');
  for (const [role, pose, t] of [
    ['bowler', 'run', .8], ['bowler', 'bowl', -.22], ['bowler', 'bowl', 0], ['bowler', 'bowl', .2],
    ['keeper', 'keep', 0], ['fielder', 'slip', 0], ['umpire', 'signalOut', 0],
  ]) {
    const bounds = await lab('solo', role, pose, t); poses.push(bounds);
    if (role === 'bowler') assert.equal(bounds.asset, 'blender-5.2', 'the real bowler uses the Blender export');
    assert.ok([...bounds.min, ...bounds.max].every(Number.isFinite), role + '/' + pose);
    assert.ok(bounds.max[1] < 3.2 && bounds.min[1] > -.18, JSON.stringify(bounds));
    if (pose === 'bowl' && t === 0) {await lab('full', .7); await shot('05-pace-release');}
  }
  await lab('venue', 'night', 'spin');
  await lab('solo', 'bowler', 'bowl', 0); await lab('full', .7); await shot('06-spin-release');
  for (const time of ['day', 'dusk', 'night']) {
    await lab('gameplay', time); await shot('07-broadcast-' + time);
  }
  await page.setViewportSize({width: 844, height: 390});
  await lab('gameplay', 'night'); await shot('08-phone-broadcast');
  const budget = metrics.find(m => m.name === '07-broadcast-night');
  assert.ok(budget.triangles < 900000 && budget.drawCalls < 650, JSON.stringify(budget));
  if (!baseline) {
    assert.ok(metrics.some(m => m.bodyTriangles > 10000), 'near-camera geometry is used for character close-ups');
    assert.ok(budget.players.some(player => !player.detailed), 'distant broadcast players use the lighter shared body');
    await page.setViewportSize({width: 1280, height: 800}); await lab('gameplay', 'night');
    const warmed = await lab('metrics');
    await lab('gameplay', 'day'); await lab('gameplay', 'night');
    const recycled = await lab('metrics');
    assert.ok(recycled.textures <= warmed.textures+4, `cast texture cleanup: ${warmed.textures} -> ${recycled.textures}`);
    assert.ok(recycled.geometries <= warmed.geometries+6, `cast geometry cleanup: ${warmed.geometries} -> ${recycled.geometries}`);
  }
  assert.deepEqual(errors, [], 'no JavaScript or shader errors');
  assert.deepEqual(failed, [], 'no failed or remote assets');
  await fs.writeFile(path.join(out, 'checks.json'), JSON.stringify({errors, failed, poses, metrics}, null, 2));
  console.log('PASS Yorker art review: roles, bowling poses, three venues, phone framing and GPU budgets');
  console.log(JSON.stringify({bodyTriangles: budget.bodyTriangles, sceneTriangles: budget.triangles, drawCalls: budget.drawCalls, textures: budget.textures}));
} catch (error) {
  await page.screenshot({path: path.join(out, 'failure.png')}).catch(() => {});
  console.error('Rendering errors:', errors, 'Failed requests:', failed);
  throw error;
} finally {
  await lab('dispose').catch(() => {}); await browser.close();
  await new Promise(resolve => server.close(resolve));
}
