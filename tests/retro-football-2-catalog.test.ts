import {test} from 'node:test';import assert from 'node:assert/strict';
import {gameForHref,gameRegistry,playableGameHrefs} from '../src/mocks/games/game-registry';
import {deckFor,sportForGame} from '../src/mocks/games/sport-decks';
import {usesMobileLandscape} from '../src/features/games/shared/mobile-viewport/policy';
test('Retro Football 2 stays locally archived and is absent from release routes and decks',()=>{
 assert.equal(gameForHref('/play/retro-football-2'),null);assert.ok(!playableGameHrefs().includes('/play/retro-football-2'));
 assert.equal(gameRegistry['retro-football-2'].title,'RETRO FOOTBALL 2');assert.equal(gameRegistry['retro-football-2'].requiresDeck,undefined);
 assert.equal(sportForGame('pitch-rush'),'football');assert.ok(!deckFor('football').heroes.includes('retro-football-2'));
 assert.ok(!deckFor('football').heroes.includes('retro-football'));assert.equal(usesMobileLandscape('retro-football-2'),true);
});
