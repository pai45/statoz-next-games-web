import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import removedGames from '../src/domain/removed-games.json';
import {LEVELS, OPPONENTS, RANGES, TARGET_RADIUS, levelFor} from '../src/features/games/longbow/levels';
import {
  DRAW_TIME, STEP, IMPACT_TIME, TARGET_HEIGHT, checkpoint, newGame, perfectAim, release, restore, scoreFor, setAim, skipImpact,
  startDraw, step, swayOffset, targetCentre, type Config, type Game,
} from '../src/features/games/longbow/engine';
import {emptySave, levelUnlocked, rangeUnlocked, readSave, record, resumed, rivalUnlocked} from '../src/features/games/longbow/save';
import {gameRegistry} from '../src/mocks/games/game-registry';
import {sportGameDecks} from '../src/mocks/games/sport-decks';

const career = (id: string): Config => ({mode: 'career', level: levelFor(id)!});
const match = (i: number): Config => ({mode: 'match', opponent: OPPONENTS[i]});
const until = (g: Game, done: () => boolean, limit = 4000) => {for (let i = 0; i < limit && !done(); i++) step(g);};

type Style = 'perfect' | 'steady' | 'no-wind' | 'early';
/** Plays the player's current arrow. `steady` aims well but cannot cancel sway; `no-wind` ignores wind. */
function shoot(g: Game, style: Style = 'perfect') {
  until(g, () => g.phase === 'ready' && g.turn === 'player' || g.phase === 'finished');
  if (g.phase === 'finished') return;
  assert.equal(startDraw(g), true);
  const hold = style === 'early' ? DRAW_TIME * 0.5 : DRAW_TIME + 1.4;
  until(g, () => g.hold >= hold - 1e-9);
  const aim = style === 'no-wind' ? perfectAim(g, {x: 0, z: 0}) : perfectAim(g);
  const sway = style === 'perfect' ? swayOffset(g, g.hold) : {x: 0, y: 0};
  setAim(g, aim.x - sway.x, aim.y - sway.y);
  assert.equal(release(g), true);
  const before = g.checkpoint;
  until(g, () => g.checkpoint > before);
}
function play(g: Game, style: Style = 'perfect') {
  while (g.phase !== 'finished') {
    if (g.turn === 'player') shoot(g, style);
    else {const before = g.checkpoint; until(g, () => g.checkpoint > before || g.phase === 'finished');}
    until(g, () => g.phase !== 'impact');
  }
  return g;
}

test('Longbow is registered and the archery hub respects retired games', () => {
  assert.equal(gameRegistry.longbow.href, '/play/longbow');
  assert.ok(sportGameDecks.archery.includes('longbow'));
  assert.equal(sportGameDecks.archery.includes('archery-test'), !removedGames.includes('archery-test'));
  assert.equal(LEVELS.length, 30);
  assert.equal(RANGES.length, 3);
  assert.equal(OPPONENTS.length, 3);
  assert.equal(new Set(LEVELS.map(l => l.id)).size, 30);
});

test('ring scoring is exact at the ring boundaries', () => {
  const R = TARGET_RADIUS.standard, w = R / 10;
  assert.equal(scoreFor(R, 0), 10);
  assert.equal(scoreFor(R, w - 1e-9), 10);
  assert.equal(scoreFor(R, w), 9);
  assert.equal(scoreFor(R, 9 * w + 1e-9), 1);
  assert.equal(scoreFor(R, R), 1);
  assert.equal(scoreFor(R, R + 1e-6), 0);
});

test('a still, calm, full-draw shot lands on the sight point', () => {
  const g = newGame(career('level-01'), 7);
  startDraw(g); until(g, () => g.hold >= DRAW_TIME + 1);
  const sway = swayOffset(g, g.hold);
  setAim(g, 0.2 - sway.x, TARGET_HEIGHT + 0.1 - sway.y);
  release(g); until(g, () => g.phase === 'impact');
  assert.ok(Math.abs(g.last!.px - 0.2) < 0.005 && Math.abs(g.last!.py - 0.1) < 0.005, JSON.stringify(g.last));
});

test('wind pushes the arrow downwind by a plausible amount that grows with distance', () => {
  const drift = (distance: number) => {
    const g = newGame(career('level-01'), 3);
    g.distance = distance; g.wind = {x: 8, z: 0, speed: 8};
    const calm = perfectAim(g, {x: 0, z: 0}), windy = perfectAim(g);
    return calm.x - windy.x; // the aim moves upwind by the drift
  };
  const near = drift(20), far = drift(90);
  assert.ok(near > 0.01 && near < 0.15, `20 m drift ${near}`);
  assert.ok(far > 0.35 && far < 1.2, `90 m drift ${far}`);
  assert.ok(far > near * 8);
});

test('an underdrawn arrow drops low and a dry release fires nothing', () => {
  const g = newGame(career('level-04'), 9);
  startDraw(g); until(g, () => g.hold >= DRAW_TIME * 0.2);
  assert.equal(release(g), false);
  assert.equal(g.phase, 'ready');
  shoot(g, 'early');
  assert.ok(g.last!.py < -0.05 || g.last!.miss, JSON.stringify(g.last));
});

test('every career level is beatable with perfect aim and three stars need good shooting', () => {
  for (const level of LEVELS) {
    const perfect = play(newGame(career(level.id), level.index * 97 + 1), 'perfect');
    assert.equal(perfect.stars, 3, `${level.id} perfect ${perfect.score.player}`);
    const steady = play(newGame(career(level.id), level.index * 97 + 1), 'steady');
    assert.ok(steady.stars >= 1, `${level.id} steady ${steady.score.player} needs ${level.stars[0]}`);
  }
});

test('star thresholds rise and ignoring the wind costs points on windy levels', () => {
  for (const level of LEVELS) assert.ok(level.stars[0] < level.stars[1] && level.stars[1] < level.stars[2] && level.stars[2] <= level.arrows * 10, level.id);
  let lost = 0;
  for (const level of LEVELS.filter(l => l.wind[0] >= 4)) {
    const good = play(newGame(career(level.id), 11), 'perfect').score.player;
    const sloppy = play(newGame(career(level.id), 11), 'no-wind').score.player;
    lost += good - sloppy;
  }
  assert.ok(lost > 60, `wind should matter, lost ${lost}`);
});

test('moving targets follow their authored paths', () => {
  const slide = newGame(career('level-07'), 1), swing = newGame(career('level-13'), 1);
  const xs = Array.from({length: 50}, (_, i) => targetCentre(slide, i * 0.1).x);
  assert.ok(Math.max(...xs) > 0.7 && Math.min(...xs) < -0.7);
  const s = Array.from({length: 50}, (_, i) => targetCentre(swing, i * 0.1));
  assert.ok(s.every(p => p.y >= TARGET_HEIGHT - 1e-9));
  assert.ok(Math.max(...s.map(p => p.x)) > 0.6);
});

test('same inputs give identical results at 30, 60 and 120 fps', () => {
  const run = (fps: number) => {
    const g = newGame(career('level-25'), 4242);
    let acc = 0, hold = 0;
    while (g.phase !== 'finished') {
      acc += 1 / fps;
      while (acc + 1e-9 >= STEP) {
        if (g.phase === 'ready') {startDraw(g); hold = 0;}
        if (g.phase === 'drawing' && (hold += STEP) >= DRAW_TIME + 1) {const a = perfectAim(g); setAim(g, a.x, a.y); release(g);}
        step(g); acc -= STEP;
      }
    }
    return {score: g.score, results: g.results, seed: g.seed, time: g.time};
  };
  assert.deepEqual(run(30), run(60));
  assert.deepEqual(run(60), run(120));
});

test('rival skill orders the three opponents and a match alternates arrows', () => {
  const average = (i: number) => {
    let total = 0;
    for (let seed = 1; seed <= 12; seed++) total += play(newGame(match(i), seed * 131), 'steady').score.ai;
    return total / 12;
  };
  const [rookie, ranger, champion] = [0, 1, 2].map(average);
  assert.ok(rookie < ranger && ranger < champion, JSON.stringify({rookie, ranger, champion}));
  assert.ok(champion > 115 && champion < 145, `champion ${champion}`);
  const g = play(newGame(match(0), 5), 'perfect');
  assert.equal(g.results.length, 30);
  assert.deepEqual(g.results.slice(0, 4).map(r => r.shooter), ['player', 'ai', 'player', 'ai']);
  assert.equal(g.won, g.score.player > g.score.ai || (g.score.player === g.score.ai && g.score.playerX > g.score.aiX));
});

test('checkpoints restore completed arrows and replay the interrupted one', () => {
  const g = newGame(match(1), 77);
  shoot(g); until(g, () => g.phase !== 'impact'); until(g, () => g.turn === 'player' && g.phase === 'ready');
  shoot(g);
  const copy = restore(g.config, checkpoint(g));
  assert.deepEqual(copy.results, g.results);
  assert.deepEqual(copy.score, g.score);
  until(g, () => g.phase !== 'impact');
  assert.equal(copy.seed, g.seed);
  assert.deepEqual(copy.wind, g.wind);
  assert.deepEqual(copy.aim, g.aim);
});

test('impact skip never changes the earned result', () => {
  const g = newGame(career('level-02'), 2);
  shoot(g);
  const result = {...g.last!};
  assert.equal(skipImpact(g), true);
  step(g);
  assert.deepEqual(g.results[0], result);
  assert.ok(IMPACT_TIME > 1);
});

test('saves unlock levels, ranges and rivals, and reject tampered data', () => {
  let save = emptySave();
  assert.equal(levelUnlocked(save, 0), true);
  assert.equal(levelUnlocked(save, 1), false);
  const g = play(newGame(career('level-01'), 1));
  save = record(save, g);
  assert.equal(save.stars['level-01'], 3);
  assert.equal(save.checkpoint, null);
  assert.equal(levelUnlocked(save, 1), true);
  assert.equal(rangeUnlocked(save, 1), false);
  for (const level of LEVELS.slice(0, 7)) save = record(save, play(newGame(career(level.id), 3)));
  assert.equal(rangeUnlocked(save, 1), true);
  assert.equal(levelUnlocked(save, 10), true);
  assert.equal(rivalUnlocked(save, 1), false);
  assert.equal(readSave(JSON.stringify(save)).incompatible, false);
  assert.equal(readSave('{"schemaVersion":2}').incompatible, true);
  assert.equal(readSave('{broken').incompatible, true);
  const forged = {...save, best: {'level-01': 999}};
  assert.equal(readSave(JSON.stringify(forged)).incompatible, true);
  const live = newGame(career('level-03'), 5); shoot(live);
  const mid = record(save, live);
  assert.equal(readSave(JSON.stringify(mid)).incompatible, false);
  assert.equal(resumed(mid)!.results.length, 1);
  const cheat = structuredClone(mid); cheat.checkpoint!.results[0].score = 11;
  assert.equal(readSave(JSON.stringify(cheat)).incompatible, true);
  const order = structuredClone(mid); order.checkpoint!.results[0].shooter = 'ai';
  assert.equal(readSave(JSON.stringify(order)).incompatible, true);
});

test('every runtime asset matches its provenance record', () => {
  const root = path.resolve('public/games/longbow');
  const provenance = JSON.parse(fs.readFileSync(path.join(root, 'PROVENANCE.json'), 'utf8'));
  const entries = [...provenance.models, ...provenance.textures, ...provenance.audio];
  for (const entry of entries) {
    const bytes = fs.readFileSync(path.join(root, entry.file));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, entry.file);
    assert.equal(bytes.length, entry.bytes, entry.file);
    assert.equal(entry.license, 'CC0-1.0', entry.file);
    assert.match(entry.source, /^https:\/\/(polyhaven\.com|ambientcg\.com|freesound\.org)\//, entry.file);
  }
  const listed = new Set(entries.map(e => e.file));
  const runtime = ['models', 'textures', 'audio'].flatMap(dir => fs.readdirSync(path.join(root, dir)).map(f => `${dir}/${f}`));
  assert.deepEqual(runtime.filter(f => !listed.has(f)), []);
});
