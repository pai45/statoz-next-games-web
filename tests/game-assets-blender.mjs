import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { findBlender, importAsset, buildAsset, hashBytes } from '../tools/game-assets/pipeline.mjs';
const execute = promisify(execFile), root = await fs.mkdtemp(path.join(os.tmpdir(), 'statoz-blender-roundtrip-'));
try {
  await fs.mkdir(path.join(root, 'src/features/games/yorker'), { recursive: true });
  const source = path.join(root, 'fixture.blend'), script = path.join(root, 'fixture.py');
  await fs.writeFile(script, `import bpy\nbpy.ops.wm.read_factory_settings(use_empty=True)\nbpy.ops.mesh.primitive_cube_add(size=1)\nbpy.context.object.name='FixtureCube'\nbpy.ops.wm.save_as_mainfile(filepath=${JSON.stringify(source)})\n`);
  const blender = await findBlender();
  await execute(blender.executable, ['--background', '--threads', '2', '--python-exit-code', '1', '--python', script], { timeout: 120000, windowsHide: true });
  const original = hashBytes(await fs.readFile(source));
  for (const kind of ['model', 'atlas']) {
    const assetId = `fixture-${kind}`;
    const recipe = await importAsset({ gameId: 'yorker', assetId, file: source, kind, provenance: { verified: true, license: 'ORIGINAL', author: 'Engine test fixture', sourceUrl: 'original:test', evidence: 'Generated cube fixture in this test' } }, root);
    assert.equal(recipe.original.hash, original);
    const candidate = await buildAsset('yorker', assetId, root);
    assert.ok(candidate.report.bytes > 0);
    if (kind === 'model') assert.equal(candidate.report.triangles, 12);
    else {
      const sharp = (await import('sharp')).default;
      const metadata = await sharp(path.join(root, `.cache/game-assets/yorker/${assetId}/${candidate.buildId}/atlas.png`)).metadata();
      assert.equal(metadata.hasAlpha, true); assert.equal(metadata.width, 256);
    }
    console.log(`PASS Blender ${blender.version}: original preserved, editable ${kind}, export and validation`);
  }
  assert.equal(hashBytes(await fs.readFile(source)), original);
} finally { await fs.rm(root, { recursive: true, force: true }); }
