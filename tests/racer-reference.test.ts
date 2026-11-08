import {test} from 'node:test';
import assert from 'node:assert/strict';
import {angle,at,emptyInput,GATES_PER_LAP,GATE_SPACING,navigation,newRace,position,recover,STEP,step,TRACK_LENGTH,updateRoute,waypoints} from '../src/features/games/racer/engine';
import {REFERENCE,SPEED_SCALE,steeringAuthority,torqueAtRpm,transmission} from '../src/features/games/racer/reference';

test('Recovered engine curve, eight gears and steering endpoints retain their declared values',()=>{
 assert.equal(REFERENCE.gears.length,8);assert.equal(REFERENCE.playerTorque,700);assert.equal(REFERENCE.aiTorque,650);
 assert.equal(torqueAtRpm(4500),350);assert.equal(torqueAtRpm(11000),700);assert.ok(Math.abs(torqueAtRpm(16000)-466.6666565)<1e-6);
 assert.equal(transmission(0,1).rpm,4500);assert.equal(transmission(49,1).gear,8);
 const boundary=REFERENCE.gears[2].upKph/3.6*SPEED_SCALE;const shifted=transmission(boundary+.01,3);assert.equal(shifted.gear,4);
 for(let i=0;i<300;i++)assert.equal(transmission(boundary+(i%2?.01:-.01),4).gear,4,'No gear hunting at the upshift boundary');
 assert.equal(steeringAuthority(0),1);assert.ok(Math.abs(steeringAuthority(49)-7.5/17.5)<1e-12);
});
test('All route gates are ordered; off-track skips, reverse crossings and resets award no lap',()=>{
 const r=newRace(),p=r.player;p.progress=.1;p.lane=0;p.heading=at(0).heading;updateRoute(p,-.1,1);assert.equal(p.waypointsPassed,0);
 p.progress=GATE_SPACING*2+.1;updateRoute(p,GATE_SPACING*2-.1,2);assert.equal(p.waypointsPassed,0);assert.equal(p.validatedProgress,GATE_SPACING);
 recover(r);assert.ok(p.progress<GATE_SPACING);assert.equal(p.lapTimes.length,0);
 p.progress=GATE_SPACING+.1;p.lane=20;p.heading=at(p.progress).heading;updateRoute(p,GATE_SPACING-.1,3);assert.equal(p.waypointsPassed,0);
 p.lane=0;p.heading=angle(at(p.progress).heading+Math.PI);updateRoute(p,GATE_SPACING-.1,4);assert.equal(p.waypointsPassed,0);
});
test('Player and CPU complete the same ordered gates and use finish time for classification',()=>{
 const r=newRace();for(const [i,c] of [r.player,r.opponents[0]].entries()){
  for(let gate=0;gate<=GATES_PER_LAP*2;gate++){c.progress=gate*GATE_SPACING+.02;c.heading=at(c.progress).heading;c.lane=0;updateRoute(c,gate*GATE_SPACING-.02,gate+1+i);}
  assert.equal(c.lapTimes.length,2);assert.ok(c.finishTime!==null);
 }
 assert.equal(position(r),1);r.opponents[0].progress=TRACK_LENGTH*30;assert.equal(position(r),1,'Post-finish travel never changes the winner');
});
test('All nineteen CPUs launch, brake and finish two laps with physical travel and no spline warps',()=>{
 const r=newRace();r.countdown=0;Object.assign(r.player,at(-82,12),{lane:12});let braking=0,maxJump=0;
 for(let i=0;i<28000;i++){
  const before=r.opponents.map(c=>({x:c.x,z:c.z}));step(r,{...emptyInput(),brake:true},STEP);
  r.opponents.forEach((c,j)=>{maxJump=Math.max(maxJump,Math.hypot(c.x-before[j].x,c.z-before[j].z));if(c.brake)braking++;assert.ok(Number.isFinite(c.rpm));});
  if(i===240)assert.ok(r.opponents.every(c=>c.progress>-82&&c.speed>3),'The entire staggered grid launches together');
  if(r.opponents.every(c=>c.finishTime!==null))break;
 }
 assert.ok(braking>500);assert.ok(maxJump<2,`Unexpected AI warp: ${maxJump}`);assert.ok(r.opponents.every(c=>c.finishTime!==null&&c.lapTimes.length===2),'Every rival must finish');assert.ok(waypoints.some(w=>w.targetSpeed<20));
});
test('Waypoint AI speed has no rubber band based on the player race position',()=>{
 const r=newRace(),c=r.opponents[0];Object.assign(c,at(500),{progress:500,lane:0,speed:35});
 const a=structuredClone(c),b=structuredClone(c),playerA={...r.player,...at(100),progress:100},playerB={...r.player,...at(900),progress:900};
 assert.deepEqual(navigation(a,0,[a,playerA],STEP),navigation(b,0,[b,playerB],STEP));assert.equal(a.targetSpeed,b.targetSpeed);
});
test('A blocked CPU enters bounded reverse recovery rather than remaining permanently stuck',()=>{
 const r=newRace(),c=r.opponents[0];c.speed=0;for(let i=0;i<241;i++)navigation(c,0,[c],STEP);assert.equal(c.reversing,true);
 for(let i=0;i<241;i++)navigation(c,0,[c],STEP);assert.equal(c.reversing,false);assert.ok(c.stuckTime<.1);
});
test('The race detects driving against the route and clears the warning on recovery',()=>{
 const r=newRace();r.countdown=0;r.opponents=[];Object.assign(r.player,at(35),{progress:35,lane:0,speed:20,heading:angle(at(35).heading+Math.PI)});
 for(let i=0;i<75;i++)step(r,{...emptyInput(),gas:true},STEP);
 assert.equal(r.wrongWay,true);recover(r);assert.equal(r.wrongWay,false);assert.equal(r.wrongWayTime,0);
});
