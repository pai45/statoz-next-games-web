import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {angle,at,clamp,cornerSpeed,damp,DEFAULT_OPTIONS,emptyInput,GATES_PER_LAP,GRID_SIZE,LAPS,newRace,pedalSpeed,position,project,recover,STEP,step,TRACK_LENGTH} from '../src/features/games/racer/engine';
import {gameForHref,gameRegistry} from '../src/mocks/games/game-registry';
import {cornerReferences,REFERENCE_LENGTH_METRES,referencePoints} from '../src/features/games/racer/circuit';
import {captureCurrent,capturePrevious,createMotion,interpolate} from '../src/features/games/racer/motion';
import {RacerInput} from '../src/features/games/racer/input';

test('Pedals accelerate, coast, stop and stay stopped with brake priority in manual and auto modes',()=>{
 assert.equal(DEFAULT_OPTIONS.autoAccelerate,false);
 let speed=0;for(let i=0;i<120;i++)speed=pedalSpeed(speed,emptyInput(),STEP,false,false,false);assert.equal(speed,0);
 for(let i=0;i<240;i++)speed=pedalSpeed(speed,{...emptyInput(),gas:true},STEP,false,false,false);assert.ok(speed>30&&speed<49);const powered=speed;
 for(let i=0;i<60;i++)speed=pedalSpeed(speed,emptyInput(),STEP,false,false,false);assert.ok(speed<powered&&speed>powered-4);
 for(const auto of [false,true]){speed=45;for(let i=0;i<240;i++)speed=pedalSpeed(speed,{steer:0,gas:true,boost:true,brake:true},STEP,auto,false,true);assert.equal(speed,0);}
 speed=0;for(let i=0;i<120;i++)speed=pedalSpeed(speed,emptyInput(),STEP,true,false,false);assert.ok(speed>15);
});
test('Normal and boosted speed limits settle without oscillation or a discontinuity on release',()=>{
 for(const [boost,cap] of [[false,49],[true,61]] as const){let speed=0;for(let i=0;i<2400;i++){const next=pedalSpeed(speed,{...emptyInput(),gas:true},STEP,false,false,boost);assert.ok(next>=speed-1e-10&&next<=cap);speed=next;}assert.ok(Math.abs(speed-cap)<.01);}
 const release=pedalSpeed(60,{...emptyInput(),gas:true},STEP,false,false,false);assert.ok(release<60&&release>59);
});
test('Traffic contact cannot show acceleration or spin wheels while physical travel is blocked',()=>{
 const r=newRace();r.countdown=0;Object.assign(r.player,at(25),{progress:25,lane:0,speed:30});r.lastDistance=25;
 r.opponents=[{...r.player,...at(29),name:'BLOCKER',progress:29,speed:0}];const x=r.player.x,z=r.player.z;
 step(r,{...emptyInput(),gas:true},STEP);const actual=Math.hypot(r.player.x-x,r.player.z-z)/STEP;assert.ok(actual<.01);assert.ok(Math.abs(r.player.speed-actual)<.01);
});
test('Independent input owners release gas and brake without dropping a second finger or key',()=>{
 const c=new RacerInput();c.hold('key:KeyW','gas');c.hold('pointer:1','gas');c.hold('pointer:2','brake');assert.equal(c.read().gas,true);assert.equal(c.read().brake,true);c.release('pointer:2');assert.equal(c.read().brake,false);c.release('key:KeyW');assert.equal(c.read().gas,true);c.release('pointer:1');assert.equal(c.read().gas,false);c.hold('key:ArrowDown','brake');c.steer(.8);c.clear();assert.deepEqual(c.read(),emptyInput());
});

test('Silverstone has the Grand Prix corner sequence and a full staggered twenty-car grid',()=>{
 const r=newRace(),cars=[r.player,...r.opponents];assert.equal(cars.length,20);assert.equal(position(r),20);assert.equal(new Set(cars.map(c=>c.name)).size,20);assert.equal(cornerReferences.length,18);assert.equal(cornerReferences[0].name,'Abbey');assert.equal(cornerReferences.at(-1)?.name,'Club');assert.equal(REFERENCE_LENGTH_METRES,5891);assert.ok(referencePoints.length>60);
 for(let i=0;i<cars.length;i++)for(let j=i+1;j<cars.length;j++)assert.ok(Math.hypot(cars[i].x-cars[j].x,cars[i].z-cars[j].z)>4.5,'Grid cars must not overlap');
});
test('Positive/right steering moves screen-right and negative/left moves screen-left',()=>{
 for(const steer of [-1,1]){const r=newRace();r.opponents=[];r.countdown=0;const point=at(35);Object.assign(r.player,point,{speed:20,progress:35,lane:0});r.lastDistance=35;const x=r.player.x,z=r.player.z,h=r.player.heading;
  for(let i=0;i<36;i++)step(r,{...emptyInput(),steer},STEP);
  const screenRight=(r.player.x-x)*-Math.cos(h)+(r.player.z-z)*Math.sin(h);assert.ok(screenRight*steer>.3,`steer ${steer}: screen offset ${screenRight}`);
 }
});
test('Motion interpolates subframes and crosses the heading wrap without a spin',()=>{
 const r=newRace(),m=createMotion(r);capturePrevious(m);r.player.x+=1;r.player.heading=-Math.PI+.02;m.previous[0].heading=Math.PI-.02;captureCurrent(m,r);const out={...m.current[0]},start=m.previous[0].x;interpolate(m,0,.25,out);assert.ok(Math.abs(out.x-start-.25)<1e-8);assert.ok(Math.abs(Math.abs(out.heading)-Math.PI)<.03);interpolate(m,0,.75,out);assert.ok(Math.abs(out.x-start-.75)<1e-8);
});
test('Damping is frame-rate independent and boost release does not snap to a speed cap',()=>{
 let fast=0,slow=0;for(let i=0;i<120;i++)fast=damp(fast,1,7,1/120);for(let i=0;i<30;i++)slow=damp(slow,1,7,1/30);assert.ok(Math.abs(fast-slow)<1e-12);
 const r=newRace();r.countdown=0;r.player.speed=59;step(r,emptyInput(),STEP);assert.ok(r.player.speed>58,'Boost should ease out instead of snapping to 49 m/s');
});

test('Racer has a new name and URL, with the original route kept compatible',()=>{
 assert.equal(gameRegistry['f1-racing'].title,'RACER');assert.equal(gameForHref('/play/racer')?.game,'f1-racing');assert.equal(gameForHref('/play/f1-racing')?.game,'f1-racing');assert.ok(!gameRegistry['f1-racing'].requiresDeck);
});
test('Recovered reference geometry stays pinned as history (Racer no longer loads it at runtime)',()=>{
 const provenance=JSON.parse(readFileSync('docs/racer/asset-provenance.json','utf8'));
 assert.equal(provenance.assets.length,6);
 for(const asset of provenance.assets){assert.equal(createHash('sha256').update(readFileSync(asset.source)).digest('hex'),asset.sha256);assert.ok(asset.triangles>0);}
});
test('Circuit projection is continuous across its start/finish seam',()=>{
 for(const d of [0,17,TRACK_LENGTH/3,TRACK_LENGTH-.2,TRACK_LENGTH+.2]){const point=at(d,2.3),p=project(point.x,point.z);assert.ok(Math.abs(p.lane-2.3)<.03);const delta=Math.abs((p.distance+TRACK_LENGTH)%TRACK_LENGTH-(d+TRACK_LENGTH)%TRACK_LENGTH);assert.ok(delta<.1||Math.abs(delta-TRACK_LENGTH)<.1);}
});
test('Countdown holds cars still; boost consumes charge and brake slows the car',()=>{
 const r=newRace(),z=r.player.z;step(r,emptyInput(),STEP);assert.equal(r.time,0);assert.equal(r.player.z,z);
 r.countdown=0;r.player.speed=42;const charge=r.boost;step(r,{...emptyInput(),boost:true},STEP);assert.ok(r.boost<charge);assert.equal(r.boosting,true);
 const speed=r.player.speed;step(r,{...emptyInput(),brake:true,boost:true},STEP);assert.ok(r.player.speed<speed);assert.equal(r.boosting,false);
});
test('Recovery preserves earned progress and checkpoints and releases steering',()=>{
 const r=newRace();r.player.progress=74;r.player.nextGate=96;r.checkpoints=1;r.player.x=900;r.player.z=900;r.player.speed=45;r.player.steer=1;recover(r);assert.equal(r.player.progress,74);assert.equal(r.checkpoints,1);assert.equal(r.player.steer,0);assert.ok(r.player.speed<=8);assert.ok(Math.abs(project(r.player.x,r.player.z).lane)<.01);
});
test('Ordinary steering/braking completes a full race and records two real lap times',()=>{
 const r=newRace();
 for(let i=0;i<48000&&!r.finished;i++){
  const p=r.player,aim=at(p.progress+clamp(p.speed*.28,4,13)),heading=Math.atan2(aim.x-p.x,aim.z-p.z);
  const steer=clamp(-angle(heading-p.heading)*3,-1,1),brake=p.speed>cornerSpeed(p.progress)+1;
  step(r,{steer,brake,gas:true,boost:cornerSpeed(p.progress)>45&&r.boost>35},STEP);
 }
 assert.equal(r.finished,true,JSON.stringify({progress:r.player.progress,time:r.time,hits:r.hits,checkpoints:r.checkpoints,lane:r.player.lane}));assert.equal(r.lapTimes.length,LAPS);assert.equal(r.checkpoints,GATES_PER_LAP*2);assert.ok(r.lapTimes.every(t=>t>0));assert.ok(position(r)>=1&&position(r)<=GRID_SIZE);const time=r.time;step(r,emptyInput(),STEP);assert.equal(r.time,time);
});

for(const mode of ['manual','automatic','manual-coasting'] as const)test(`Full twenty-car race: ${mode} pedal run`,()=>{
 const r=newRace(),options={autoAccelerate:mode==='automatic',sensitivity:1};let stops=0;
 for(let i=0;i<48000&&!r.finished;i++){
  const p=r.player,aim=at(p.progress+clamp(p.speed*.28,4,13)),heading=Math.atan2(aim.x-p.x,aim.z-p.z),target=cornerSpeed(p.progress),brake=p.speed>target+1;
  const gas=mode!=='automatic'&&(mode!=='manual-coasting'||target>p.speed-1);
  step(r,{steer:clamp(-angle(heading-p.heading)*3,-1,1),brake,gas,boost:target>45&&r.boost>35},STEP,options);
  if(brake&&p.speed===0)stops++;
 }
 assert.equal(r.finished,true,JSON.stringify({mode,progress:r.player.progress,time:r.time,checkpoints:r.checkpoints}));assert.equal(r.checkpoints,GATES_PER_LAP*2);assert.equal(r.lapTimes.length,2);assert.ok(stops<120);assert.ok(Number.isFinite(r.player.speed));
});
