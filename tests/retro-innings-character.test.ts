import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import sharp from 'sharp';
import {createCricketSimulation} from '../src/features/games/retro-innings/runtime/simulation.mjs';

const data=JSON.parse(fs.readFileSync('src/features/games/retro-innings/runtime/assets.json','utf8')).runtime;

test('derived OFF contact keeps blade pixels and changes only its sprite region',async()=>{
 const template=fs.readFileSync('src/features/games/retro-innings/runtime/match-template.html','utf8');
 const source=Buffer.from(template.match(/"bat":"data:image\/png;base64,([^"]+)/)![1],'base64');
 const corrected=fs.readFileSync('src/features/games/retro-innings/runtime/bat-right-handed.png');
 const a=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const b=await sharp(corrected).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.deepEqual(a.info,b.info);
 const [x,y,w,h]=data.families.off.poses[4].atlas;
 let changed=0;
 for(let py=0;py<a.info.height;py++)for(let px=0;px<a.info.width;px++){
  const at=(py*a.info.width+px)*4;
  if(a.data.subarray(at,at+4).equals(b.data.subarray(at,at+4)))continue;
  assert.ok(px>=x&&px<x+w&&py>=y&&py<y+h,`unrelated atlas pixel ${px},${py}`);
  changed++;
 }
 assert.ok(changed>0);
 for(const [px,py] of data.families.off.poses[4].cells){
  const at=((y+py)*a.info.width+x+px)*4;
  assert.deepEqual(b.data.subarray(at,at+4),a.data.subarray(at,at+4),`contact blade ${px},${py}`);
 }
 const built=fs.readFileSync('public/games/retro-innings/index.html','utf8');
 assert.ok(built.includes(corrected.toString('base64')),'built Canvas and Three.js texture should use the pinned corrected atlas');
});

for(const [laneIndex,lane] of ['leg','off','defend'].entries()){
 for(const kind of ['ground','air'] as const){
  test(`${lane} ${kind} starts from its delivery stance and keeps one pose family`,()=>{
   const game=createCricketSimulation(data);
   game.state.deliveryNumber=laneIndex;
   game.primary();
   assert.equal(game.state.plan.lane,lane);
   assert.equal(game.batterPose().id,data.families[lane].guard.id);
   game.advance(500);
   const poseBeforeInput=game.batterPose().id;
   assert.equal(poseBeforeInput,data.families[lane].guard.id);
   game.advance(game.state.plan.duration-game.strokeTiming(lane).leadMs-150);
   game.nesShot(kind);
   const family=lane==='defend'&&kind==='air'?'defendAir':lane;
   const action=game.state.action??game.state.strokeQueue;
   assert.equal(action?.family,family);
   for(let i=0;i<350&&!game.state.contact;i++){
    assert.ok([data.families[lane].guard.id,...data.families[family].poses.map((p:{id:string})=>p.id)].includes(game.batterPose().id));
    game.advance(5);
   }
   assert.ok(game.state.contact,`${lane} ${kind} should keep a physical bat contact`);
   assert.equal(game.state.contact.family,family);
   if(family==='defendAir'){
    game.advance(260);
    assert.equal(game.batterPose().id,'batter-defend-air-finish');
    assert.equal(game.battingAction().phase,'high-follow-through');
   }
  });
 }
}
