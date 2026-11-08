import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {COURTS, CUPS, HOOP_X, MAX_SPEED, MIN_SPEED, RIM_Y, RIVALS, TARGET_SCORE, courtFor, rivalFor} from '../src/features/games/rim-rush/levels';
import {
  STEP, assistShot, drain, newGame, queueJump, queueShot, releasePoint, speedOf, step, type Config, type Game, type GameEvent,
} from '../src/features/games/rim-rush/engine';
import {hoopX, speedFor} from '../src/features/games/rim-rush/physics';
import {buy, emptySave, equip, readSave, record, rivalUnlocked, cupUnlocked, type Save} from '../src/features/games/rim-rush/save';
import {gameRegistry} from '../src/mocks/games/game-registry';
import {sportGameDecks} from '../src/mocks/games/sport-decks';
import {bundledGameIds} from '../src/features/games/shared/bundled-game-config';

const DEG = Math.PI / 180;
const quick = (rival = 'milo', extra: Partial<Config> = {}): Config => ({mode: 'quick', rival: rivalFor(rival)!, court: COURTS[0], ...extra});
/** A match where only the left side acts: the rival never thinks. */
function solo(seed = 1) {
  const g = newGame(quick(), seed);
  g.players[1].ai = null;
  until(g, () => g.phase === 'play');
  drain(g);
  return g;
}
function until(g: Game, done: () => boolean, limit = 120 * 120) {for (let i = 0; i < limit && !done(); i++) step(g);}
/** Steps until the left ball settles and returns everything that happened. */
function resolve(g: Game) {
  const seen: GameEvent[] = [];
  until(g, () => {seen.push(...drain(g)); return g.balls[0].state === 'held' && seen.some(e => e.type === 'shot');}, 120 * 8);
  return seen;
}
const powerFor = (speed: number) => (speed - MIN_SPEED) / (MAX_SPEED - MIN_SPEED);
function idealShot(g: Game, angleDeg: number) {
  const v = speedFor(releasePoint(g, 0), {x: hoopX(1), y: RIM_Y}, angleDeg * DEG)!;
  return {angle: angleDeg * DEG, power: powerFor(v)};
}

test('Rim Rush is registered as its own bundled basketball game', () => {
  assert.equal(gameRegistry['rim-rush'].href, '/play/rim-rush');
  assert.ok(sportGameDecks.basketball.includes('rim-rush'));
  assert.ok(sportGameDecks.basketball.includes('vibe-basketball'));
  assert.ok(bundledGameIds.includes('rim-rush'));
  assert.equal(RIVALS.length, 9);
  assert.equal(CUPS.length, 3);
  for (const cup of CUPS) for (const r of cup.rounds) {assert.ok(rivalFor(r.rival), r.rival); assert.ok(courtFor(r.court), r.court);}
  assert.equal(new Set(CUPS.flatMap(c => c.rounds.map(r => r.rival))).size, 9);
});

test('the simulation is identical at 30, 60 and 120 fps', () => {
  const run = (fps: number) => {
    const g = newGame(quick('kai', {autopilot: rivalFor('zara')!}), 4242);
    let acc = 0;
    for (let frame = 0; frame < fps * 75 && g.phase !== 'finished'; frame++) {
      acc += 1 / fps;
      while (acc >= STEP - 1e-12) {acc -= STEP; step(g);}
    }
    return JSON.stringify({score: g.score, stats: g.stats, rng: g.rng, winner: g.winner, phase: g.phase});
  };
  const a = run(30), b = run(60), c = run(120);
  assert.equal(a, b); assert.equal(b, c);
  assert.match(a, /"phase":"finished"/);
});

test('an ideal arc drops through the rim for a swish worth 3', () => {
  // Flatter arcs (about 50°) enter too shallow and clip the rim, like the real thing.
  for (const angle of [55, 60, 64]) {
    const g = solo(angle);
    const shot = idealShot(g, angle);
    assert.equal(queueShot(g, 0, shot.angle, shot.power), true);
    const seen = resolve(g);
    const score = seen.find(e => e.type === 'score');
    assert.ok(score && score.type === 'score', `angle ${angle} scores`);
    assert.equal(score.score.swish, true);
    assert.equal(score.score.points, 3);
    assert.equal(g.score[0], 3);
  }
});

test('a slightly short shot clangs off the front rim and misses', () => {
  let clanged = false;
  for (let k = 0.995; k > 0.9 && !clanged; k -= 0.0025) {
    const g = solo(7), shot = idealShot(g, 55);
    queueShot(g, 0, shot.angle, powerFor(speedOf(shot.power) * k));
    const seen = resolve(g);
    if (!seen.some(e => e.type === 'contact' && e.kind === 'rim')) continue;
    if (g.score[0] === 0) {clanged = true; assert.ok(seen.some(e => e.type === 'miss'));}
  }
  assert.ok(clanged, 'some short shot hits the rim and stays out');
});

test('a bank shot off the backboard scores 3 and is flagged', () => {
  let found: GameEvent | undefined;
  for (let p = 0.4; p <= 1 && !found; p += 0.0025) for (const angle of [38, 42, 46]) {
    const g = solo(3);
    queueShot(g, 0, angle * DEG, p);
    const seen = resolve(g), s = seen.find(e => e.type === 'score');
    if (s && s.type === 'score' && s.score.bank && seen.some(e => e.type === 'contact' && e.kind === 'board')) {found = s; break;}
  }
  assert.ok(found && found.type === 'score', 'some shot banks in');
  assert.equal(found.score.points, 3);
  assert.equal(found.score.swish, false);
});

test('a well-timed jump swats a flat shot passing overhead', () => {
  const g = newGame(quick(), 9);
  g.players[1].ai = null;
  until(g, () => g.phase === 'play'); drain(g);
  // The rival throws a flat shot that passes about 3.2 m up over the player; jumping as it is released swats it.
  assert.equal(queueShot(g, 1, 32 * DEG, 0.5), true);
  assert.equal(queueJump(g, 0), true);
  step(g);
  let blocked = false;
  until(g, () => {blocked ||= drain(g).some(e => e.type === 'block' && e.side === 0); return blocked || g.balls[1].state !== 'flight';}, 600);
  assert.equal(blocked, true);
  assert.equal(g.stats[0].blocks, 1);
  assert.ok(g.balls[1].vx > 0, 'the swat sends it back toward the shooter');
  // Without the jump, the same shot sails over.
  const h = newGame(quick(), 9);
  h.players[1].ai = null;
  until(h, () => h.phase === 'play'); drain(h);
  queueShot(h, 1, 32 * DEG, 0.5);
  step(h);
  let swatted = false;
  until(h, () => {swatted ||= drain(h).some(e => e.type === 'block'); return h.balls[1].state !== 'flight';}, 600);
  assert.equal(swatted, false);
});

test('aim assist pulls near misses toward the rim and leaves wild shots alone', () => {
  const g = solo(5), shot = idealShot(g, 55), ideal = speedOf(shot.power);
  const near = assistShot(g, 0, shot.angle, powerFor(ideal * 1.08));
  assert.ok(Math.abs(speedOf(near) - ideal) < ideal * 0.08 * 0.6);
  const wild = powerFor(ideal * 1.3);
  assert.equal(assistShot(g, 0, shot.angle, wild), wild);
});

test('buzzer, overtime and the first-to-21 rule', () => {
  const g = solo(11);
  g.clock = 0.05;
  until(g, () => g.phase !== 'play');
  assert.equal(g.phase, 'overtime');
  const shot = idealShot(g, 55);
  queueShot(g, 0, shot.angle, shot.power);
  until(g, () => g.phase === 'finished', 120 * 6);
  assert.equal(g.winner, 0);

  const h = solo(12);
  h.score[0] = TARGET_SCORE - 2;
  const s2 = idealShot(h, 55);
  queueShot(h, 0, s2.angle, s2.power);
  until(h, () => h.phase === 'finished', 120 * 6);
  assert.equal(h.winner, 0);
  assert.ok(h.clock > 50, 'ends before the clock runs out');
});

test('stronger rivals beat weaker ones over a seeded series', () => {
  let strong = 0;
  for (let seed = 1; seed <= 24; seed++) {
    const g = newGame(quick('milo', {autopilot: rivalFor('nova')!}), seed * 977);
    until(g, () => g.phase === 'finished', 120 * 120);
    if (g.winner === 0) strong++;
  }
  assert.ok(strong >= 18, `Nova won ${strong} of 24 against Milo`);
});

test('the save rejects tampering and records cup progress and coins', () => {
  assert.deepEqual(readSave(null), {save: emptySave(), incompatible: false});
  const ok = emptySave();
  assert.equal(readSave(JSON.stringify(ok)).incompatible, false);
  const bad: unknown[] = [
    {...ok, coins: -5}, {...ok, coins: 1.5}, {...ok, outfit: 'midnight'}, {...ok, owned: {...ok.owned, outfits: ['sunset', 'nope']}},
    {...ok, cups: {city: {round: 0, titles: 0}}}, {...ok, cups: {street: {round: 3, titles: 0}}},
    {...ok, rivals: {milo: {played: 1, won: 2}}}, {...ok, totals: {...ok.totals, swishes: 3}}, {...ok, schemaVersion: 2},
  ];
  for (const b of bad) assert.equal(readSave(JSON.stringify(b)).incompatible, true, JSON.stringify(b));
  assert.equal(readSave('{not json').incompatible, true);

  // Win the Street Cup quarter-final.
  const g = newGame({mode: 'cup', rival: rivalFor('milo')!, court: courtFor('rooftop')!, cup: 'street', round: 0}, 1);
  g.phase = 'finished'; g.winner = 0; g.score = [12, 6]; g.stats[0] = {shots: 8, makes: 5, swishes: 2, banks: 1, blocks: 1};
  const r = record(ok, g);
  assert.equal(r.save.cups.street.round, 1);
  assert.equal(r.reward.coins, 30 + 4 + 2 + 3);
  assert.equal(r.save.coins, r.reward.coins);
  assert.equal(readSave(JSON.stringify(r.save)).incompatible, false);
  // Winning the final gives the title, the reward and opens the next cup.
  const final = newGame({mode: 'cup', rival: rivalFor('rafa')!, court: courtFor('gym')!, cup: 'street', round: 2}, 2);
  final.phase = 'finished'; final.winner = 0;
  const after = record(r.save, final);
  assert.equal(after.reward.cupWon, true);
  assert.deepEqual(after.save.cups.street, {round: 0, titles: 1});
  assert.equal(cupUnlocked(after.save, 1), true);
  assert.equal(rivalUnlocked(after.save, 'june'), true);
  assert.equal(rivalUnlocked(r.save, 'june'), false);
  // Shop.
  const rich: Save = {...after.save, coins: 500};
  assert.equal(buy({...rich, coins: 10}, 'outfit', 'chalk'), null);
  const bought = buy(rich, 'outfit', 'chalk')!;
  assert.equal(bought.coins, 380); assert.equal(bought.outfit, 'chalk');
  assert.equal(buy(bought, 'outfit', 'chalk'), null);
  assert.equal(equip(bought, 'outfit', 'sunset')!.outfit, 'sunset');
  assert.equal(equip(bought, 'ball', 'gold'), null);
  assert.equal(readSave(JSON.stringify(bought)).incompatible, false);
});

test('every runtime asset matches its provenance record', () => {
  const root = path.resolve('public/games/rim-rush');
  const provenance = JSON.parse(fs.readFileSync(path.join(root, 'PROVENANCE.json'), 'utf8'));
  const entries = [...provenance.models, ...provenance.textures, ...provenance.audio];
  for (const entry of entries) {
    const bytes = fs.readFileSync(path.join(root, entry.file));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, entry.file);
    assert.equal(bytes.length, entry.bytes, entry.file);
    assert.equal(entry.license, 'CC0-1.0', entry.file);
    assert.match(entry.source, /^https:\/\/(ambientcg\.com|freesound\.org|polyhaven\.com)\//, entry.file);
  }
  const listed = new Set(entries.map(e => e.file));
  const runtime = ['textures', 'audio'].flatMap(dir => fs.readdirSync(path.join(root, dir)).map(f => `${dir}/${f}`));
  assert.deepEqual(runtime.filter(f => !listed.has(f)), []);
  for (const font of provenance.fonts) assert.ok(fs.existsSync(font.file) && fs.existsSync(font.licenseFile), font.file);
  assert.equal(HOOP_X > 0, true);
});
