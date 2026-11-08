import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gameRegistry, gameForHref, sportGameDecks, playableGameHrefs} from '../src/mocks/games';
import {allGamesInFeedOrder, gameCoverPath} from '../src/features/games/home-catalog';
import {isBundledGame} from '../src/features/games/shared/bundled-game-config';
import {guideFor} from '../src/features/how-to-play/data/guides';

test('Hoop Legacy launches as a distinct basketball game in the hub, home and static routes', () => {
  assert.equal(gameForHref('/play/hoop-legacy')?.game, 'hoop-legacy');
  assert.ok(playableGameHrefs().includes('/play/hoop-legacy'));
  assert.ok(sportGameDecks.basketball.includes('hoop-legacy'));
  assert.ok(sportGameDecks.basketball.includes('vibe-basketball'));
  assert.ok(allGamesInFeedOrder().includes('hoop-legacy'));
  assert.equal(gameRegistry['hoop-legacy'].requiresDeck, undefined);
  assert.ok(isBundledGame('hoop-legacy'));
  assert.equal(gameCoverPath('hoop-legacy'), '/assets/games/covers/launch-2026-11-06/hoop-legacy.webp');
  assert.equal(guideFor('hoop-legacy')?.playHref, '/play/hoop-legacy');
});

test('the supplied source and declared local UI overrides stay pinned', async () => {
  const source = JSON.parse(await fs.readFile('src/features/games/hoop-legacy/source/SOURCE.json', 'utf8'));
  for (const [file, expected] of Object.entries(source.files)) {
    const bytes = await fs.readFile('src/features/games/hoop-legacy/source/' + file);
    const allowed = source.localOverrides?.[file]?.sha256 ?? expected;
    assert.equal(createHash('sha256').update(bytes).digest('hex'), allowed, file);
  }
});

test('the built game uses local fonts, preserved notices and the host account storage bridge', async () => {
  const html = await fs.readFile('public/embedded-games/hoop-legacy/index.html', 'utf8');
  assert.ok(html.includes('data-game="hoop-legacy"'));
  assert.ok(html.includes('parent.__STATOZ_BUNDLE_BOOT__'));
  assert.ok(html.includes("Object.defineProperty(window,'localStorage'"));
  assert.ok(html.includes('data:font/woff2;base64,') || html.includes('data:application/font-woff2;base64,'));
  assert.ok(!/<(?:script|link)\b[^>]*(?:src|href)=["']https?:/.test(html));
  const notices = await fs.readFile('public/embedded-games/hoop-legacy/LICENSES.txt', 'utf8');
  assert.ok(notices.includes('SIL OPEN FONT LICENSE'));
  assert.ok(notices.includes('MakeHuman'));
  assert.ok((await fs.stat(gameCoverPath('hoop-legacy').replace(/^\//, 'public/'))).size > 1000);
});
