import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gameForHref, gameRegistry, sportGameDecks} from '../src/mocks/games';
import {gameSportFor} from '../src/mocks/games/sport-decks';
import {gameCoverPath, allGamesInFeedOrder} from '../src/features/games/home-catalog';
import {isBundledGame} from '../src/features/games/shared/bundled-game-config';

test('Holdover is a playable isolated Archery game alongside Longbow', () => {
  assert.deepEqual(sportGameDecks.archery, ['longbow', 'holdover']);
  assert.equal(gameSportFor('holdover'), 'archery');
  assert.equal(gameForHref('/play/holdover')?.game, 'holdover');
  assert.ok(isBundledGame('holdover'));
  assert.ok(allGamesInFeedOrder().includes('holdover'));
  assert.equal(gameRegistry.holdover.requiresDeck, undefined);
  assert.equal(gameCoverPath('holdover'), '/assets/games/covers/launch-2026-11-06/holdover.webp');
});

test('supplied gameplay modules match source or documented engine overrides', () => {
  const source = JSON.parse(fs.readFileSync('src/features/games/holdover/source/SOURCE.json', 'utf8'));
  const modules = source.files.filter((file: {path: string}) => file.path.startsWith('src/game/'));
  assert.equal(modules.length, 24);
  for (const file of modules) {
    const bytes = fs.readFileSync(path.join('src/features/games/holdover/source', file.path));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), source.localOverrides?.[file.path]?.sha256 ?? file.sha256, file.path);
  }
});

test('the full runtime and fonts are embedded without remote runtime dependencies', () => {
  const html = fs.readFileSync('public/embedded-games/holdover/index.html', 'utf8');
  assert.ok(html.length > 1_000_000, 'full bundled React and Three.js runtime');
  assert.ok(html.includes('data-game="holdover"'));
  assert.ok(html.includes('Back to Archery'));
  assert.ok(html.includes('parent.__STATOZ_BUNDLE_BOOT__'));
  assert.ok(html.includes('data:font/ttf;base64,'));
  assert.ok(!html.includes('fonts.googleapis.com'));
  assert.ok(!/<script[^>]+src=/.test(html));
  assert.ok(!/@import\s/.test(html));
  const manifest = JSON.parse(fs.readFileSync('public/embedded-games/manifest.json', 'utf8'));
  assert.equal(manifest.games.find((game: {id: string}) => game.id === 'holdover').sport, 'archery');
});

