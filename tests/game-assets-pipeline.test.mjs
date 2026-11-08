import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { ownedPath, validateProvenance, atomicJson, activateAsset, rollbackAsset, hashBytes } from '../tools/game-assets/pipeline.mjs';
import { changeRuntimeAsset } from '../tools/game-assets/runtime-build.mjs';
import { createStudioServer } from '../tools/game-studio/server.mjs';

test('asset paths reject escaping owners and unverified provenance', () => {
  assert.throws(() => ownedPath(os.tmpdir(), '../outside'), /escapes/);
  assert.throws(() => validateProvenance({ gameId: 'longbow', provenance: { verified: false } }), /Verified/);
  assert.throws(() => validateProvenance({ gameId: 'longbow', provenance: { verified: true, license: 'CC-BY-4.0', author: 'A', sourceUrl: 'source', evidence: 'evidence' } }), /Verified/);
  assert.doesNotThrow(() => validateProvenance({ gameId: 'yorker', provenance: { verified: true, license: 'CC-BY-4.0', author: 'A', sourceUrl: 'source', evidence: 'evidence' } }));
});
test('candidate activation is explicit, hash checked and reversible', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'statoz-engine-assets-'));
  try {
    const project = path.join(root, 'src/features/games/yorker/art/test');
    const publicRoot = path.join(root, 'public/games/yorker');
    await fs.mkdir(project, { recursive: true });
    const recipe = { schemaVersion: 1, gameId: 'yorker', assetId: 'test', kind: 'atlas', sourceBlend: 'source.blend', provenance: { verified: true, license: 'ORIGINAL', author: 'Test', sourceUrl: 'original:test', evidence: 'Test-owned fixture' } };
    await atomicJson(path.join(project, 'recipe.json'), recipe);
    const oldBytes = Buffer.from('old'), oldHash = hashBytes(oldBytes), oldUrl = '/games/yorker/engine-assets/test/old/atlas.png';
    await fs.mkdir(path.dirname(path.join(root, 'public' + oldUrl)), { recursive: true }); await fs.writeFile(path.join(root, 'public' + oldUrl), oldBytes);
    const old = { id: 'test', revision: oldHash, url: oldUrl, hash: oldHash, bytes: 3, kind: 'atlas' };
    await atomicJson(path.join(publicRoot, 'engine-assets/catalog.json'), { schemaVersion: 1, gameId: 'yorker', assets: [old] });
    const buildId = 'a'.repeat(8) + '-1111-1111-1111-' + 'a'.repeat(12), candidateRoot = path.join(root, `.cache/game-assets/yorker/test/${buildId}`), bytes = Buffer.from('candidate');
    await fs.mkdir(candidateRoot, { recursive: true }); await fs.writeFile(path.join(candidateRoot, 'atlas.png'), bytes); await atomicJson(path.join(candidateRoot, 'atlas.json'), { frames: {} });
    const candidate = { buildId, revision: hashBytes(bytes), report: { hash: hashBytes(bytes), atlasHash: hashBytes(await fs.readFile(path.join(candidateRoot, 'atlas.json'))) }, kind: 'atlas' };
    await atomicJson(path.join(project, 'state.json'), { candidate });
    await assert.rejects(activateAsset('yorker', 'test', {}, root), /Inspect/);
    let rebuilds = 0;
    await assert.rejects(changeRuntimeAsset('activate', 'yorker', 'test', { reviewed: true }, root, async () => { if (++rebuilds === 1) throw Error('Packaging fixture failure'); }), /Packaging fixture failure/);
    assert.equal(JSON.parse(await fs.readFile(path.join(publicRoot, 'engine-assets/catalog.json'), 'utf8')).assets[0].revision, oldHash);
    assert.equal(rebuilds, 2);
    const asset = await activateAsset('yorker', 'test', { reviewed: true }, root); assert.equal(asset.hash, hashBytes(bytes));
    assert.equal((await rollbackAsset('yorker', 'test', root)).revision, oldHash);
    await fs.writeFile(path.join(candidateRoot, 'atlas.png'), 'tampered');
    await assert.rejects(activateAsset('yorker', 'test', { reviewed: true }, root), /changed/);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
test('local bridge rejects missing tokens and cross-origin mutations', async () => {
  const { server, token } = createStudioServer({ origin: 'http://localhost:3000' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}`;
    assert.equal((await fetch(url + '/catalog')).status, 401);
    assert.equal((await fetch(url + '/build?game=yorker&asset=bowler', { method: 'POST', headers: { origin: 'https://example.com', 'x-statoz-studio-token': token }, body: '{}' })).status, 403);
    assert.equal((await fetch(url + '/jobs', { headers: { 'x-statoz-studio-token': token } })).status, 200);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
