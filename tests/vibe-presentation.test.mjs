import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {basketballGait, basketballPose, basketballFingers} from '../src/features/games/vibe-basketball/basketball-motion.js';
import {createBasketballJersey, createBasketballShorts, fitClothOutsideBody, maskKitCoveredSkin} from '../src/features/games/vibe-basketball/basketball-kit.js';

const art = 'public/games/vibe-basketball/art/';
async function athlete(sex) {
  const bytes = await fs.readFile(art + `athlete-${sex}.glb`);
  const model = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  let body;
  model.scene.traverse(node => { if (node.isSkinnedMesh && node.material.name === 'skin') body = node; });
  return {scene: model.scene, body};
}

test('every shipped third-party asset has a verified hash, compatible licence and retained credit', async () => {
  const manifest = JSON.parse(await fs.readFile(art + 'PROVENANCE.json', 'utf8'));
  assert.equal(manifest.license, 'CC0-1.0');
  assert.equal(manifest.basketball.license, 'CC-BY-3.0');
  assert.match(manifest.originalSource, /^https:\/\/quaternius\.com\//);
  for (const [file, expected] of Object.entries(manifest.files)) {
    assert.equal(createHash('sha256').update(await fs.readFile(art + file)).digest('hex'), expected, file);
  }
  const credits = await fs.readFile(art + 'CREDITS.txt', 'utf8');
  assert.match(credits, /Quaternius/);
  assert.match(credits, /Zer0_Time/);
  assert.match(credits, /https:\/\/creativecommons\.org\/licenses\/by\/3\.0\//);
  const distribution = await fs.readFile('public/embedded-games/vibe-basketball/LICENSES.txt', 'utf8');
  for (const author of ['mike007jd', 'Quaternius', 'Zer0_Time', 'SIL OPEN FONT LICENSE']) assert.ok(distribution.includes(author), author);
});

for (const sex of ['male', 'female']) {
  test(`${sex} athlete retains a detailed face, valid weights and articulated fingers on the contact rig`, async () => {
    const {body, scene} = await athlete(sex);
    assert.ok(body);
    assert.ok(body.geometry.index.count / 3 > 12000);
    assert.equal(body.skeleton.bones.length, 62);
    const names = new Set(body.skeleton.bones.map(bone => bone.name));
    for (const name of ['Hips', 'Head', 'LeftHand', 'RightHand', 'LeftIndex3', 'RightThumb3', 'LeftFoot']) assert.ok(names.has(name), name);
    const {position, skinIndex, skinWeight} = body.geometry.attributes;
    for (let i = 0; i < position.count; i++) {
      for (let component = 0; component < 3; component++) assert.ok(Number.isFinite(position.getComponent(i, component)));
      let total = 0;
      for (let slot = 0; slot < 4; slot++) {
        assert.ok(skinIndex.getComponent(i, slot) < body.skeleton.bones.length);
        total += skinWeight.getComponent(i, slot);
      }
      assert.ok(Math.abs(total - 1) < .0001, `weight sum at vertex ${i}`);
    }
    const roles = new Set();
    scene.traverse(node => { if (node.isSkinnedMesh) roles.add(node.material.name); });
    assert.deepEqual(roles, new Set(['skin', 'eyes', 'brows']));
    const jersey = createBasketballJersey(body.skeleton);
    assert.ok(jersey.index.count > 5000);
    for (const value of jersey.attributes.normal.array) assert.ok(Number.isFinite(value), 'finite fitted cloth normal');
    // Every point on the neckline/shoulders is part of a patterned surface, not
    // a horizontal solid cap or a separate floating number plane.
    assert.ok(jersey.attributes.position.count > 1500);
    assert.ok(jersey.attributes.uv.count === jersey.attributes.position.count);
    const visible = maskKitCoveredSkin(body.geometry, body.skeleton);
    assert.ok(visible.index.count < body.geometry.index.count * .85, 'skin under jersey/shorts/socks is not rendered through the cloth');
    assert.ok(visible.index.count > 12000, 'face, arms, hands and exposed legs remain detailed');
    assert.equal(maskKitCoveredSkin(body.geometry, body.skeleton), visible, 'immutable fitted geometry is shared between players');
  });

  test(`${sex} shorts are one garment: closed centre seams on the hips, separate legs and outward normals`, async () => {
    const {body} = await athlete(sex);
    const shorts = createBasketballShorts(body.skeleton);
    const {position, normal, skinIndex, skinWeight} = shorts.attributes;
    const half = position.count / 2, names = body.skeleton.bones.map(bone => bone.name);
    const seams = new Map();
    for (let i = 0; i < position.count; i++) {
      const side = i < half ? 1 : -1, x = position.getX(i), y = position.getY(i);
      let total = 0;
      for (let slot = 0; slot < 4; slot++) {
        assert.ok(skinIndex.getComponent(i, slot) < names.length);
        assert.ok(skinWeight.getComponent(i, slot) >= -1e-6);
        total += skinWeight.getComponent(i, slot);
      }
      assert.ok(Math.abs(total - 1) < 1e-5, `shorts weight sum at ${i}`);
      for (const value of [x, y, position.getZ(i), normal.getX(i), normal.getY(i), normal.getZ(i)]) assert.ok(Number.isFinite(value));
      if (y < .85) assert.ok(x * side > 0, 'below the crotch each leg stays on its own side');
      if (y < .8) assert.equal(names[skinIndex.getComponent(i, 2)], side > 0 ? 'LeftUpLeg' : 'RightUpLeg');
      if (y < .8) assert.ok(skinWeight.getComponent(i, 2) > .99, 'the hem follows its thigh rigidly');
      if (Math.abs(x) < 1e-6 && y > .95) {
        const key = [y, position.getZ(i)].map(value => value.toFixed(5)).join(':');
        // Compare effective influences; an unused slot may name either thigh at zero weight.
        const weights = [0, 1, 2, 3].filter(slot => skinWeight.getComponent(i, slot) > 1e-6)
          .map(slot => names[skinIndex.getComponent(i, slot)] + '=' + skinWeight.getComponent(i, slot).toFixed(5)).sort().join(',');
        if (seams.has(key)) assert.equal(weights, seams.get(key), 'both halves of a centre seam bend identically');
        else seams.set(key, weights);
      }
      // At the outermost point of each section the normal faces away from the body.
      if (Math.abs(x) > .2) assert.ok(normal.getX(i) * side > .5, 'outer shorts normals face outward');
    }
    assert.ok(seams.size > 20, 'front and back centre seams are shared above the crotch');
  });

  test(`${sex} jersey fitting keeps the cloth outside the torso skin, welded and cached`, async () => {
    const {body} = await athlete(sex);
    const raw = createBasketballJersey(body.skeleton), started = performance.now();
    const fitted = fitClothOutsideBody(createBasketballJersey(body.skeleton), body.geometry, body.skeleton);
    const elapsed = performance.now() - started;
    assert.ok(elapsed < 4000, `fitting is a one-off load cost (${elapsed.toFixed(0)} ms)`);
    const torso = new Set(['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'LeftShoulder', 'RightShoulder']);
    const {position: skin, normal: skinNormal, skinIndex, skinWeight} = body.geometry.attributes, points = [];
    for (let i = 0; i < skin.count; i++) {
      let weight = 0;
      for (let slot = 0; slot < 4; slot++) if (torso.has(body.skeleton.bones[skinIndex.getComponent(i, slot)].name)) weight += skinWeight.getComponent(i, slot);
      if (weight >= .5 && skin.getY(i) > 1.1 && skin.getY(i) < 1.6) points.push(i);
    }
    const position = fitted.attributes.position, before = raw.attributes.position;
    let moved = 0, inside = 0;
    const coincident = new Map();
    for (let i = 0; i < position.count; i++) {
      if (Math.hypot(position.getX(i) - before.getX(i), position.getY(i) - before.getY(i), position.getZ(i) - before.getZ(i)) > 1e-4) moved++;
      let best = -1, bestDistance = Infinity;
      for (const j of points) {
        const distance = (position.getX(i) - skin.getX(j)) ** 2 + (position.getY(i) - skin.getY(j)) ** 2 + (position.getZ(i) - skin.getZ(j)) ** 2;
        if (distance < bestDistance) { bestDistance = distance; best = j; }
      }
      const depth = (position.getX(i) - skin.getX(best)) * skinNormal.getX(best) + (position.getY(i) - skin.getY(best)) * skinNormal.getY(best) + (position.getZ(i) - skin.getZ(best)) * skinNormal.getZ(best);
      if (bestDistance < .0036 && depth < 0) inside++;
      const key = [before.getX(i), before.getY(i), before.getZ(i)].map(value => Math.round(value * 1e4)).join(',');
      const at = [position.getX(i), position.getY(i), position.getZ(i)];
      if (coincident.has(key)) assert.ok(coincident.get(key).every((value, axis) => Math.abs(value - at[axis]) < 1e-6), 'shared strap/panel seams stay welded');
      else coincident.set(key, at);
    }
    assert.ok(moved > 50, 'the analytic pattern is actually fitted to this body');
    assert.ok(inside <= position.count * .01, `${inside} cloth points remain inside the skin`);
    const again = fitClothOutsideBody(createBasketballJersey(body.skeleton), body.geometry, body.skeleton);
    assert.deepEqual([...again.attributes.position.array], [...position.array], 'every player of a body reuses one fit');
  });
}

function animator() {
  return {
    phase: 0, t: 0, lookWeight: 0, pose: new Map(), hip: 0,
    hips(y) { this.hip = y; },
    addHips(y) { this.hip += y; },
    rot(name, ...rotation) { this.pose.set(name, rotation.slice(0, 3)); },
    addRot(name, x, y, z) {
      const old = this.pose.get(name) || [0, 0, 0];
      this.pose.set(name, old.map((value, i) => value + [x, y, z][i]));
    },
  };
}
test('basketball gait is distance-paced and grounded without modifying root motion or simulation state', () => {
  const a = animator(), b = animator();
  const context = {gait: 'run', speed: 5, crouch: .2, moveLocal: {x: 0, z: 1}};
  const before = JSON.stringify(context);
  for (let i = 0; i < 60; i++) basketballGait(a, 1 / 60, context);
  for (let i = 0; i < 30; i++) basketballGait(b, 1 / 30, context);
  assert.ok(Math.abs(a.phase - b.phase) < 1e-8);
  assert.equal(JSON.stringify(context), before);
  assert.ok(a._basketballFeet.every(foot => foot.y >= .095 && foot.y <= .31));
  for (const gait of ['idle', 'slide', 'air']) {
    assert.equal(basketballGait(a, 1 / 60, {...context, gait}), true);
    for (const rotations of a.pose.values()) assert.ok(rotations.every(Number.isFinite));
  }
});
test('shot load, extension and finger grip follow the engine release fraction rather than a separate action clock', () => {
  const a = animator();
  basketballPose(a, {name: 'shot', t: .30}, {shotRelease: .68});
  const load = a.hip;
  basketballPose(a, {name: 'shot', t: .68}, {shotRelease: .68});
  assert.ok(load < -.10);
  assert.ok(a.hip > load + .08, 'athlete extends by the actual release');
  const bones = {};
  for (const side of ['Left', 'Right']) for (const finger of ['Index', 'Middle', 'Ring', 'Pinky', 'Thumb']) {
    for (let joint = 1; joint <= 3; joint++) bones[side + finger + joint] = {rotation: new THREE.Euler()};
  }
  a.rig = {bones, athleteSkeleton: {}};
  basketballFingers(a, .2, {grip: {Left: 0, Right: 1}});
  assert.ok(bones.RightIndex3.rotation.x < -.6);
  assert.ok(bones.LeftIndex3.rotation.x > -.1);
});
