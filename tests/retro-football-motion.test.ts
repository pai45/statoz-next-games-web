import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {Simulation} from '../src/features/games/retro-football/runtime/simulation';
import {movementFacing,movementView} from '../src/features/games/retro-football/runtime/animation';
import {PITCH_EXTENT} from '../src/features/games/retro-football/runtime/geometry';
import {followingCamera} from '../src/features/games/retro-football/runtime/presentation';
import {readResult} from '../src/features/games/retro-football/protocol';
import type {AssetManifest} from '../src/features/games/retro-football/runtime/contracts';
import sharp from 'sharp';import {createHash} from 'node:crypto';
const assets=JSON.parse(fs.readFileSync('public/games/retro-football/assets.json','utf8')) as AssetManifest;
test('Counter-strides preserve heads, replay exact edits and match their packed atlas pixels',async()=>{
 const root='docs/retro-football/motion-assets/',ledger=JSON.parse(fs.readFileSync(root+'manifest.json','utf8')),atlas=await sharp('public/games/retro-football/team-atlas.png').ensureAlpha().raw().toBuffer();
 for(const record of ledger.records){
  const bytes=fs.readFileSync(root+record.file),pixels=await sharp(bytes).ensureAlpha().raw().toBuffer();assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256);
  const region=assets.records.find(r=>r.id===record.id)!;assert.ok(region);const [x,y,w,h]=region.atlas;
  for(let row=0;row<h;row++)assert.deepEqual(atlas.subarray(((y+row)*1024+x)*4,((y+row)*1024+x+w)*4),pixels.subarray(row*w*4,(row+1)*w*4));
  if(!record.id.startsWith('orchard-')){const base=await sharp(root+record.id+'-base.png').ensureAlpha().raw().toBuffer(),replay=Buffer.from(base),edits=JSON.parse(fs.readFileSync(root+record.id+'-edits.json','utf8'));for(const edit of edits){assert.ok(edit.y>=29);const offset=(edit.y*80+edit.x)*4;assert.deepEqual([...replay.subarray(offset,offset+4)],edit.before);replay.set(edit.after,offset);}assert.deepEqual(replay,pixels);assert.deepEqual(base.subarray(0,29*80*4),pixels.subarray(0,29*80*4));}
 }
});
test('Diagonal facing keeps its family through small steering changes and still reverses promptly',()=>{
 assert.equal(movementFacing('E',.71,.70),'E');assert.equal(movementFacing('E',.68,.74),'E');assert.equal(movementFacing('E',.2,.9),'S');assert.equal(movementFacing('E',-.8,.2),'W');assert.equal(movementFacing('N',.7,-.72),'N');
});
test('Gait uses travel distance with unchanged six-update holds at full running speed',()=>{
 const sim=new Simulation(assets),p=sim.state.players[9];p.moving=true;p.facing='E';
 for(let n=0;n<24;n++){p.strideDistance=n*.12;assert.equal(movementView(p,assets).pose,'run-e-'+Math.floor(n/6));}
 p.strideDistance=.35;assert.equal(movementView(p,assets).pose,'run-e-0');p.strideDistance=.75;assert.equal(movementView(p,assets).pose,'run-e-1');
});
test('Backward delivery faces its target and releases at that actual pose foot',()=>{
 const sim=new Simulation(assets);sim.command({type:'start'});const s=sim.state;s.phase='open';s.restart=null;for(const p of s.players){p.cooldown=99999;p.x=5;p.y=4;}
 const p=s.players[9];p.x=55;p.y=34;p.cooldown=0;s.owner=9;s.selected=9;p.action={kind:'pass',age:11,target:{x:40,y:34},released:false,hit:false,direction:{x:1,y:0}};
 sim.step();const event=s.events.find(e=>e.kind==='pass');assert.equal(sim.view(p).mirror,true);assert.equal(event?.mirror,true);assert.ok(s.ball.vx<0);assert.deepEqual(event?.worldPoint,sim.anchor(p,'foot'));
});
test('Viewport resizing changes presentation without possession, players, score or ball changes',()=>{
 const sim=new Simulation(assets),before=sim.snapshot();sim.setViewportWidth(600);assert.equal(sim.viewportWidth,600);assert.deepEqual(sim.state.ball,before.ball);assert.deepEqual(sim.state.players,before.players);assert.deepEqual(sim.state.score,before.score);assert.equal(sim.state.owner,before.owner);
 for(const width of [320,384,600]){let camera={x:0,y:0};for(let n=0;n<60;n++)camera=followingCamera({x:700,y:280},{x:90,y:0},camera,width);assert.ok(camera.x>=0&&camera.x<=PITCH_EXTENT.width-width);}
});
test('Only known runtime/rule pairs accept current and retained completed results',()=>{
 const result={schemaVersion:2,gameId:'retro-football',mode:'exhibition',outcome:'draw',score:[1,1],airContacts:[0,0],airCollections:[0,0],passes:[4,4],shots:[2,2],saves:[1,1],halves:2,activeSeconds:180,runtimeVersion:'0.6.0',rulesVersion:'exhibition-handheld-v1',assetVersion:'football-handheld-atlas-v1'};
 assert.ok(readResult(result));assert.equal(readResult({...result,rulesVersion:'exhibition-complete-v1'}),null);assert.ok(readResult({...result,runtimeVersion:'0.5.0',rulesVersion:'exhibition-complete-v1',assetVersion:'football-complete-atlas-v1'}));
});
test('Full two-half deterministic exhibition completes with adaptive camera and all AI active',()=>{
 const run=()=>{const sim=new Simulation(assets);sim.setViewportWidth(500);sim.command({type:'start'});for(let n=0;n<60000&&sim.state.status!=='complete';n++){const s=sim.state;if(s.status==='halftime')sim.command({type:'start'});if(s.phase==='restart'&&s.restart?.team===0&&!s.players[s.restart.taker].action)sim.command({type:'A'});sim.step();assert.ok([s.ball.x,s.ball.y,s.ball.z,s.camera.x,s.camera.y].every(Number.isFinite));}assert.equal(sim.state.status,'complete');assert.equal(sim.state.halfTicks,5400);return sim.snapshot();};assert.deepEqual(run(),run());
});
