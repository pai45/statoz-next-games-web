import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {BOWLERS, COACH, DELIVERIES, LESSONS, SPELLS, batterById, quickMatch, type Challenge} from '../src/features/games/yorker/data';
import {BOWLING_POPPING, fly, solveRelease, crossing} from '../src/features/games/yorker/physics';
import {analyseLbw} from '../src/features/games/yorker/batting';
import {OVERSTEP, SWEET, checkpoint, gradeRelease, meterAt, newMatch, restore, review, setDelivery, setTarget, startRunUp, step, tapRelease, type Match} from '../src/features/games/yorker/engine';
import {emptySave, readSave, record, resumed} from '../src/features/games/yorker/save';
import {gameRegistry} from '../src/mocks/games/game-registry';
import {sportGameDecks} from '../src/mocks/games/sport-decks';
import {bundledGameIds} from '../src/features/games/shared/bundled-game-config';
import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {bowlerBodyGeometry} from '../src/features/games/yorker/bowler-asset';
import {coarseBodyGeometry, refineBodyGeometry} from '../src/features/games/yorker/player-geometry';
import {createHeadGeometry, headSurface} from '../src/features/games/yorker/player-head';
import {playerBodyGeometry} from '../src/features/games/yorker/player-jersey';

/** Bowl one ball: plan, run up, release at `meter`, decline or take any review, play until it settles. */
function bowl(m: Match, plan: {x: number; z: number; delivery?: string; meter?: number; review?: boolean}) {
  // The phase changes inside the engine calls, so read it fresh rather than letting TypeScript narrow it.
  const phase = () => m.phase as Match['phase'];
  if (phase() !== 'plan') return;
  if (plan.delivery) setDelivery(m, plan.delivery as never);
  setTarget(m, plan.x, plan.z); startRunUp(m);
  const meter = plan.meter ?? SWEET;
  while (phase() === 'runup') {if (m.meter === null && meter >= 0 && meterAt(m) >= meter) tapRelease(m); step(m);}
  const before = m.checkpoint;
  for (let i = 0; i < 6000 && m.checkpoint === before && phase() !== 'finished'; i++) {if (phase() === 'review') review(m, plan.review ?? true); step(m);}
}
const plans = [{x: .05, z: -1.6, delivery: 'seam'}, {x: .16, z: -5.3, delivery: 'outswing'}, {x: .02, z: -4.6, delivery: 'inswing'}, {x: .05, z: -5, delivery: 'slower'}];
function play(m: Match) {for (let i = 0; m.phase !== 'finished' && i < 60; i++) bowl(m, plans[i%plans.length]); return m;}

test('Yorker joins the cricket hub as its own bundled game beside Cricketer', () => {
  assert.equal(gameRegistry.yorker.href, '/play/yorker');
  assert.equal(gameRegistry.yorker.kind, 'hero');
  const deck = sportGameDecks.cricket;
  assert.equal(deck.indexOf('yorker'), deck.indexOf('cricketer')+1);
  assert.ok(bundledGameIds.includes('yorker'));
});

test('spells, lessons, batters and coach steps are complete and consistent', () => {
  assert.equal(SPELLS.length, 12); assert.equal(LESSONS.length, 5);
  for (const c of [...SPELLS, ...LESSONS]) {
    for (const id of c.lineup) assert.ok(batterById(id), `${c.id}: unknown batter ${id}`);
    assert.ok(c.lineup.length === 0 || c.wicketsInHand <= c.lineup.length, c.id);
    if (c.lesson) assert.ok(COACH[c.lesson].length >= 3, c.lesson);
  }
  for (const b of Object.values(BOWLERS)) for (const d of b.deliveries) assert.equal(DELIVERIES[d].kind, b.kind);
  assert.equal(quickMatch(7).id, 'quick'); assert.deepEqual(quickMatch(7), quickMatch(7));
});

test('the release solver pitches the ball on the chosen spot, with swing and drift', () => {
  for (const [speed, swing, drift] of [[39, 0, 0], [37, 4, 0], [37, -4, 0], [24, 0, -.6]]) for (const z of [-1.5, -4, -6, -9]) for (const x of [-.3, 0, .3]) {
    const params = {swing, drift, deviation: 0, restitution: .58, retention: .87};
    const r = solveRelease({x: .38, y: 2.18, z: BOWLING_POPPING+.32}, speed, {x, z}, params);
    const f = fly(r.p, r.v, params, 1, 3);
    assert.ok(f.bounce, 'it pitched');
    assert.ok(Math.hypot(f.bounce!.x-x, f.bounce!.z-z) < .02, `speed ${speed} swing ${swing} target ${x},${z} landed ${f.bounce!.x.toFixed(3)},${f.bounce!.z.toFixed(3)}`);
  }
});

test('release grading: gold is perfect, late but legal, and overstepping is a no-ball', () => {
  const p = BOWLERS.pace.perfect;
  assert.equal(gradeRelease(SWEET, p).grade, 'perfect');
  assert.equal(gradeRelease(SWEET+p+.02, p).grade, 'late');
  assert.equal(gradeRelease(SWEET-p-.05, p).grade, 'good');
  assert.equal(gradeRelease(.3, p).grade, 'early');
  assert.equal(gradeRelease(OVERSTEP, p).grade, 'no-ball');
  assert.equal(gradeRelease(-1, p).grade, 'no-ball');
  assert.equal(gradeRelease(OVERSTEP, p, true).grade, 'late', 'assist moves the line');
});

test('a no-ball costs a run, does not count and makes the next ball a free hit', () => {
  const m = newMatch(SPELLS[4], 'pace', 42);
  bowl(m, {x: .05, z: -5, meter: -1});
  const r = m.results[0];
  assert.equal(r.legal, false); assert.equal(r.extras, 1); assert.equal(m.legal, 0); assert.equal(m.freeHit, true);
  assert.equal(r.wicket, null);
  bowl(m, {x: .05, z: -5});
  if (m.results[1].legal) assert.equal(m.freeHit, false);
});

test('same inputs give the same spell, and a checkpoint replays it exactly', () => {
  const a = play(newMatch(SPELLS[1], 'pace', 1234)), b = play(newMatch(SPELLS[1], 'pace', 1234));
  assert.deepEqual(a.results, b.results); assert.equal(a.runs, b.runs); assert.equal(a.seed, b.seed);
  const m = newMatch(SPELLS[5], 'spin', 99);
  for (let i = 0; i < 4 && m.phase !== 'finished'; i++) bowl(m, {x: .05, z: -3.8, delivery: i%2 ? 'googly' : 'legbreak'});
  const copy = restore(m.challenge, checkpoint(m));
  assert.deepEqual(copy.results, m.results); assert.equal(copy.seed, m.seed); assert.equal(copy.runs, m.runs); assert.equal(copy.wickets, m.wickets);
  assert.deepEqual(copy.reviews, m.reviews);
});

test('spells end on the objective and award stars', () => {
  let finished = 0;
  for (let seed = 1; seed <= 12; seed++) for (const c of [SPELLS[0], SPELLS[1], SPELLS[4]]) {
    const m = play(newMatch(c, 'pace', seed*7919));
    assert.equal(m.phase, 'finished'); assert.ok(m.result); finished++;
    if (m.result!.won) assert.ok(m.result!.stars >= 1 && m.result!.stars <= 3); else assert.equal(m.result!.stars, 0);
    if (c.objective.type === 'defend' && !m.result!.won) assert.ok(m.runs >= c.objective.target);
    assert.ok(m.legal <= c.balls);
  }
  assert.equal(finished, 36);
});

test('LBW: plumb in front is out; pitching outside leg is never out', () => {
  const params = {swing: 0, drift: 0, deviation: 0, restitution: .58, retention: .87};
  const view = (x: number, z: number) => {const r = solveRelease({x: .38, y: 2.18, z: BOWLING_POPPING+.32}, 38, {x, z}, params); const f = fly(r.p, r.v, params, 1, 3); return {spec: DELIVERIES.seam, params, flight: f, releaseT: 0, bounce: f.bounce, speed: 38, disguised: 0};};
  const straight = view(.02, -3.2), pad = crossing(straight.flight, -1.4)!;
  const plumb = analyseLbw(straight, pad, 'R', 'drive');
  assert.equal(plumb.pitching, 'in-line'); assert.equal(plumb.impact, 'in-line'); assert.notEqual(plumb.wickets, 'missing');
  const leg = view(-.35, -3.2), legPad = crossing(leg.flight, -1.4)!;
  const call = analyseLbw(leg, legPad, 'R', 'drive');
  assert.equal(call.pitching, 'outside-leg'); assert.equal(call.out, false); assert.equal(call.appeal, false);
});

test('the Academy length lesson is won by landing three balls in the box', () => {
  const lesson = LESSONS[0], zone = lesson.objective.type === 'target' ? lesson.objective.zone : null;
  assert.ok(zone);
  const m = newMatch(lesson, 'pace', 5);
  for (let i = 0; i < 10 && m.phase !== 'finished'; i++) bowl(m, {x: (zone!.xMin+zone!.xMax)/2, z: (zone!.zMin+zone!.zMax)/2});
  assert.equal(m.result?.won, true); assert.equal(m.progress.zone, 3);
});

test('saves validate, unlock the next spell on a win and resume unfinished spells', () => {
  let save = emptySave();
  const won = (() => {for (let seed = 1; seed < 40; seed++) {const m = play(newMatch(SPELLS[0], 'pace', seed)); if (m.result?.won) return m;} return null;})();
  assert.ok(won, 'some seed wins the first spell');
  save = record(save, won!);
  assert.equal(save.unlocked, 1); assert.ok(save.spells['spell-1'].stars >= 1); assert.equal(save.checkpoint, null);
  assert.equal(readSave(JSON.stringify(save)).incompatible, false);
  assert.equal(readSave('{"schemaVersion":2}').incompatible, true);
  assert.equal(readSave('{broken').incompatible, true);
  const live = newMatch(SPELLS[1], 'pace', 77); bowl(live, {x: .05, z: -5});
  save = record(save, live);
  const back = resumed(readSave(JSON.stringify(save)).save);
  assert.ok(back); assert.deepEqual(back!.results, live.results);
  const bad = JSON.parse(JSON.stringify(save)); bad.checkpoint.challengeId = 'nope';
  assert.equal(readSave(JSON.stringify(bad)).incompatible, true);
  const injected = JSON.parse(JSON.stringify(save)); injected.checkpoint.inputs[0].delivery = 'googly';
  assert.equal(readSave(JSON.stringify(injected)).incompatible, true, 'a spin delivery cannot appear in a pace spell');
});

test('every runtime asset is recorded in PROVENANCE.json with a matching hash', () => {
  const dir = path.resolve('public/games/yorker'), prov = JSON.parse(fs.readFileSync(path.join(dir, 'PROVENANCE.json'), 'utf8'));
  const listed = new Map<string, {sha256: string; license: string}>([[prov.player.file, prov.player], ...[...prov.models, ...prov.textures, ...prov.audio].map((e: {file: string; sha256: string; license: string}) => [e.file, e] as const)]);
  const walk = (d: string): string[] => fs.readdirSync(d, {withFileTypes: true}).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  for (const file of walk(dir).map(f => path.relative(dir, f).split(path.sep).join('/'))) {
    if (/\.(md|txt|json)$/.test(file) || file === 'cover.png') continue;
    const entry = listed.get(file); assert.ok(entry, `unlisted asset ${file}`);
    assert.equal(createHash('sha256').update(fs.readFileSync(path.join(dir, file))).digest('hex'), entry!.sha256, file);
    assert.ok(['CC0-1.0', 'CC-BY-4.0'].includes(entry!.license), file);
  }
});

test('refined players keep valid skinning, palette seams and shared geometry without changing the licensed source', async () => {
  const bytes = fs.readFileSync('public/games/yorker/player.glb');
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset+bytes.byteLength), '');
  let mesh: T.SkinnedMesh | undefined;
  gltf.scene.traverse(node => {if ((node as T.SkinnedMesh).isSkinnedMesh) mesh = node as T.SkinnedMesh;});
  assert.ok(mesh);
  const source = mesh.geometry;
  const before = Array.from(source.getAttribute('position').array);
  const tailored = playerBodyGeometry(mesh);
  assert.equal(tailored.userData.yorkerTailored, true, 'disconnected source shirt patches are replaced');
  const body = refineBodyGeometry(tailored), p = body.getAttribute('position'), n = body.getAttribute('normal');
  const joints = body.getAttribute('skinIndex'), weights = body.getAttribute('skinWeight'), region = body.getAttribute('_region');
  const uv = body.getAttribute('_kituv');
  const far = coarseBodyGeometry(tailored);
  assert.equal(p.count, far.getAttribute('position').count*4, 'one body subdivision; the old head is replaced rather than rendered twice');
  assert.ok(Array.from(far.getAttribute('_region').array).every(r => r !== 0 && r !== 3 && r !== 4 && r !== 6));
  assert.ok(p.count < 60000, 'body geometry stays within the mobile budget');
  assert.strictEqual(refineBodyGeometry(tailored), body, 'all player instances reuse one refined geometry');
  assert.strictEqual(playerBodyGeometry(mesh), tailored, 'the continuous jersey is shared across the cast');
  assert.deepEqual(Array.from(source.getAttribute('position').array), before, 'source positions are not mutated');
  const seamNormals = new Map<string, number[]>();
  for (let i = 0; i < p.count; i++) {
    assert.ok([p.getX(i), p.getY(i), p.getZ(i), n.getX(i), n.getY(i), n.getZ(i)].every(Number.isFinite));
    assert.ok(Math.abs(Math.hypot(n.getX(i), n.getY(i), n.getZ(i))-1) < .001, `unit normal ${i}`);
    let total = 0;
    for (let c = 0; c < 4; c++) {
      const weight = weights.getComponent(i, c), joint = joints.getComponent(i, c);
      assert.ok(Number.isInteger(joint) && joint >= 0 && weight >= 0 && weight <= 1);
      total += weight;
    }
    assert.ok(Math.abs(total-1) < .0001, `normalised skin weights ${i}`);
    assert.ok(Number.isInteger(region.getX(i)) && region.getX(i) >= 0 && region.getX(i) <= 10);
    assert.ok(Number.isFinite(uv.getX(i)) && Number.isFinite(uv.getY(i)));
    const id = [p.getX(i), p.getY(i), p.getZ(i)].map(x => x.toFixed(5)).join(',');
    const normal = [n.getX(i), n.getY(i), n.getZ(i)], previous = seamNormals.get(id);
    if (previous) assert.ok(previous.every((component, c) => Math.abs(component-normal[c]) < .001), `seam ${id}`);
    else seamNormals.set(id, normal);
  }
  assert.equal(body.userData.yorkerRefined, true);
});

test('original anatomical heads are finite, proportionate and provide a continuous nose and eye surface', () => {
  for (let profile = 0; profile < 6; profile++) {
    const geometry = createHeadGeometry(profile), box = geometry.boundingBox!, p = geometry.getAttribute('position');
    assert.ok(p.count < 3000, 'head topology is bounded for a full team');
    assert.ok(box.max.y <= 1.3 && box.min.y >= 0);
    assert.ok(box.max.x-box.min.x < 1 && box.max.z-box.min.z < 1.12);
    assert.ok(headSurface(0, .505, profile) > headSurface(.18, .505, profile), 'nose projects ahead of cheeks');
    for (const value of p.array) assert.ok(Number.isFinite(value));
    geometry.dispose();
  }
});

test('Blender bowler detail levels retarget onto the existing rig with valid normalized skin weights', async () => {
  const load = async (file: string) => {
    const bytes = fs.readFileSync(file);
    return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset+bytes.byteLength), '');
  };
  const original = await load('public/games/yorker/player.glb');
  const authored = await load('public/games/yorker/models/bowler-blender52.glb');
  let target!: T.SkinnedMesh;
  original.scene.traverse(node => {if (node instanceof T.SkinnedMesh) target = node;});
  const levels = bowlerBodyGeometry(authored, target);
  for (const [name, geometry] of Object.entries(levels)) {
    const p = geometry.getAttribute('position'), j = geometry.getAttribute('skinIndex'), w = geometry.getAttribute('skinWeight');
    const triangles = (geometry.index?.count ?? p.count)/3;
    assert.ok(triangles < (name === 'near' ? 40000 : 14000), `${name} geometry budget: ${triangles}`);
    assert.ok(geometry.boundingBox!.max.y > 1.95 && geometry.boundingBox!.max.y < 2.05);
    assert.ok(geometry.boundingBox!.min.y > -.02, 'feet stay in the expected bind frame');
    for (let i = 0; i < p.count; i++) {
      assert.ok([p.getX(i),p.getY(i),p.getZ(i)].every(Number.isFinite));
      let sum = 0;
      for (let c = 0; c < 4; c++) {
        const index = j.getComponent(i,c), weight = w.getComponent(i,c);
        assert.ok(Number.isInteger(index) && index >= 0 && index < target.skeleton.bones.length);
        assert.ok(weight >= 0 && weight <= 1); sum += weight;
      }
      assert.ok(Math.abs(sum-1) < .0001, `${name} skin weight ${i}: ${sum}`);
    }
  }
  assert.strictEqual(bowlerBodyGeometry(authored, target), levels, 'pace/spin share prepared geometry');
});

export type {Challenge};
