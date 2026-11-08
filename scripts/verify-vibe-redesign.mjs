import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {chromium} from '@playwright/test';

const root = path.resolve('public'), out = 'test-results/vibe-basketball/redesign';
await fs.mkdir(out, {recursive: true});
const mime = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.woff2': 'font/woff2', '.txt': 'text/plain'};
const server = http.createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, 'http://local').pathname).replace(/^\/statoz-games-web(?=\/)/, '');
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep)) throw Error('Invalid path');
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    res.end(await fs.readFile(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/statoz-games-web/embedded-games/vibe-basketball/index.html`;
// Linux CI uses /usr/bin/chromium; elsewhere fall back to the installed Chrome, as the other browser checks do.
const executablePath = process.env.VIBE_CHROMIUM || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const browser = await chromium.launch({...(executablePath ? {executablePath} : {channel: 'chrome'}), headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader']});
const errors = [], evidence = [];
async function ready(page) {
  await page.waitForFunction(() => document.getElementById('loading').classList.contains('done'), null, {timeout: 90000});
  // Evidence captures wait for the loading overlay's 0.5 s fade to finish.
  await page.waitForFunction(() => getComputedStyle(document.getElementById('loading')).opacity === '0', null, {timeout: 10000});
}
try {
  for (const [width, height] of [[1440, 900], [390, 844], [320, 568], [844, 390], [667, 375]]) {
    console.log(`Checking blacktop lobby and contest at ${width}×${height}`);
    const page = await browser.newPage({viewport: {width, height}, hasTouch: width < 1100, isMobile: width < 1100});
    page.on('pageerror', error => errors.push(error.message));
    const requests = [];
    page.on('request', request => requests.push(request.url()));
    // SwiftShader's full-size shadow/bloom pass blocks pointer dispatch. The
    // existing performance suite separately exercises explicit High and Auto.
    await page.goto(base + (width >= 1100 ? '?quality=performance' : ''));
    await ready(page);
    await page.evaluate(() => window.advanceTime(100));
    const layout = await page.evaluate(() => {
      const controls = [...document.querySelectorAll('#mode-menu button')].map(node => {
        const rect = node.getBoundingClientRect();
        return {x: rect.x, y: rect.y, width: rect.width, height: rect.height};
      });
      return {controls, width: innerWidth, height: innerHeight, scroll: document.documentElement.scrollWidth, character: window.__VIBE_LOBBY__.rig.group.userData.characterDesign, quality: window.__VIBE_PERFORMANCE__.snapshot()};
    });
    assert.ok(layout.scroll <= width);
    for (const button of layout.controls) {
      assert.ok(button.x >= 0 && button.y >= 0 && button.x + button.width <= width + 1 && button.y + button.height <= height + 1, 'menu action remains in one viewport');
      assert.ok(button.height >= 44, 'comfortable menu targets');
    }
    assert.equal(layout.character.artist, 'Quaternius');
    assert.equal(layout.character.articulatedFingers, true);
    if (width < 1100) assert.ok(layout.quality.fast && !layout.quality.bloom, 'mobile auto remains lightweight');
    assert.ok(requests.every(url => url.startsWith(new URL(base).origin)), 'no external runtime asset requests');
    assert.ok(requests.some(url => url.includes('/models/athletes/athlete-male.glb')));
    await page.screenshot({path: `${out}/lobby-${width}x${height}.png`});
    await page.locator('#mode-how-to').click();
    await page.locator('#how-to-back').scrollIntoViewIfNeeded();
    await page.locator('#how-to-back').click();
    await page.locator('#mode-three-point').click();
    await page.waitForURL(url => url.searchParams.get('mode') === 'three-point');
    await ready(page);
    await page.waitForFunction(() => window.__game?.state === 'player-count');
    await page.evaluate(() => window.advanceTime(1));
    await page.locator('[data-player-count="4"]').click();
    await page.locator('[data-rack="top"]').click();
    await page.evaluate(() => window.advanceTime(4000));
    await page.waitForFunction(() => window.__game.state === 'running');
    await page.screenshot({path: `${out}/contest-${width}x${height}.png`});
    evidence.push({width, height, layout});
    await page.close();
  }

  const page = await browser.newPage({viewport: {width: 1100, height: 800}});
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '?quality=performance&mode=1v1');
  await ready(page);
  await page.evaluate(() => window.advanceTime(1800));
  const start = await page.evaluate(() => window.__game.userPlayer.pos.toArray());
  await page.keyboard.down('w');
  await page.evaluate(() => window.advanceTime(500));
  await page.keyboard.up('w');
  const movement = await page.evaluate(() => ({
    pos: window.__game.userPlayer.pos.toArray(),
    verticesFinite: window.__game.players.every(player => [...player.rig.meshSkin.geometry.attributes.position.array].every(Number.isFinite)),
    details: window.__game.players.map(player => player.rig.group.userData.characterDesign),
    helpHidden: document.getElementById('controls-help').classList.contains('hidden'),
  }));
  assert.ok(Math.hypot(movement.pos[0] - start[0], movement.pos[2] - start[2]) > .2, 'root locomotion remains functional');
  assert.ok(movement.verticesFinite && movement.helpHidden);
  assert.ok(movement.details.every(detail => detail.version === 3));
  await page.locator('#vibe-toolbar [data-command=pause]').click();
  const paused = await page.evaluate(() => window.render_game_to_text());
  await page.evaluate(() => window.advanceTime(1000));
  assert.equal(await page.evaluate(() => window.render_game_to_text()), paused, 'pause freezes the new animation and existing game');
  await page.locator('[data-command=resume]').click();
  await page.close();

  const preview = await browser.newPage({viewport: {width: 800, height: 900}});
  preview.on('pageerror', error => errors.push(error.message));
  await preview.goto(base + '?mode=three-point&quality=high');
  await ready(preview);
  await preview.evaluate(() => window.advanceTime(1));
  await preview.addStyleTag({content: '#hud,#vibe-toolbar,#vibe-touch{display:none!important}'});
  const profiles = await preview.evaluate(() => window.__game.players.map(player => player.rig.group.userData.characterDesign));
  for (let index = 0; index < profiles.length; index++) {
    const pose = await preview.evaluate(index => {
      const game = window.__game, player = game.players[index], rig = player.rig;
      game.update = () => {}; game.cameraRig.update = () => {};
      for (const other of game.players) {
        other.rig.group.visible = other === player;
        other.rig.shadow.visible = other === player;
        other.rig.ring.visible = false; other.userMarker.visible = false;
      }
      rig.group.rotation.set(0, 0, 0);
      player.animator.update(.1, {gait: 'idle', speed: 0, grip: {Left: 0, Right: .8}});
      rig.armature.updateMatrixWorld(true);
      const grounded = ['shot', 'dribbleMove', 'land'].map(name => {
        player.animator.update(.1, {gait: 'idle', speed: 0, shotRelease: .68, moveName: 'cross', moveDir: 1, pose: {name, t: .30, weight: 1}});
        rig.armature.updateMatrixWorld(true);
        return {name, height: rig.bones.LeftFoot.getWorldPosition(rig._vA).y - rig.group.position.y};
      });
      player.animator.update(.1, {gait: 'idle', speed: 0, grip: {Left: 0, Right: .8}});
      rig.armature.updateMatrixWorld(true);
      const location = rig.group.position, camera = game.cameraRig.camera;
      camera.position.set(location.x + .55, location.y + 1.25, location.z + 3.0);
      camera.lookAt(location.x, location.y + 1.0, location.z);
      camera.fov = 38; camera.updateProjectionMatrix();
      window.advanceTime(100);
      return {leftFoot: rig.bones.LeftFoot.getWorldPosition(rig._vA).y - location.y, curl: rig.bones.RightIndex3.rotation.x, grounded};
    }, index);
    assert.ok(Math.abs(pose.leftFoot - .095) < .015, 'planted shoes stay on the floor');
    assert.ok(pose.grounded.every(take => Math.abs(take.height - .095) < .015), 'shot gathers, hand changes and landing absorbs retain ground contact');
    assert.ok(pose.curl < -.25, 'articulated ball-hand fingers curl');
    await preview.screenshot({path: `${out}/athlete-${profiles[index].name.toLowerCase()}.png`});
  }
  await preview.close();
  const reduced = await browser.newPage({reducedMotion: 'reduce', viewport: {width: 900, height: 700}});
  await reduced.goto(base + '?quality=performance'); await ready(reduced);
  const before = await reduced.evaluate(() => window.__VIBE_LOBBY__.ball.rotation.x);
  await reduced.evaluate(() => window.advanceTime(2000));
  assert.equal(await reduced.evaluate(() => window.__VIBE_LOBBY__.ball.rotation.x), before, 'warmup respects reduced motion');
  await reduced.close();
  assert.deepEqual(errors, []);
  await fs.writeFile(`${out}/validation.json`, JSON.stringify({evidence, movement, profiles, errors, physicalDevices: false}, null, 2));
  console.log('Redesign: five responsive lobbies, local licensed assets, both modes, pause, grounded feet, finger articulation and reduced motion passed.');
} finally {
  await browser.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
