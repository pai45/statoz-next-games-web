import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CAREER_KEY,STAGES,careerComplete,continueStage,emptyCareer,readCareer,recordCareer,setupFor,starsFor,totalStars,unlocked} from '../src/features/games/racer/career';
import {CIRCUITS} from '../src/features/games/racer/circuit';
import {angle,clamp,circuitFor,emptyInput,newRace,position,recover,STEP,step,updateRoute} from '../src/features/games/racer/engine';

test('Twelve stages scale from three opponents on an oval to nineteen at Silverstone',()=>{
 assert.equal(CAREER_KEY,'racer.career.progress.v1');assert.equal(STAGES.length,12);
 assert.deepEqual(STAGES.map(s=>s.opponents),[3,4,5,7,9,11,13,15,17,19,19,19]);
 assert.deepEqual(STAGES.map(s=>s.laps),[1,1,1,2,2,2,2,2,2,2,3,3]);
 for(const stage of STAGES){const race=newRace('#fff',setupFor(stage));assert.equal(race.opponents.length,stage.opponents);assert.equal(race.laps,stage.laps);assert.equal(position(race),stage.opponents+1);assert.equal(race.careerStageId,stage.id);if(stage.index){const previous=setupFor(STAGES[stage.index-1]).rivalTuning!,current=setupFor(stage).rivalTuning!;for(const key of ['pace','torque','consistency','boost'] as const)assert.ok(current[key]>previous[key]);}}
});
test('Podiums advance without extra tier gates; replay keeps independent personal bests',()=>{
 let save=emptyCareer();assert.equal(unlocked(save,STAGES[1]),false);assert.throws(()=>recordCareer(save,STAGES[1],1,30));
 save=recordCareer(save,STAGES[0],4,40);assert.equal(unlocked(save,STAGES[1]),false);assert.equal(continueStage(save).id,STAGES[0].id);
 save=recordCareer(save,STAGES[0],3,42);assert.equal(unlocked(save,STAGES[1]),true);assert.equal(continueStage(save).id,STAGES[1].id);assert.equal(save.records['race-1'].bestTime,40);
 save=recordCareer(save,STAGES[0],1,45);save=recordCareer(save,STAGES[0],4,38);assert.deepEqual(save.records['race-1'],{stars:3,bestPosition:1,bestTime:38,attempts:4});
 for(const stage of STAGES.slice(1))save=recordCareer(save,stage,3,60);
 assert.ok(careerComplete(save));assert.equal(totalStars(save),14);assert.equal(continueStage(save).id,STAGES[11].id);
 for(const stage of STAGES)save=recordCareer(save,stage,1,50);
 assert.equal(totalStars(save),36);assert.deepEqual([1,2,3,4,20].map(starsFor),[3,2,1,0,0]);
});
test('Career reload validates records, ordering, selection and future versions',()=>{
 const save=recordCareer(emptyCareer(),STAGES[0],2,43);assert.deepEqual(readCareer(JSON.stringify(save)),{save,incompatible:false});assert.deepEqual(readCareer(null).save,emptyCareer());
 for(const raw of ['{','[]','null',JSON.stringify({...save,schemaVersion:2}),JSON.stringify({...save,selected:'race-12'}),JSON.stringify({...save,records:{'race-12':save.records['race-1']}}),JSON.stringify({...save,records:{'race-1':{...save.records['race-1'],stars:3}}})])assert.equal(readCareer(raw).incompatible,true,raw);
 const a=recordCareer(emptyCareer(),STAGES[0],1,33),b=emptyCareer();assert.equal(totalStars(b),0);assert.equal(totalStars(a),3);
});
test('Every circuit shares coherent frozen geometry, map, separated grid and safe barriers',()=>{
 for(const definition of CIRCUITS){const circuit=circuitFor(definition.id),race=newRace('#fff',{circuit:definition.id});assert.ok(Object.isFrozen(circuit)&&Object.isFrozen(circuit.track));assert.equal(circuitFor(definition.id),circuit);
  const cars=[race.player,...race.opponents];for(let i=0;i<cars.length;i++)for(let j=0;j<i;j++)assert.ok(Math.hypot(cars[i].x-cars[j].x,cars[i].z-cars[j].z)>4.5,definition.id+' grid');
  for(let d=0;d<circuit.TRACK_LENGTH;d+=8){const p=circuit.at(d),q=circuit.project(p.x,p.z),map=circuit.mapPosition(p.x,p.z);assert.ok(Math.abs(q.lane)<.1);assert.ok(map.x>=9&&map.x<=146&&map.y>=9&&map.y<=135);for(const side of [-1,1]){if(circuit.wallKind(d,side)==='none')continue;const wall=circuit.at(d,circuit.wallLane(d,side)*side);assert.ok(Math.abs(circuit.project(wall.x,wall.z).lane)>9.1,definition.id+' barrier');}}
 }
});
test('Career lap counts require ordered forward gates; recovery cannot skip them',()=>{
 for(const stage of STAGES){const race=newRace('#fff',setupFor(stage)),c=race.player,g=race.circuit;race.countdown=0;
  Object.assign(c,g.at(g.GATE_SPACING*4),{progress:g.GATE_SPACING*4,lane:0});updateRoute(c,c.progress-1,1,STEP,g,race.laps);assert.equal(c.waypointsPassed,-1);recover(race);assert.ok(c.progress<c.nextGate);
  for(let gate=0;gate<=g.GATES_PER_LAP*stage.laps;gate++){const distance=gate*g.GATE_SPACING;Object.assign(c,g.at(distance),{progress:distance+.01,lane:0});updateRoute(c,distance-.01,gate+1,STEP,g,race.laps);}
  assert.equal(c.lapTimes.length,stage.laps);assert.ok(c.finishTime!==null,stage.id);
 }
});
for(const stage of STAGES)test(`Career ${stage.index+1}: player and complete rival field finish ${stage.laps} laps`,()=>{
 const race=newRace('#fff',setupFor(stage)),g=race.circuit;
 // Driver follows the centreline using ordinary steer, gas, brake and boost inputs.
 for(let i=0;i<72000&&!race.finished;i++){
  const p=race.player,aim=g.at(p.progress+clamp(p.speed*.28,4,13)),heading=Math.atan2(aim.x-p.x,aim.z-p.z),target=g.cornerSpeed(p.progress);
  step(race,{steer:clamp(-angle(heading-p.heading)*3,-1,1),brake:p.speed>target+1,gas:race.countdown<.45,boost:race.countdown===0&&target>45&&race.boost>35},STEP);
 }
 assert.ok(race.finished,JSON.stringify({stage:stage.id,time:race.time,progress:race.player.progress,gates:race.checkpoints}));assert.equal(race.checkpoints,g.GATES_PER_LAP*stage.laps);assert.equal(race.lapTimes.length,stage.laps);
 const finish=position(race);assert.ok(finish>=1&&finish<=race.gridSize);
 if(stage.index===0||stage.index===11)assert.ok(finish<=3,`Reference driver must achieve podium at ${stage.id}: P${finish}`);
 // A parked player lets all CPUs finish independently through the same physical simulation.
 const pack=newRace('#fff',setupFor(stage));pack.countdown=0;Object.assign(pack.player,g.at(-8,12),{lane:12});
 for(let i=0;i<72000&&!pack.opponents.every(c=>c.finishTime!==null);i++)step(pack,{...emptyInput(),brake:true},STEP);
 assert.ok(pack.opponents.every(c=>c.finishTime!==null),JSON.stringify({stage:stage.id,unfinished:pack.opponents.filter(c=>c.finishTime===null).map(c=>({name:c.name,progress:c.progress,nextGate:c.nextGate}))}));
});
