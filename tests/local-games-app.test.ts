import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gameRegistry} from '../src/mocks/games/game-registry';
import {sportGameDecks} from '../src/mocks/games/sport-decks';
import {gameHubHref,isBundledGame} from '../src/features/games/shared/bundled-game-config';
import {allGamesInFeedOrder,gameCoverPath} from '../src/features/games/home-catalog';
import {guideFor} from '../src/features/how-to-play/data/guides';
import type {GameId} from '../src/features/games/types';

test('all local games connect discovery, launcher, sport exit, installed artwork and a playable guide',()=>{
 const expected:Partial<Record<GameId,string>>={'stick-cricket':'cricket','archery-test':'archery','tennis-bits':'tennis','soccer-real':'football','f1-racing':'motorsport'};
 for(const [id,sport]of Object.entries(expected)){
  const game=id as GameId,entry=gameRegistry[game],guide=guideFor(game);
  assert.ok(allGamesInFeedOrder().includes(game));
  assert.ok(sportGameDecks[sport as keyof typeof sportGameDecks].includes(game));
  assert.equal(isBundledGame(game),true);
  assert.equal(gameHubHref(game),'/games/'+sport);
  assert.ok(fs.existsSync('public'+gameCoverPath(game)),game);
  assert.equal(guide?.title,entry.title);
  assert.equal(guide?.playHref,entry.href);
 }
});
