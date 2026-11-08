import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { createHash, webcrypto } from 'node:crypto';
import { generateAssetManifest, referencedShopFiles } from '../scripts/game-asset-manifest.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');
const worker = await fs.readFile(new URL('../public/game-assets-sw.js', import.meta.url), 'utf8');

function harness({ base = '/games-demo/', quota = 1e9 } = {}) {
  const origin = 'https://games.example', handlers = {}, stores = new Map(), bodies = new Map(), requested = [];
  const clients = new Map();
  let failure, corrupt, active = 0, maximum = 0;
  const key = request => typeof request === 'string' ? request : request.url;
  const caches = { async open(name) {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name);
    return {
      async match(request) { return store.get(key(request))?.clone(); },
      async put(request, response) { store.set(key(request), response.clone()); },
      async delete(request) { return store.delete(key(request)); },
      async keys() { return [...store.keys()].map(url => new Request(url)); },
    };
  } };
  const self = {
    registration: { scope: origin + base },
    navigator: { storage: { estimate: async () => ({ quota, usage: 0 }) } },
    clients: { matchAll: async () => [...clients.values()], claim: async () => {} },
    addEventListener: (type, handler) => { handlers[type] = handler; },
  };
  vm.runInNewContext(worker, {
    self, caches, URL, Response, Request, Headers, AbortSignal, AbortController, DOMException,
    setTimeout, clearTimeout, crypto: webcrypto, console: { warn() {} },
    fetch: async (request, options) => {
      const url = key(request);
      requested.push(url);
      if (url === failure || !bodies.has(url)) throw Error('Offline: ' + url);
      active++; maximum = Math.max(maximum, active);
      try {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(resolve, 3);
          options?.signal?.addEventListener('abort', () => { clearTimeout(timeout); reject(new DOMException('Cancelled', 'AbortError')); }, { once: true });
        });
        return new Response(url === corrupt ? 'corrupt' : bodies.get(url), { headers: {
          'content-type': /\.html$|\/play\/|\/$/.test(url) ? 'text/html' : 'application/octet-stream',
          'content-encoding': 'gzip', vary: 'Accept-Language',
        } });
      } finally { active--; }
    },
  });
  const file = (relative, body = relative) => {
    const url = base + relative;
    bodies.set(url, body);
    return { url, hash: digest(body), bytes: Buffer.byteLength(body) };
  };
  const manifest = (id, files, buildId = 'build-one', extra = {}) => ({
    schemaVersion: 2, packId: id === 'core' ? 'core' : 'game:' + id,
    basePath: base.slice(0, -1), buildId,
    revision: digest(JSON.stringify(files)), totalBytes: files.reduce((sum, item) => sum + item.bytes, 0),
    entryUrl: files[0].url, files, ...extra,
  });
  const start = (type, data = {}, id = 'tab', onMessage = () => {}) => {
    clients.set(id, { id });
    const messages = []; let pending;
    handlers.message({
      source: { id }, data: { type, ...data },
      ports: [{ postMessage(value) { messages.push(value); onMessage(value); } }],
      waitUntil: promise => { pending = promise; },
    });
    return { messages, done: Promise.resolve(pending).then(() => messages) };
  };
  const send = (type, data, id, onMessage) => start(type, data, id, onMessage).done;
  const install = (value, id, onMessage) => send(value.schemaVersion === 1 ? 'PREPARE' : 'INSTALL_PACK', { manifest: value }, id, onMessage);
  const status = async (value, id = 'tab', type = 'GET_PACK_STATUS') => (await send(type, { packId: value.packId, revision: value.revision, ...(type === 'VERIFY_PACK' ? { manifest: value } : {}) }, id)).at(-1);
  const fetchAsset = (url, { clientId = 'tab', mode = 'cors', resultingClientId = '', referrer = '', range } = {}) => {
    let promise;
    handlers.fetch({ request: { url: origin + url, method: 'GET', mode, referrer, headers: new Headers(range ? { range } : {}) }, clientId, resultingClientId, respondWith: value => { promise = value; } });
    return promise;
  };
  const filesStore = () => [...stores.entries()].find(([name]) => name.endsWith('files-v1'))?.[1];
  return { base, origin, file, manifest, start, send, install, status, fetchAsset, filesStore, requested, stores, bodies, clients,
    setFail: value => { failure = value; }, setCorrupt: value => { corrupt = value; }, get maximum() { return maximum; } };
}

test('game packs install independently, share completed files, and use four concurrent transfers globally', async () => {
  const h = harness();
  const shared = h.file('_next/static/shared.js');
  const first = h.manifest('first', [h.file('play/first'), shared, ...Array.from({ length: 7 }, (_, i) => h.file('games/first/' + i + '.bin'))]);
  const second = h.manifest('second', [h.file('play/second'), shared, h.file('games/second/model.glb')]);
  await h.install(first);
  assert.equal((await h.status(first)).current, true);
  assert.equal((await h.status(second)).installed, false);
  assert.ok(!h.requested.some(url => url.includes('/second')));
  await h.install(second);
  assert.equal(h.requested.filter(url => url === shared.url).length, 1);
  assert.equal(h.maximum, 4);
  const before = h.requested.length;
  await h.install(first);
  assert.equal(h.requested.length, before);
});

test('failed and cancelled packs keep completed files across another pack installation and resume', async () => {
  const h = harness();
  const first = h.manifest('first', Array.from({ length: 10 }, (_, i) => h.file(i ? `games/first/${i}.bin` : 'play/first')));
  let cancelled = false;
  const result = await h.install(first, 'tab', progress => {
    if (!cancelled && progress.completedBytes > 0) { cancelled = true; h.start('CANCEL_PACK', { packId: first.packId }); }
  });
  assert.equal(result.at(-1).state, 'cancelled');
  const retained = [...h.filesStore().keys()];
  assert.ok(retained.length > 0 && retained.length < first.files.length);
  const other = h.manifest('other', [h.file('play/other')]);
  await h.install(other);
  assert.ok(retained.every(key => h.filesStore().has(key)));
  const count = h.requested.filter(url => url === first.files[0].url).length;
  h.setFail(first.files[8].url);
  assert.equal((await h.install(first)).at(-1).state, 'error');
  h.setFail(undefined);
  assert.equal((await h.install(first)).at(-1).state, 'ready');
  assert.equal(h.requested.filter(url => url === first.files[0].url).length, count);
});

test('bad downloads, corrupt cached content and browser eviction are repaired before installed status', async () => {
  const h = harness();
  const pack = h.manifest('first', [h.file('play/first'), h.file('games/first/audio.ogg')]);
  h.setCorrupt(pack.files[0].url);
  assert.equal((await h.install(pack)).at(-1).state, 'error');
  assert.equal((await h.status(pack)).installed, false);
  h.setCorrupt(undefined);
  await h.install(pack);
  const entryKey = [...h.filesStore().keys()].find(key => key.includes(pack.files[0].hash));
  h.filesStore().set(entryKey, new Response('broken bytes'));
  assert.equal((await h.status(pack)).installed, false);
  assert.equal(h.filesStore().has(entryKey), false);
  const before = h.requested.length;
  await h.install(pack);
  assert.equal(h.requested.length, before + 1);
  h.filesStore().delete(entryKey);
  assert.equal((await h.status(pack)).installed, false);
});

test('storage failure never downloads or marks a pack installed', async () => {
  const h = harness({ quota: 1 });
  const pack = h.manifest('first', [h.file('play/first')]);
  assert.match((await h.install(pack)).at(-1).error, /storage/);
  assert.equal(h.requested.length, 0);
  assert.equal((await h.status(pack)).installed, false);
});

test('an absent zero-byte dependency cannot be mistaken for a complete pack', async () => {
  const h = harness();
  const pack = h.manifest('empty', [h.file('play/empty', '')]);
  assert.equal((await h.status(pack, 'tab', 'VERIFY_PACK')).installed, false);
  await h.install(pack);
  assert.equal(h.requested.length, 1);
  assert.equal((await h.status(pack)).installed, true);
});

test('v1 bytes are lazily adopted without transfers and unrelated legacy games remain available', async () => {
  const h = harness();
  const files = [h.file('embedded-games/first/index.html'), h.file('embedded-games/second/index.html')];
  const legacy = h.manifest('legacy', files, 'legacy', { schemaVersion: 1 });
  await h.install(legacy);
  const pack = h.manifest('first', [files[0]]);
  const before = h.requested.length;
  assert.equal((await h.status(pack, 'tab', 'VERIFY_PACK')).installed, true);
  await h.install(pack);
  assert.equal(h.requested.length, before);
  assert.ok([...h.filesStore().keys()].some(key => key.includes(files[1].hash)));
});

test('updates are atomic, fetch changed hashes only, and preserve running tabs until they close', async () => {
  const h = harness();
  const first = h.manifest('first', [h.file('play/first', 'old lobby'), h.file('games/first/model.glb', 'same model')]);
  await h.install(first, 'old-tab');
  const updated = h.manifest('first', [h.file('play/first', 'new lobby'), first.files[1]], 'build-two');
  h.setFail(updated.files[0].url);
  assert.equal((await h.install(updated, 'new-tab')).at(-1).state, 'error');
  const oldStatus = await h.status(updated, 'new-tab');
  assert.equal(oldStatus.installed, true);
  assert.equal(oldStatus.current, false);
  h.setFail(undefined);
  const before = h.requested.length;
  await h.install(updated, 'new-tab');
  assert.equal(h.requested.length, before + 1);
  assert.equal(await (await h.fetchAsset(first.files[0].url, { clientId: 'old-tab' })).text(), 'old lobby');
  assert.equal(await (await h.fetchAsset(first.files[0].url, { clientId: 'new-tab' })).text(), 'new lobby');
  h.clients.delete('old-tab');
  // The failed update check pinned the old version in new-tab too. Close it to
  // model leaving that document, then cleanup may retire the unused revision.
  h.clients.delete('new-tab');
  await h.install(updated, 'next-tab');
  assert.ok(![...h.filesStore().keys()].some(key => key.includes(first.files[0].hash)));
});

test('cold offline navigation and verified PLAY documents pin the correct script and iframe build', async () => {
  const h = harness();
  const core = h.manifest('core', [h.file('', '<meta name="statoz-assets-build" content="build-one">home'), h.file('_next/static/core.js', 'core')]);
  const pack = h.manifest('first', [h.file('play/first', '<meta name="statoz-assets-build" content="build-one">lobby'), h.file('embedded-games/first/index.html', 'engine'), h.file('games/first/audio.ogg', '0123456789')]);
  await h.install(core); await h.install(pack);
  h.setFail(h.origin + h.base);
  assert.match(await (await h.fetchAsset(h.base, { clientId: '', mode: 'navigate', resultingClientId: 'cold-home' })).text(), /home/);
  assert.equal(await (await h.fetchAsset(core.files[1].url, { clientId: 'cold-home' })).text(), 'core');
  assert.match(await (await h.fetchAsset(pack.entryUrl + '?assetPack=' + pack.revision + '&returnTo=%2F', { clientId: 'cold-home', mode: 'navigate', resultingClientId: 'game-page' })).text(), /lobby/);
  const frame = await h.fetchAsset(pack.files[1].url + '?session=x&assetBuild=build-one', { clientId: '', mode: 'navigate', resultingClientId: 'engine' });
  assert.equal(await frame.text(), 'engine');
  const range = await h.fetchAsset(pack.files[2].url, { clientId: 'engine', range: 'bytes=2-5' });
  assert.equal(range.status, 206); assert.equal(await range.text(), '2345');
  assert.equal(range.headers.get('content-encoding'), null);
  assert.equal(range.headers.get('vary'), null);
  assert.equal((await h.fetchAsset(pack.files[2].url, { clientId: 'engine', range: 'bytes=99-' })).status, 416);
  await assert.rejects(h.fetchAsset(h.base + 'play/not-installed', { mode: 'navigate' }), /Offline/);
});

test('concurrent packs share assets once and do not prune each other', async () => {
  const h = harness(), shared = h.file('_next/static/shared.js');
  const one = h.manifest('one', [h.file('play/one'), shared]);
  const two = h.manifest('two', [h.file('play/two'), shared]);
  assert.ok((await Promise.all([h.install(one, 'one'), h.install(two, 'two')])).every(messages => messages.at(-1).state === 'ready'));
  assert.equal(h.requested.filter(url => url === shared.url).length, 1);
  assert.equal((await h.status(one)).installed, true);
  assert.equal((await h.status(two)).installed, true);
});

test('cancelling one tab leaves another subscriber to the same game downloading', async () => {
  const h = harness();
  const pack = h.manifest('one', [h.file('play/one'), ...Array.from({ length: 10 }, (_, i) => h.file(`games/one/${i}.bin`))]);
  let cancelled = false;
  const first = h.start('INSTALL_PACK', { manifest: pack }, 'first', progress => {
    if (!cancelled && progress.completedBytes > 0) { cancelled = true; h.start('CANCEL_PACK', { packId: pack.packId }, 'first'); }
  });
  const second = h.start('INSTALL_PACK', { manifest: pack }, 'second');
  await Promise.all([first.done, second.done]);
  assert.equal(first.messages.at(-1).state, 'cancelled');
  assert.equal(second.messages.at(-1).state, 'ready');
  assert.equal(h.requested.length, pack.files.length);
});

test('index metadata survives offline startup and ordinary account/API requests are never cached', async () => {
  const h = harness();
  const core = h.manifest('core', [h.file('', 'home')]);
  const index = { schemaVersion: 2, buildId: 'build-one', basePath: h.base.slice(0, -1), core: { packId: 'core' }, games: {} };
  await h.send('INSTALL_PACK', { manifest: core, index });
  const response = await h.fetchAsset(h.base + '_game-assets/build-one/index.json');
  assert.deepEqual(await response.json(), index);
  await assert.rejects(h.fetchAsset(h.base + 'api/account'), /Offline/);
  assert.ok(![...h.filesStore().keys()].some(key => key.includes('account')));
});

test('shop selection excludes portraits from the old helper', () => {
  assert.deepEqual([...referencedShopFiles('"/assets/shop/portraits/LEO.webp" `/assets/shop/coins/${id}.png`', ['assets/shop/portraits/LEO.webp', 'assets/shop/coins/rookie.png'])], ['assets/shop/coins/rookie.png']);
});

async function buildFixture(t, exported = false) {
  const fixtureRoot = path.join(process.cwd(), '.cache/device-assets-unit');
  await fs.mkdir(fixtureRoot, { recursive: true });
  const root = await fs.mkdtemp(path.join(fixtureRoot, 'game-pack-test-'));
  t.after(async () => { await fs.rm(root, { recursive: true, force: true }); });
  const put = async (file, body = file) => { await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true }); await fs.writeFile(path.join(root, file), body); };
  await put('tsconfig.json', '{}');
  await put('src/domain/removed-games.json', '["retired"]');
  await put('src/mocks/games/game-registry.ts', `export const gameRegistry = {"pitch-rush":{href:"/play/pitch-rush"},"football-chess":{href:"/play/football-chess"}};
    export const playableGameHrefs = () => Object.values(gameRegistry).map(g=>g.href);
    export const gameForHref = href => { const match=Object.entries(gameRegistry).find(([,g])=>g.href===href); return match ? {game:match[0]} : null; };`);
  for (const file of ['portrait-assets.generated.ts', 'portrait-assets.card-game.generated.ts']) await put('src/features/packs/data/' + file, 'export const portraits = {};');
  const document = '<script src="/demo/_next/static/chunks/launcher.js"></script><link href="/demo/_next/static/chunks/shared.css" rel="stylesheet">';
  for (const route of ['', 'play/pitch-rush', 'play/football-chess']) {
    await put(exported ? `out/${route ? route + '/' : ''}index.html` : `.next/server/app/${route || 'index'}.html`, document);
  }
  await put('.next/static/chunks/launcher.js', 'const Chess=dynamic(()=>e.A(2).then(m=>m.FootballChess),{loadableGenerated:{modules:[123]},ssr:false});');
  await put('.next/static/chunks/shared.css', '@font-face{src:url(../media/shared.woff2)}');
  await put('.next/static/chunks/chess.js', 'chess');
  await put('.next/static/media/shared.woff2');
  await put('.next/server/app/(fullscreen)/play/[...slug]/page_client-reference-manifest.js', 'globalThis.__RSC_MANIFEST = {};globalThis.__RSC_MANIFEST["/play"] = ' + JSON.stringify({ clientModules: { '[project]/src/features/games/components/game-launcher.tsx': { chunks: ['/demo/_next/static/chunks/launcher.js'] } } }) + ';');
  await put('.next/server/app/(fullscreen)/play/[...slug]/page/react-loadable-manifest.json', JSON.stringify({ 123: { files: ['static/chunks/chess.js'] } }));
  await put('public/embedded-games/pitch-rush/index.html');
  await put('public/games/pitch-rush/reference/unused.glb');
  await put('public/embedded-games/retired/index.html');
  await put('public/assets/games/covers/pitch-rush.webp');
  await put('public/assets/shop/portraits/football/PLAYER.webp');
  await put('public/assets/games/penalty-shootout/model.glb');
  return { root, put, generate: () => generateAssetManifest({ root, buildId: 'fixture', basePath: '/demo', exportDir: exported ? path.join(root, 'out') : undefined }) };
}

for (const exported of [false, true]) test(`build splits core, routes, lazy chunks and CSS dependencies (${exported ? 'Pages' : 'Next'})`, async t => {
  const fixture = await buildFixture(t, exported);
  await fixture.put('public/game-runtime/core-ABC.js', 'export const version=1;');
  await fixture.put('public/game-runtime/chunks/shared-XYZ.js', 'export const shared=true;');
  await fixture.put('public/embedded-games/pitch-rush/index.html', '<script type="application/json" id="statoz-engine-dependencies">'+JSON.stringify({files:[{url:'/game-runtime/core-ABC.js'},{url:'/game-runtime/chunks/shared-XYZ.js'}]})+'</script>');
  const result = await fixture.generate();
  assert.equal(result.index.schemaVersion, 2);
  assert.ok(!result.core.files.some(file => /\/(?:games|embedded-games)\//.test(file.url) && !file.url.includes('/assets/games/')));
  assert.ok(!result.core.files.some(file => file.url.endsWith('/chess.js') || file.url.includes('/shop/')));
  const rush = result.games.get('pitch-rush'), chess = result.games.get('football-chess');
  assert.ok(rush.files.some(file => file.url === '/demo/embedded-games/pitch-rush/index.html'));
  assert.ok(!rush.files.some(file => file.url.endsWith('/chess.js')));
  assert.ok(rush.files.some(file => file.url === '/demo/game-runtime/core-ABC.js'));
  assert.ok(rush.files.some(file => file.url === '/demo/game-runtime/chunks/shared-XYZ.js'));
  assert.ok(!chess.files.some(file => file.url.includes('/game-runtime/')));
  assert.ok(chess.files.some(file => file.url.endsWith('/chess.js')));
  assert.ok(chess.files.some(file => file.url.endsWith('/shared.woff2')));
  assert.ok(!chess.files.some(file => file.url.includes('/embedded-games/')));
  assert.equal(JSON.parse(await fs.readFile(path.join(fixture.root, 'public/_game-assets/fixture/index.json'))).games['football-chess'].revision, chess.revision);
  await fixture.put('public/embedded-games/pitch-rush/index.html', 'updated game');
  const updated = await fixture.generate();
  assert.notEqual(updated.games.get('pitch-rush').revision, rush.revision);
  assert.equal(updated.games.get('football-chess').revision, chess.revision);
});

test('build fails for missing game runtime, route or dynamic closure', async t => {
  const fixture = await buildFixture(t);
  await fs.unlink(path.join(fixture.root, 'public/embedded-games/pitch-rush/index.html'));
  await assert.rejects(fixture.generate(), /Missing built game/);
  await fixture.put('public/embedded-games/pitch-rush/index.html');
  await fs.unlink(path.join(fixture.root, '.next/server/app/play/pitch-rush.html'));
  await assert.rejects(fixture.generate(), /Missing prerendered route/);
  await fixture.put('.next/server/app/play/pitch-rush.html', 'route');
  await fixture.put('.next/static/chunks/launcher.js', 'no lazy game');
  await assert.rejects(fixture.generate(), /Missing dynamic game chunk/);
});
