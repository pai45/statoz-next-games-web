import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DEFAULT_SETUP, STEP, SURFACES, medalFor, neutralInput, recordKey, type Setup } from '../src/features/games/rally-dash/contracts';
import { forwardDistance, nearest, pointAt } from '../src/features/games/rally-dash/geometry';
import { GRIP, stages } from '../src/features/games/rally-dash/stages';
import { aiInput, createSession, finishSession, pauseSession, recover, resumeSession, startSession, step, updateProgress } from '../src/features/games/rally-dash/simulation';
import { RallyStore, SAVE_KEY, cleanSetup, validGhost } from '../src/features/games/rally-dash/persistence';
import { RaceInput } from '../src/features/games/rally-dash/input';
import { upcomingNotes } from '../src/features/games/rally-dash/pace-notes';
import { crews } from '../src/features/games/rally-dash/crews';
import { gameForHref, gameRegistry, playableGameHrefs } from '../src/mocks/games/game-registry';

const setup = (patch: Partial<Setup> = {}): Setup => ({ ...DEFAULT_SETUP, ...patch });
const run = (s: ReturnType<typeof createSession>, limit = 60 * 600) => { startSession(s); for (let i = 0; i < limit && s.phase !== 'finished'; i++) step(s, aiInput(s, s.cars[0])); };

test('five closed stages sample consistently and never overlap themselves', () => {
    assert.equal(stages.length, 5);
    for (const st of stages) {
        assert.ok(st.length > 1700 && st.length < 2400, `${st.id} length ${st.length}`);
        assert.equal(st.surfaceAt.length, st.points.length);
        assert.ok([...st.surfaceAt].every(i => i < SURFACES.length));
        assert.ok(st.features.every(f => f.s >= 0 && f.s < st.length));
        for (let s = 0; s < st.length; s += 13) assert.ok(Math.abs(nearest(st, pointAt(st, s)).s - s) < 3 || Math.abs(nearest(st, pointAt(st, s)).s - s) > st.length - 3);
        assert.ok(Math.hypot(pointAt(st, 0).x - pointAt(st, st.length).x, pointAt(st, 0).y - pointAt(st, st.length).y) < .01);
        // Separate stretches of road stay further apart than both edges, so no car can cross between them.
        const need = 2 * (st.width / 2 + st.barrier.distance) + 2;
        for (let i = 0; i < st.points.length; i += 3)
            for (let j = i + 1; j < st.points.length; j += 3) {
                const a = st.points[i], b = st.points[j], along = Math.min(forwardDistance(a.s, b.s, st.length), forwardDistance(b.s, a.s, st.length));
                if (along > 3 * need) assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > need, `${st.id} overlaps at ${a.s.toFixed(0)}/${b.s.toFixed(0)}`);
            }
    }
});

test('pace notes are ordered, graded 1-6 and call both directions', () => {
    for (const st of stages) {
        assert.ok(st.notes.length >= 6, st.id);
        st.notes.forEach((n, i) => { if (i) assert.ok(n.s >= st.notes[i - 1].s); });
        for (const n of st.notes) {
            if (n.kind === 'left' || n.kind === 'right') assert.ok(n.severity >= 1 && n.severity <= 6);
            else assert.equal(n.severity, 0);
        }
        assert.ok(st.notes.some(n => n.kind === 'left') && st.notes.some(n => n.kind === 'right'), st.id);
        assert.ok(st.features.every(f => st.notes.some(n => n.kind === f.kind && n.s === f.s)));
        assert.ok(upcomingNotes(st, st.notes[1].s - 10, 30).includes(st.notes[1]), st.id);
    }
});

test('same seed and inputs give the same race; six cars, five distinct rivals', () => {
    const a = createSession(setup({ mode: 'rallycross' }), 42, 'a'), b = createSession(setup({ mode: 'rallycross' }), 42, 'b');
    assert.equal(a.cars.length, 6);
    assert.equal(new Set(a.cars.map(c => c.crew)).size, 6);
    assert.equal(a.cars[0].crew, DEFAULT_SETUP.crew);
    startSession(a);
    startSession(b);
    for (let i = 0; i < 900; i++) { const input = aiInput(a, a.cars[0]); step(a, input); step(b, input); }
    assert.deepEqual(a.cars, b.cars);
    assert.ok(a.cars[0].speed > 5);
});

test('pause freezes the stage and separate input owners release independently', () => {
    const s = createSession(setup(), 1, 'pause');
    startSession(s);
    for (let i = 0; i < 200; i++) step(s, { ...neutralInput(), throttle: true });
    pauseSession(s);
    const before = JSON.stringify(s);
    for (let i = 0; i < 100; i++) step(s, { ...neutralInput(), throttle: true });
    assert.equal(JSON.stringify(s), before);
    resumeSession(s);
    step(s);
    assert.ok(s.raceClock > 0);
    const input = new RaceInput();
    input.hold('key:Space', 'handbrake', true);
    input.hold('pointer:1', 'handbrake', true);
    input.hold('pointer:2', 'throttle', true);
    input.hold('key:Space', 'handbrake', false);
    assert.equal(input.read().handbrake, true);
    assert.equal(input.read().throttle, true);
    input.hold('key:ArrowLeft', 'left', true);
    input.steer('pad:3', .4);
    assert.ok(Math.abs(input.read().steer - -.6) < 1e-9, 'held left key plus slide pad');
    input.hold('key:ArrowLeft', 'left', false);
    assert.equal(input.read().steer, .4);
    input.steer('pad:3', 2);
    assert.equal(input.read().steer, 1);
    input.steer('pad:3', null);
    assert.equal(input.read().steer, 0);
    input.clear();
    assert.deepEqual(input.read(), neutralInput());
});

/** Rolls a car along the start straight at 26 m/s, then holds full right for half a second. */
function corner(handbrake: boolean, stageId: Setup['stage'] = 'pine-ridge') {
    const s = createSession(setup({ stage: stageId }), 3, 'h');
    s.phase = 'running';
    const c = s.cars[0], h0 = c.heading;
    Object.assign(c, { vx: Math.cos(h0) * 26, vy: Math.sin(h0) * 26, speed: 26 });
    let slip = 0;
    for (let i = 0; i < 30; i++) { step(s, { steer: 1, throttle: !handbrake, brake: false, handbrake }); slip = Math.max(slip, c.slip); }
    return { slip, turned: Math.abs(c.heading - h0) };
}

test('loose surfaces slide more than tarmac, and the handbrake swings the car round', () => {
    assert.ok(GRIP.tarmac.lateral > GRIP.gravel.lateral && GRIP.gravel.lateral > GRIP.snow.lateral && GRIP.snow.lateral > GRIP.ice.lateral);
    const plain = corner(false), pulled = corner(true);
    assert.ok(pulled.slip > plain.slip * 1.5, `slip ${plain.slip} vs ${pulled.slip}`);
    assert.ok(pulled.turned > plain.turned, `yaw ${plain.turned} vs ${pulled.turned}`);
    const tarmac = corner(false, 'harbour-hill');
    assert.ok(plain.slip > tarmac.slip, `gravel ${plain.slip} vs tarmac ${tarmac.slip}`);
});

test('jumps launch and land the car, and steering does nothing in the air', () => {
    const s = createSession(setup({ stage: 'red-mesa' }), 4, 'jump'), c = s.cars[0], jump = s.stage.features.find(f => f.kind === 'jump')!;
    s.phase = 'running';
    const p = pointAt(s.stage, jump.s + jump.length - 2);
    Object.assign(c, { x: p.x, y: p.y, px: p.x, py: p.y, heading: p.heading, s: p.s, vx: Math.cos(p.heading) * 32, vy: Math.sin(p.heading) * 32, speed: 32, yawRate: 0 });
    let launched = false, landed = false, heading = 0;
    for (let i = 0; i < 80; i++) {
        step(s, { steer: launched ? 1 : 0, throttle: true, brake: false, handbrake: false });
        if (s.events.some(e => e.type === 'launch')) { launched = true; heading = c.heading; }
        if (launched && !landed && c.air > 0) assert.ok(Math.abs(c.heading - heading) < .05, 'no steering while airborne');
        if (s.events.some(e => e.type === 'land')) landed = true;
    }
    assert.ok(launched && landed);
});

test('teleports and shortcuts cannot finish a stage; recovery returns to the road', () => {
    const s = createSession(setup(), 2, 'tt'), c = s.cars[0], L = s.stage.length;
    s.phase = 'running';
    const before = pointAt(s.stage, L - 20), after = pointAt(s.stage, 2);
    Object.assign(c, { nextGate: 0, started: true, x: after.x, y: after.y, px: before.x, py: before.y, speed: 0 });
    updateProgress(s, c, L - 20);
    assert.equal(c.laps, 0);
    assert.equal(c.finish, null);
    const off = pointAt(s.stage, 300, 30);
    Object.assign(c, { x: off.x, y: off.y, safeS: 290, recoverCooldown: 0 });
    recover(s);
    assert.ok(nearest(s.stage, c).distance < 1);
    assert.equal(c.speed, 0);
});

test('rallycross finishes on every stage with the whole field racing', { timeout: 240000 }, () => {
    for (const st of stages) {
        const s = createSession(setup({ mode: 'rallycross', stage: st.id, rivals: 'legend' }), 51, 'rx-' + st.id);
        run(s);
        assert.equal(s.phase, 'finished', st.id);
        assert.equal(s.result?.laps, 3);
        assert.ok(s.cars.every(c => c.laps >= 2), `${st.id}: ${s.cars.map(c => c.laps)}`);
        assert.equal(s.result?.classification.length, 6);
    }
});

test('a clean autopilot stage run lands between gold and bronze on every stage', { timeout: 240000 }, () => {
    for (const st of stages) {
        const s = createSession(setup({ stage: st.id }), 9, 'st-' + st.id);
        run(s);
        assert.equal(s.phase, 'finished');
        const time = s.cars[0].finish!;
        assert.ok(time > st.targets.gold && time < st.targets.bronze, `${st.id}: ${time.toFixed(2)} vs ${JSON.stringify(st.targets)}`);
        assert.equal(s.result?.medal, medalFor(time, st.targets));
    }
    const t = stages[0].targets;
    assert.equal(medalFor(t.gold - .1, t), 'gold');
    assert.equal(medalFor(t.silver, t), 'silver');
    assert.equal(medalFor(t.bronze + .01, t), null);
});

test('a stage run leaves a valid ghost that saves and reloads', { timeout: 60000 }, () => {
    const s = createSession(setup(), 9, 'ghost');
    run(s);
    assert.ok(s.newGhost);
    assert.equal(s.newGhost.splits.length, 4);
    assert.ok(validGhost(s.newGhost, recordKey(s.setup)));
    const memory = new Map<string, string>();
    const store = new RallyStore({ getItem: k => memory.get(k) ?? null, setItem: (k, v) => { memory.set(k, v); } });
    store.collect(s);
    store.collect(s);
    assert.equal(store.data.recent.length, 1);
    assert.equal(store.best(s.setup)?.best, s.newGhost.time);
    assert.equal(store.best(s.setup)?.medal, s.result?.medal);
    assert.deepEqual([...memory.keys()], [SAVE_KEY]);
    const reloaded = new RallyStore({ getItem: k => memory.get(k) ?? null, setItem: () => { } });
    assert.equal(reloaded.best(s.setup)?.ghost?.samples.length, s.newGhost.samples.length);
    const next = createSession(setup(), 10, 'chase', reloaded.best(s.setup)?.ghost ?? null);
    assert.deepEqual(next.bestSplits, s.newGhost.splits);
});

test('saves survive blocked storage, keep unknown versions and never touch Grand Prix Dash data', () => {
    assert.equal(SAVE_KEY, 'statoz.games.web.rally-dash.v1');
    let writes = 0;
    const newer = new RallyStore({ getItem: () => JSON.stringify({ version: 9 }), setItem: () => writes++ });
    newer.settings(setup({ crew: 3 }));
    assert.equal(writes, 0);
    assert.match(newer.status, /kept safe/);
    const blocked = new RallyStore({ getItem: () => { throw Error('denied'); }, setItem: () => { throw Error('denied'); } });
    blocked.settings(setup({ crew: 4 }));
    assert.equal(blocked.data.setup.crew, 4);
    assert.match(blocked.status, /Storage unavailable/);
    assert.equal(validGhost({ samples: [{ x: NaN }] }, 'x'), false);
    const clean = cleanSetup({ crew: 999, engineVolume: -2, stage: 'monaco', laps: 10, camera: 'drone' });
    assert.equal(clean.crew, crews.length - 1);
    assert.equal(clean.engineVolume, 0);
    assert.equal(clean.stage, DEFAULT_SETUP.stage);
    assert.equal(clean.laps, DEFAULT_SETUP.laps);
    assert.equal(clean.camera, 'chase');
    assert.notEqual(recordKey(setup()), recordKey(setup({ brakeAssist: true })));
    const reads: string[] = [];
    new RallyStore({ getItem: k => { reads.push(k); return null; }, setItem: () => { } });
    assert.deepEqual(reads, [SAVE_KEY]);
    const retired = createSession(setup({ mode: 'rallycross' }), 4, 'retire');
    startSession(retired);
    for (let i = 0; i < 400; i++) step(retired, neutralInput());
    assert.equal(finishSession(retired, true).status, 'retired');
    assert.equal(retired.result?.medal, null);
});

test('the game stays independent of the StatOz economy and design system', () => {
    const dir = 'src/features/games/rally-dash';
    for (const file of readdirSync(dir).filter(f => /\.(ts|tsx|css)$/.test(f))) {
        const source = readFileSync(`${dir}/${file}`, 'utf8');
        assert.doesNotMatch(source, /settleCoinReward|activeLoadout|useEconomy|@\/design-system|cyber-ui|Orbitron|Space Grotesk/, file);
    }
    assert.equal(STEP, 1 / 60);
});

test('the host lists Rally Dash under its old id, at /play/rally, and the old address still opens it', () => {
    assert.equal(gameRegistry['grand-prix-dash'].title, 'RALLY DASH');
    assert.equal(gameRegistry['grand-prix-dash'].href, '/play/rally');
    assert.equal(gameForHref('/play/rally')?.game, 'grand-prix-dash');
    assert.equal(gameForHref('/play/grand-prix')?.game, 'grand-prix-dash');
    assert.ok(playableGameHrefs().includes('/play/rally') && playableGameHrefs().includes('/play/grand-prix'));
    const auth = readFileSync('src/features/auth/state/auth-session.ts', 'utf8');
    assert.match(auth, /"statoz\.games\.web\.rally-dash\.v1"/);
    assert.match(auth, /"statoz\.games\.web\.grandprix\.v2"/);
});

test('fonts and original art are recorded with matching hashes', async () => {
    const { createHash } = await import('node:crypto');
    const provenance = JSON.parse(readFileSync('public/assets/games/rally-dash/PROVENANCE.json', 'utf8'));
    for (const entry of [...provenance.fonts, ...provenance.original]) {
        const bytes = readFileSync(entry.file);
        assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, entry.file);
        assert.equal(bytes.length, entry.bytes, entry.file);
    }
    for (const font of provenance.fonts) {
        assert.equal(font.license, 'OFL-1.1');
        assert.ok(readFileSync(font.licenseFile, 'utf8').includes('SIL Open Font License'), font.licenseFile);
    }
    const shipped = readdirSync('src/features/games/rally-dash/fonts').filter(f => f.endsWith('.woff2'));
    assert.deepEqual(shipped.sort(), provenance.fonts.map((f: { file: string }) => f.file.split('/').at(-1)).sort());
});
