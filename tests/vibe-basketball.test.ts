import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gameRegistry, sportForGame, sportGameDecks, gameForHref, playableGameHrefs} from '../src/mocks/games';

test('Vibe Basketball remains a playable basketball game without a deck gate',()=>{
 assert.equal(sportForGame('vibe-basketball'),'basketball');
 assert.ok(sportGameDecks.basketball.includes('vibe-basketball'));
 assert.equal(gameRegistry['vibe-basketball'].requiresDeck,undefined);
 assert.equal(gameForHref('/play/vibe-basketball')?.game,'vibe-basketball');
 assert.ok(playableGameHrefs().includes('/play/vibe-basketball'));
});
test('vendored source retains the exact pinned file hashes and license',async()=>{
 const root='src/features/games/vibe-basketball/source/';
 const manifest=JSON.parse(await fs.readFile(root+'SOURCE.json','utf8'));
 assert.equal(manifest.commit,'184a5b27ee259869744f0b32de9954ab7983c1bb');
 for(const [name,hash] of Object.entries(manifest.files))assert.equal(createHash('sha256').update(await fs.readFile(root+name)).digest('hex'),hash,name);
 assert.match(await fs.readFile(root+'LICENSE','utf8'),/MIT License/);
});
test('local bundle preserves isolated Three.js and loads its model relative to the document',async()=>{
 const pkg=JSON.parse(await fs.readFile('src/features/games/vibe-basketball/source/node_modules/three/package.json','utf8'));
 assert.equal(pkg.version,'0.170.0');
 const html=await fs.readFile('public/embedded-games/vibe-basketball/index.html','utf8');
 assert.doesNotMatch(html,/(?:src|href)=["'](?:https?:|\/src\/|\/models\/)/);
 const js=await fs.readFile('public/embedded-games/vibe-basketball/game.js','utf8');
 assert.ok(js.includes('./models/contest/vibe-contest-props.glb'));
 assert.ok((await fs.stat('public/embedded-games/vibe-basketball/models/contest/vibe-contest-props.glb')).size>0);
 assert.match(await fs.readFile('public/embedded-games/vibe-basketball/LICENSES.txt','utf8'),/mike007jd/);
});
