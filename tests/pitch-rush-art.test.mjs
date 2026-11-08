import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
const art = JSON.parse(await fs.readFile(new URL('public/games/pitch-rush/sports-art.json', root), 'utf8'));
const atlas = await fs.readFile(new URL('public/games/pitch-rush/sports-atlas.png', root));
const hash = data => createHash('sha256').update(data).digest('hex');

test('selected Kenney sources and runtime atlas match recorded provenance', async () => {
  assert.equal(art.license, 'CC0-1.0');
  assert.equal(art.source, 'https://kenney.nl/assets/sports-pack');
  assert.equal(hash(atlas), art.atlas.sha256);
  for (const source of art.sources) assert.equal(hash(await fs.readFile(new URL('vendor/kenney-sports-pack/' + source.path, root))), source.sha256, source.path);
  assert.match(await fs.readFile(new URL('public/games/pitch-rush/KENNEY-LICENSE.txt', root), 'utf8'), /Creative Commons Zero/);
});

test('every required sprite decodes with valid alpha bounds and a stable centre pivot', async () => {
  const {data, info} = await sharp(atlas).ensureAlpha().raw().toBuffer({resolveWithObject: true});
  assert.deepEqual([info.width, info.height], art.atlas.size);
  const required = ['ball', 'grass', 'foot0', 'foot1', 'goal32', 'goal33', 'goal34', 'goal41', 'goal42', 'goal43', 'goal50', 'goal51', 'goal52'];
  for (const team of ['blue','red','keeperYellow','keeperDark']) required.push(...Array.from({length: 5}, (_, i) => team + i), team + 'Arm0', team + 'Arm1');
  for (const key of required) {
    const region = art.regions[key];assert.ok(region, key);
    const [x, y, w, h] = region.rect;
    assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= info.width && y + h <= info.height, key);
    assert.deepEqual(region.pivot, [.5,.5]);
    const bounds = [w,h,0,0];let transparent = 0, opaque = 0;
    for (let row = 0; row < h; row++) for (let col = 0; col < w; col++) {
      const alpha = data[((y + row) * info.width + x + col) * 4 + 3];
      if (!alpha) transparent++;else {opaque++;bounds[0] = Math.min(bounds[0], col);bounds[1] = Math.min(bounds[1], row);bounds[2] = Math.max(bounds[2], col + 1);bounds[3] = Math.max(bounds[3], row + 1);}
    }
    assert.ok(opaque > 0, key + ' is not empty');
    if (key !== 'grass') assert.ok(transparent > 0, key + ' has real transparency');
    assert.deepEqual(bounds, region.alphaBounds, key + ' alpha bounds');
  }
});

test('both cover variants share the Kenney composition', async () => {
  const game = await fs.readFile(new URL('public/games/pitch-rush/cover.webp', root));
  const discovery = await fs.readFile(new URL('public/assets/games/covers/pitch-rush.webp', root));
  const a = await sharp(game).metadata(), b = await sharp(discovery).metadata();
  assert.equal(a.width / a.height, b.width / b.height);
  const aPixels = await sharp(game).resize(32,20).removeAlpha().raw().toBuffer();
  const bPixels = await sharp(discovery).resize(32,20).removeAlpha().raw().toBuffer();
  const difference = aPixels.reduce((sum, n, i) => sum + Math.abs(n - bPixels[i]), 0) / aPixels.length;
  assert.ok(difference < 5, 'Covers depict the same scene');
});
