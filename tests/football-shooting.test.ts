import assert from 'node:assert/strict';
import {test} from 'node:test';
import {FootballEngine,gestureShot,ballAt,inGoal,catches,parseProgress,recordProgress} from '../src/features/games/football-shooting/engine';
function finishFlight(e:FootballEngine){for(let i=0;i<300&&e.phase!=='verdict';i++)e.step(1/60);assert.equal(e.phase,'verdict')}
test('swipes are viewport relative; short taps and downward drags do not fire',()=>{
 const p=[{x:100,y:500,t:0},{x:120,y:400,t:120},{x:140,y:300,t:240}],a=gestureShot(p,400,800)!;
 const b=gestureShot(p.map(v=>({...v,x:v.x*2,y:v.y*2})),800,1600)!;
 assert.deepEqual(a,b);assert.ok(a.power>=.2&&a.power<=1);assert.equal(gestureShot([{x:0,y:0,t:0},{x:1,y:2,t:20}],400,800),null);
 assert.equal(gestureShot([{x:0,y:200,t:0},{x:1,y:190,t:20}],400,800),null);
});
test('curved swipes create bend; flight ends at the chosen location',()=>{
 const shot=gestureShot([{x:100,y:500,t:0},{x:200,y:400,t:120},{x:100,y:300,t:240}],400,800)!;
 assert.ok(shot.curve>.5);assert.ok(ballAt(shot,.5).x>0);assert.ok(Math.abs(ballAt(shot,1).x-shot.x)<1e-6);assert.equal(ballAt(shot,1).z,-14);
 assert.ok(ballAt(shot,.5).y>shot.y*.5);assert.equal(inGoal({...shot,x:4}),false);assert.equal(inGoal({...shot,y:3}),false);
});
test('keeper reach requires proximity and a valid goal',()=>{const shot={x:2.5,y:1.8,power:.7,curve:0};assert.equal(catches(shot,{x:2.3,y:1.6}),true);assert.equal(catches(shot,{x:0,y:1}),false);});
test('pause freezes a pending shot and training records target hits over five balls',()=>{
 const e=new FootballEngine();e.start('training',1,42);
 for(let turn=0;turn<5;turn++){
   e.shoot({...e.target,power:.7,curve:0});e.step(.05);const elapsed=e.elapsed;e.setPaused(true);for(let i=0;i<200;i++)e.step(.05);assert.equal(e.elapsed,elapsed);assert.equal(e.phase,'flight');e.setPaused(false);finishFlight(e);assert.equal(e.hits,turn+1);e.advance();
 }
 assert.equal(e.phase,'finished');assert.equal(e.won,true);assert.equal(e.goals,5);
});
test('five alternating rounds include cue timing, goalkeeper inputs, and a final result',()=>{
 const e=new FootballEngine();e.start('shootout',2,123);
 for(let round=0;round<5;round++){
   assert.equal(e.attacking,true);e.shoot({x:3.3,y:2.1,power:1,curve:1});finishFlight(e);e.advance();assert.equal(e.attacking,false);assert.equal(e.cueVisible,false);
   for(let i=0;i<23;i++)e.step(.05);assert.equal(e.cueVisible,true);
   e.defend(e.shot.x,e.shot.y);e.defend(-e.shot.x,1);assert.equal(e.dive?.x,e.shot.x);finishFlight(e);assert.equal(e.lastOutcome,'save');e.advance();
 }
 assert.equal(e.phase,'finished');assert.equal(e.saves,5);assert.equal(e.opponent,0);
});
test('seeded CPU play is reproducible and local progression only unlocks earned competitions',()=>{
 const a=new FootballEngine(),b=new FootballEngine();a.start('shootout',3,12);b.start('shootout',3,12);a.shoot({x:2,y:1,power:.6,curve:0});b.shoot({x:2,y:1,power:.6,curve:0});assert.deepEqual(a.dive,b.dive);
 const p=parseProgress('invalid');assert.equal(p.unlocked,1);assert.equal(parseProgress('{"unlocked":900,"bestTraining":-2}').unlocked,6);
 assert.equal(recordProgress(p,{won:false,mode:'shootout',level:1,hits:0}).unlocked,1);
 const next=recordProgress(p,{won:true,mode:'shootout',level:1,hits:0});assert.equal(next.unlocked,2);assert.equal(next.wins,1);
 assert.equal(recordProgress(next,{won:true,mode:'training',level:6,hits:4}).unlocked,2);assert.equal(recordProgress(next,{won:true,mode:'training',level:6,hits:4}).bestTraining,4);
});
