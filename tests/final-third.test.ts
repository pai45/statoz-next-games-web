import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gameRegistry, sportForGame, sportGameDecks, gameForHref} from '../src/mocks/games';
import {verifyFinalThirdSource} from '../scripts/build-final-third.mjs';

test('Final Third is a football game in the deck with no deck gate', () => {
  assert.equal(sportForGame('final-third'), 'football');
  assert.ok(sportGameDecks.football.includes('final-third'));
  assert.equal(gameForHref('/play/final-third')?.game, 'final-third');
  assert.equal(gameRegistry['final-third'].requiresDeck, undefined);
  assert.equal(gameRegistry['final-third'].kind, 'hero');
});

test('vendored Final Third build matches its recorded hashes and keeps its credits', async () => {
  const source = await verifyFinalThirdSource();
  assert.equal(source.project, 'final-third');
  assert.ok(source.files['dist/assets/athlete.glb']);
  const credits = await fs.readFile('vendor/final-third/ASSETS.md', 'utf8');
  assert.match(credits, /mocap\.cs\.cmu\.edu/);
  assert.match(credits, /CC0/);
  assert.match(await fs.readFile('vendor/final-third/OFL-barlow-condensed.txt', 'utf8'), /SIL Open Font License/);
});

test('manifest pins a self-contained offline Final Third bundle', async () => {
  const manifest = JSON.parse(await fs.readFile('public/embedded-games/manifest.json', 'utf8'));
  const entry = manifest.games.find((game: {id: string}) => game.id === 'final-third');
  assert.ok(entry);
  assert.equal(entry.sport, 'football');
  const bytes = await fs.readFile('public/embedded-games/' + entry.path);
  assert.equal(entry.sha256, createHash('sha256').update(bytes).digest('hex'));
  assert.equal(entry.bytes, bytes.length);
  const html = bytes.toString();
  assert.match(html, /<title>Final Third<\/title>/);
  assert.match(html, /data-game="final-third"/);
  assert.match(html, /data:model\/gltf-binary;base64,/);
  assert.match(html, /data:font\/woff2;base64,/);
  assert.match(html, /\/\*__STATOZ_BOOT__\*\//);
  // Everything is inline: no external scripts, stylesheets or web fonts.
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:|\.\/assets\/)/);
  assert.doesNotMatch(html, /fonts\.googleapis|fonts\.gstatic/);
});
