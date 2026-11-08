import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gameRegistry,sportForGame,sportGameDecks,gameForHref} from '../src/mocks/games';

test('Pitch Rush is an additional football game with no deck gate',()=>{
  assert.equal(sportForGame('pitch-rush'),'football');
  assert.ok(sportGameDecks.football.includes('pitch-rush'));
  assert.equal(gameForHref('/play/pitch-rush')?.game,'pitch-rush');
  assert.equal(gameRegistry['pitch-rush'].requiresDeck,undefined);
});
test('WebSoccer baseline and its MIT notice stay intact',async()=>{
  const root='src/features/games/pitch-rush/source/';
  const source=JSON.parse(await fs.readFile(root+'SOURCE.json','utf8'));
  assert.equal(source.commit,'e3628948208c4c89c781e86068d20320169f9fe5');
  for(const [name,hash] of Object.entries(source.files))assert.equal(createHash('sha256').update(await fs.readFile(root+name)).digest('hex'),hash,name);
  assert.match(await fs.readFile(root+'LICENSE','utf8'),/Copyright \(c\) 2026 Mark Clausing/);
});
test('manifest pins a self-contained football bundle with independent presentation',async()=>{
  const manifest=JSON.parse(await fs.readFile('public/embedded-games/manifest.json','utf8'));
  const entry=manifest.games.find((game:{id:string})=>game.id==='pitch-rush');
  assert.ok(entry);assert.equal(entry.sport,'football');
  const bytes=await fs.readFile('public/embedded-games/'+entry.path);
  assert.equal(entry.sha256,createHash('sha256').update(bytes).digest('hex'));
  assert.equal(entry.bytes,bytes.length);
  const html=bytes.toString();
  assert.match(html,/<title>Pitch Rush<\/title>/);
  assert.match(html,/data:image\/webp;base64,/);
  assert.doesNotMatch(html,/(?:src|href)=["'](?:https?:|styles\.css|src\/|icons\/)/);
  assert.doesNotMatch(html,/websoccer\.vibecoach\.workers\.dev|Space Grotesk|Orbitron/);
});
