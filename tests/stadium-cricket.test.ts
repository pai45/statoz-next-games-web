import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gameForHref,gameRegistry,playableGameHrefs} from '../src/mocks/games/game-registry';
import {deckFor,sportForGame} from '../src/mocks/games/sport-decks';
import {gamesTrendingCatalog} from '../src/mocks/games/trending-catalog';
import {isGameEnabled} from '../src/domain/demo-product';
import {cricketSaveKey,isCricketSave,emptyCricketSave,cricketMessage} from '../src/features/games/stadium-cricket/save';

test('Stadium Cricket replaces Final Over without a deck or rewards requirement',()=>{
 assert.equal(gameForHref('/play/stadium-cricket')?.game,'stadium-cricket');
 assert.equal(gameRegistry['stadium-cricket'].requiresDeck,undefined);
 assert.equal(isGameEnabled('final-over'),false);
 assert.equal(gameForHref('/play/final-over'),null);
 assert.ok(playableGameHrefs().includes('/play/stadium-cricket'));
 assert.ok(!playableGameHrefs().includes('/play/final-over'));
 assert.ok(deckFor('cricket').heroes.includes('stadium-cricket'));
 assert.ok(!deckFor('cricket').heroes.includes('final-over'));
 assert.equal(sportForGame('stadium-cricket'),'cricket');
 assert.equal(sportForGame('final-over'),'cricket');
 assert.ok(gamesTrendingCatalog.some(item=>item.sourceId==='stadium-cricket'));
 assert.ok(!gamesTrendingCatalog.some(item=>item.sourceId==='final-over'));
});
test('settings and bests are isolated by normalized account with strict save validation',()=>{
 assert.notEqual(cricketSaveKey('a@example.test'),cricketSaveKey('b@example.test'));
 assert.equal(cricketSaveKey(' A@example.test '),cricketSaveKey('a@example.test'));
 assert.ok(isCricketSave(emptyCricketSave()));
 assert.ok(isCricketSave({...emptyCricketSave(),stores:{'cm-match':'{}','cm-options':'{"camera":1,"sound":false}','cm-quality':'low','cm-best-club-2-24':'24'}}));
 for(const invalid of [null,[],{schemaVersion:2,stores:{},resultIds:[]},{...emptyCricketSave(),stores:{'statoz.games.web.finalover.v1':'{}'}},{...emptyCricketSave(),stores:{'cm-quality':3}},{...emptyCricketSave(),resultIds:['reward']}])assert.equal(isCricketSave(invalid),false);
});
test('bridge rejects another game or session',()=>{
 const message={protocolVersion:1,gameId:'stadium-cricket',sessionId:'current',type:'save',payload:emptyCricketSave()};
 assert.ok(cricketMessage(message,'current'));
 assert.ok(cricketMessage({...message,type:'exit'},'current'));
 assert.equal(cricketMessage(message,'old'),false);
 assert.equal(cricketMessage({...message,gameId:'final-over'},'current'),false);
 assert.equal(cricketMessage({...message,protocolVersion:2},'current'),false);
 assert.equal(cricketMessage({...message,type:'reward'},'current'),false);
});
test('baseline is pinned and all CSS and scripts are offline in the bundle',async()=>{
 const {verifySource,buildStadiumCricket}=await import('../scripts/build-stadium-cricket.mjs');
 const manifest=await verifySource();assert.equal(Object.keys(manifest.files).length,15);
 const html=await buildStadiumCricket();
 assert.doesNotMatch(html,/<script[^>]+src=|<link[^>]+stylesheet/);
 assert.ok(html.includes('CM.createPlayer'));
 assert.ok(html.indexOf('id="stage"')<html.indexOf('CM.createPlayer'));
 assert.ok(html.includes('Cricket Masters'));
 const source=await readFile('vendor/cricketv2/js/game.js','utf8');
 assert.ok(html.includes(source.replaceAll('</script','<\\/script')));
});
