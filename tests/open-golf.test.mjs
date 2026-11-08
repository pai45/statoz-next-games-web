import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {buildOpenGolf} from '../scripts/build-open-golf.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

test('Open Golf preserves engine provenance and embeds all runtime resources',async()=>{
 const provenance=JSON.parse(await fs.readFile('src/features/games/open-golf/source/provenance.json','utf8'));
 for(const [file,hash] of Object.entries(provenance.files))assert.equal(sha(await fs.readFile('src/features/games/open-golf/source/'+file)),hash,file);
 for(const [file,font] of Object.entries(provenance.interface.fonts))assert.equal(sha(await fs.readFile(file)),font.sha256,file);
 const html=await buildOpenGolf({prelude:'<script>/*__STATOZ_BOOT__*/</script>'});
 assert.ok(html.includes('data-game="open-golf"'));assert.ok(html.includes('/*__STATOZ_BOOT__*/'));
 assert.ok(html.includes('id="og-wasm"'));assert.ok(html.includes('decode(document.getElementById(\'og-wasm\')'));
 assert.ok(!/<script[^>]+src=/.test(html));
 assert.ok(html.includes('Michael Gerdes'));assert.ok(html.includes('open-golf.storage'));
 assert.ok(html.includes('data:font/woff2;base64,'),'Rubik is embedded for offline play');
 const manifest=JSON.parse(await fs.readFile('public/embedded-games/manifest.json','utf8'));
 const entry=manifest.games.find(g=>g.id==='open-golf');assert.equal(entry.sport,'golf');
 const bytes=await fs.readFile('public/embedded-games/'+entry.path);assert.equal(bytes.length,entry.bytes);assert.equal(sha(bytes),entry.sha256);
});

test('Open Golf launches without shared-memory workers or isolation redirects',async()=>{
 const runtime=await fs.readFile('src/features/games/open-golf/source/golf-mobile.js','utf8');
 assert.ok(!runtime.includes('SharedArrayBuffer'));
 const html=await buildOpenGolf({prelude:''});
 assert.ok(!html.includes('new Worker('));
 const screen=await fs.readFile('src/features/games/open-golf/screen.tsx','utf8');
 assert.ok(!screen.includes('crossOriginIsolated'));
 assert.ok(!screen.includes('location.replace'));
});

test('The engine exports the bridge the arcade shell calls',async()=>{
 const runtime=await fs.readFile('src/features/games/open-golf/source/golf-mobile.js','utf8');
 const shell=await fs.readFile('src/features/games/open-golf/shell/golf-shell.js','utf8');
 const called=new Set([...shell.matchAll(/call\('([a-z_]+)'/g)].map(match=>match[1]));
 assert.ok(called.size>=12);
 for(const name of called)assert.ok(runtime.includes('_statoz_golf_'+name),name);
 const bridge=await fs.readFile('scripts/open-golf/statoz-ui-bridge.c','utf8');
 for(const name of called)assert.match(bridge,new RegExp(`statoz_golf_${name}\\(`),name);
});

test('The lobby and in-game shell keep the game\'s own arcade style, not the StatOz system',async()=>{
 const css=await fs.readFile('src/features/games/open-golf/shell/golf-shell.css','utf8');
 const markup=await fs.readFile('src/features/games/open-golf/shell/golf-shell.html','utf8');
 const lobbyCss=await fs.readFile('src/features/games/open-golf/components/open-golf-lobby.module.css','utf8');
 const lobby=await fs.readFile('src/features/games/open-golf/components/open-golf-lobby.tsx','utf8');
 for(const banned of ['--ds-','Orbitron','Space Grotesk','clip-hud','chamfer'])for(const [name,text] of Object.entries({css,markup,lobbyCss,lobby}))assert.ok(!text.includes(banned),`${name}: ${banned}`);
 assert.ok(!lobby.includes('@/design-system'),'the lobby does not use design-system components');
 const html=await buildOpenGolf({prelude:''});
 for(const id of ['og-splash','og-select','og-hud','og-pause','og-finish','og-hostpause','og-error','resume'])assert.ok(html.includes(`id="${id}"`),id);
 const bundles=await fs.readFile('scripts/build-game-bundles.mjs','utf8');
 assert.match(bundles,/'open-golf'\]\.includes\(gameId\)\?'':'<style>'\+fontStyle/,'StatOz fonts are not injected into the game');
});
