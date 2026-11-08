import { test } from "node:test";
import assert from "node:assert/strict";
import { FrameClock, createGameLoop, FixedStepper, ResourceScope, AssetCache, SaveStore, TaskQueue, GameSession } from "@statoz/game-engine";
import { ActionInput, deadzone } from "@statoz/game-engine/input";
import { ScreenStack, SeededRandom, TurnSession } from '@statoz/game-engine';

function driver() {
  let id = 0; const pending = new Map<number, (now: number) => void>();
  return { request(callback: (now: number) => void) { pending.set(++id, callback); return id; }, cancel(key: number) { pending.delete(key); }, advance(now: number) { for (const [key, callback] of [...pending]) { pending.delete(key); callback(now); } }, get size() { return pending.size; } };
}
test("sessions share a clock and resume without hidden-tab catch-up", () => {
  const backend = driver(), clock = new FrameClock(backend), seen: number[] = [];
  const first = createGameLoop({ id: "a", clock, frame: dt => seen.push(dt) });
  const second = createGameLoop({ id: "b", clock, frame: () => {} });
  assert.equal(backend.size, 1); backend.advance(0); backend.advance(16);
  first.pause("manual"); first.pause("visibility"); first.resume("visibility"); backend.advance(1000);
  assert.equal(seen.length, 2); first.resume("manual"); backend.advance(9000); assert.equal(seen.at(-1), 0);
  first.dispose(); second.dispose(); assert.equal(backend.size, 0); assert.equal(clock.size, 0);
});
test("an exception retires only the failing subscriber", () => {
  const backend = driver(), clock = new FrameClock(backend); let good = 0;
  const broken = createGameLoop({ id: "broken", clock, frame: () => { throw Error("broken"); } });
  const working = createGameLoop({ id: "working", clock, frame: () => good++ });
  backend.advance(0); backend.advance(10); assert.equal(good, 2); assert.equal(broken.diagnostics().status, "error");
  broken.dispose(); working.dispose();
});
test("fixed stepping preserves 120Hz and bounds catch-up", () => {
  const stepper = new FixedStepper(1 / 120, 48); let steps = 0;
  for (let frame = 0; frame < 60; frame++) stepper.advance(1 / 60, () => steps++);
  assert.equal(steps, 120); const result = stepper.advance(10, () => steps++);
  assert.equal(result.steps, 48); assert.equal(result.alpha, 0); assert.ok(stepper.droppedSeconds > 9);
});
test("resource cleanup is reverse ordered, idempotent and continues after errors", () => {
  const scope = new ResourceScope(), order: number[] = [];
  scope.defer(() => order.push(1)); scope.defer(() => { order.push(2); throw Error("bad resource"); }); scope.defer(() => order.push(3));
  assert.throws(() => scope.dispose(), AggregateError); assert.deepEqual(order, [3, 2, 1]); scope.dispose(); assert.equal(scope.abort.signal.aborted, true);
});
test("cancelled async asset leases dispose the eventual result exactly once", async () => {
  const cache = new AssetCache(), abort = new AbortController(); let releases = 0, finish!: (value: number) => void;
  const first = cache.acquire("asset", () => new Promise<number>(resolve => { finish = resolve; }), () => releases++, abort.signal);
  const second = cache.acquire("asset", async () => 999, () => releases++);
  await Promise.resolve(); abort.abort(); finish(7);
  await assert.rejects(first, { name: "AbortError" }); const lease = await second;
  assert.equal(lease.value, 7); assert.equal(releases, 0); lease.release(); lease.release(); await Promise.resolve(); assert.equal(releases, 1); assert.equal(cache.size, 0);
});
test("saves isolate accounts and preserve migration sources and incompatible data", () => {
  const values = new Map<string, string>([["old", '{"score":3}']]);
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  const validate = (value: unknown): value is { score: number } => !!value && typeof (value as { score: number }).score === "number";
  const a = new SaveStore(storage, "rally", "a", 1, validate), b = new SaveStore(storage, "rally", "b", 1, validate);
  a.migrate("old", value => value as { score: number }); assert.equal(a.read()?.score, 3); assert.equal(b.read(), null); assert.ok(values.has("old"));
  values.set(a.key, '{"schemaVersion":9,"value":{}}'); assert.throws(() => a.read()); assert.ok(values.get(a.key)?.includes('9'));
});
test("input ownership prevents releasing touch from cancelling a held key", () => {
  const input = new ActionInput({ gas: { keys: ["KeyW"] }, brake: { keys: ["KeyS"] } });
  input.set("gas", "key:KeyW", 1); input.set("gas", "touch:1", 1); input.set("gas", "touch:1", 0); assert.equal(input.value("gas"), 1);
  assert.deepEqual(input.rebind("gas", "KeyS"), { conflict: "brake" }); assert.equal(deadzone(.1), 0); input.clear(); assert.equal(input.value("gas"), 0);
});
test("turn-based delays pause without a frame loop", async () => {
  const tasks = new TaskQueue(); let ran = false; tasks.pause("visibility"); tasks.schedule(() => { ran = true; }, 5);
  await new Promise(resolve => setTimeout(resolve, 15)); assert.equal(ran, false); tasks.resume("visibility");
  await new Promise(resolve => setTimeout(resolve, 15)); assert.equal(ran, true); tasks.dispose();
});
test("a disposed session cannot reactivate after asynchronous load", async () => {
  let finish!: () => void, disposed = 0;
  const session = new GameSession({ id: "test", title: "Test", route: "/", engineApiVersion: 1, dimension: "2d", simulation: "turn-based", presentation: "react" }, { load: () => new Promise<void>(resolve => { finish = resolve; }), dispose: () => { disposed++; } });
  const loading = session.load(); session.dispose(); finish(); await loading; session.dispose(); assert.equal(disposed, 1);
});
test('turn sessions keep pure state and gate actions while paused', () => {
  const session = new TurnSession('board', { score: 0 }, (state, amount: number) => ({ score: state.score + amount }));
  session.dispatch(2); session.pause(); session.dispatch(8); assert.equal(session.snapshot().score, 2);
  session.resume(); session.dispatch(1); assert.equal(session.snapshot().score, 3); session.dispose();
});
test('a session can simulate headlessly at its declared rate', async () => {
  const backend = driver(), clock = new FrameClock(backend); let total = 0;
  const session = new GameSession({ id:'headless', title:'Headless', route:'/', engineApiVersion:1, dimension:'2d', presentation:'pixi', simulation:'realtime', fixedStep:1/120 }, { update: delta => { total += delta; } }, { clock });
  await session.load(); backend.advance(0); for (let i=1;i<=60;i++) backend.advance(i*1000/60);
  assert.ok(Math.abs(total-1)<1e-9); session.dispose(); assert.equal(clock.size,0);
});
test('screen transitions preserve history and RNG restores exact sequences', () => {
  const screens = new ScreenStack<'menu'|'play'|'pause'>('menu'); screens.push('play'); screens.push('pause'); assert.equal(screens.back(),true); assert.equal(screens.current,'play'); screens.reset('menu'); assert.equal(screens.back(),false);
  const random = new SeededRandom(13); random.next(); const state = random.snapshot(), expected = [random.next(), random.next()]; random.restore(state); assert.deepEqual([random.next(),random.next()],expected);
});

test('audio retains pre-unlock volume and pause settings across context adoption', async () => {
  const {adoptGameAudioContext, setGameVolume, pauseGameAudio, resumeGameAudio, audioDiagnostics} = await import('@statoz/game-engine/audio');
  let resumes = 0, contextState = 'suspended'; const gains: number[] = [];
  const context = { get state(){return contextState;}, currentTime:0, destination:{}, addEventListener(){},
    createGain:()=>({gain:{setTargetAtTime(value:number){gains.push(value);}},connect(){},disconnect(){}}),
    async resume(){resumes++;contextState='running';},async suspend(){contextState='suspended';},async close(){contextState='closed';}
  } as unknown as AudioContext;
  const oldSession = new TurnSession('audio-fixture',0,(state:number)=>state);
  const detach = oldSession.attach({hidden:false,addEventListener(){},removeEventListener(){}} as unknown as Document);
  oldSession.pause('studio'); detach();
  setGameVolume('audio-fixture',.5); pauseGameAudio('audio-fixture');
  const mixer = adoptGameAudioContext('audio-fixture',context); await mixer.unlock();
  assert.equal(resumes,0); assert.ok(gains.some(value=>Math.abs(value-.25)<1e-9));
  assert.equal(adoptGameAudioContext('audio-fixture',context),mixer);
  resumeGameAudio('audio-fixture'); await Promise.resolve(); assert.equal(resumes,1);
  await mixer.dispose(); assert.deepEqual(audioDiagnostics('audio-fixture'),[]);
});

test('studio candidate bytes are copied into the game iframe realm', async () => {
  const {runInNewContext} = await import('node:vm');
  const {loadRuntimeAsset} = await import('@statoz/game-engine');
  const foreign = runInNewContext('new Uint8Array([1,2,3]).buffer') as ArrayBuffer;
  assert.equal(foreign instanceof ArrayBuffer,false);
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256',foreign))].map(value=>value.toString(16).padStart(2,'0')).join('');
  const previous = Object.getOwnPropertyDescriptor(globalThis,'window');
  const root = {__STATOZ_STUDIO_ASSET__:{gameId:'realm-test',assetId:'model',bytes:foreign,hash}};
  Object.defineProperty(globalThis,'window',{configurable:true,value:{parent:root}});
  try {const bytes = await loadRuntimeAsset('realm-test','model','/games/realm-test/');assert.ok(bytes instanceof ArrayBuffer);assert.deepEqual([...new Uint8Array(bytes)],[1,2,3]);}
  finally {if(previous)Object.defineProperty(globalThis,'window',previous);else Reflect.deleteProperty(globalThis,'window');}
});
