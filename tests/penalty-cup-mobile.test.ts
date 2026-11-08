import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {initializePhysics,ShootoutSimulation} from '../src/features/games/penalty-shootout/engine/simulation';
import {emptyInput,STEP,type InputFrame} from '../src/features/games/penalty-shootout/game-types';
import {seeded} from '../src/features/games/penalty-shootout/engine/rules';
import {keeperSample,type CharacterPack} from '../src/features/games/penalty-shootout/rendering/sprite-motion';
import {cpuLevel,currentFixture,newCup,storeCheckpoint} from '../src/features/games/penalty-cup/tournament';
import {emptySave,readSave,storageKey,updateCup,validCup,writeSave} from '../src/features/games/penalty-cup/storage';

const advance=(s:ShootoutSimulation,seconds:number,input:InputFrame=emptyInput())=>{for(let i=0;i<Math.ceil(seconds/STEP);i++)s.step(input);};
function finish(s:ShootoutSimulation){for(let i=0;i<1800&&s.phase!=='resolution';i++)s.step(emptyInput());assert.equal(s.phase,'resolution');}
function shot(s:ShootoutSimulation){advance(s,.22,{...emptyInput(),shoot:true});s.step(emptyInput());finish(s);}
function memory(){const values=new Map<string,string>();return{values,getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);}};}
test('random-state snapshots restore the exact next random draws',()=>{const a=seeded(722);a();a();const state=a.state(),sequence=[a(),a(),a()];const b=seeded(1);b.restore(state);assert.deepEqual([b(),b(),b()],sequence);});
test('an in-progress cup preserves completed penalties and the next CPU action on reload',async()=>{
 await initializePhysics();const cup=newCup('ARG',92,'checkpoint'),f=currentFixture(cup)!,level=cpuLevel('group');
 const a=new ShootoutSimulation('shootout',level,f.seed,{allowDraw:true,earlyClinch:false,responsiveKeeping:true});
 const b=new ShootoutSimulation('shootout',level,f.seed,{allowDraw:true,earlyClinch:false,responsiveKeeping:true});
 try{
  shot(a);const cp=JSON.parse(JSON.stringify(a.checkpoint()));const saved=storeCheckpoint(cup,`${cup.id}:${f.id}:0`,cp);
  assert.equal(saved.checkpoint?.match.kicks.length,1);assert.ok(validCup(saved));
  const storage=memory();assert.ok(writeSave(storage,'player',updateCup(emptySave(),saved)));const restored=readSave(storage,'player').save.active!;
  b.restoreCheckpoint(restored.checkpoint!.match);a.next();assert.equal(b.role,'keeping');assert.deepEqual(a.snapshot().kicks,b.snapshot().kicks);
  finish(a);finish(b);assert.deepEqual(a.snapshot().kicks,b.snapshot().kicks);
  assert.equal(storeCheckpoint(saved,`${cup.id}:${f.id}:0`,cp),saved);
 }finally{a.dispose();b.dispose();}
});
test('early goalkeeper taps prepare a dive for the run-up; original Shootout behavior remains available',async()=>{
 await initializePhysics();const s=new ShootoutSimulation('keeping',5,100,{responsiveKeeping:true}),legacy=new ShootoutSimulation('keeping',5,100);
 try{const input={...emptyInput(),dive:{x:-1,y:-1}};s.step(input);legacy.step(input);assert.equal(s.frame().keeper.direction,0);assert.equal(legacy.frame().keeper.direction,1);advance(s,2.6);assert.equal(s.frame().keeper.direction,0);advance(s,.15);assert.equal(s.frame().keeper.direction,1);assert.ok(s.frame().keeper.dive>0&&s.frame().keeper.dive<.25);}
 finally{s.dispose();legacy.dispose();}
});
test('Cup low saves pass through the source push/stretch frames and land coherently',()=>{
 const pack:CharacterPack=JSON.parse(fs.readFileSync('public/assets/games/penalty-shootout/imported-characters/manifest.json','utf8'));
 const sample=(time:number)=>keeperSample(pack.keeper,{tick:120,keeperClip:'dive_low_left',keeperTime:time,keeper:{root:{x:0,y:0,z:0},lean:0,leftHand:{x:0,y:0,z:0},rightHand:{x:0,y:0,z:0},direction:-1,height:-1,dive:time}},true);
 assert.deepEqual([.16,.24,.34,.46,.62].map(t=>sample(t).index),[8,9,11,11,11]);assert.equal(sample(1.7).index,12);assert.equal(sample(.62).landAt,1.7);assert.equal(sample(3.1).index,45);
});
test('centre high and low save inputs have distinct glove reach',async()=>{
 await initializePhysics();const low=new ShootoutSimulation('keeping',5,12,{responsiveKeeping:true}),high=new ShootoutSimulation('keeping',5,12,{responsiveKeeping:true});
 try{low.step({...emptyInput(),dive:{x:0,y:-1}});high.step({...emptyInput(),dive:{x:0,y:1}});advance(low,2.85);advance(high,2.85);assert.ok(high.frame().keeper.leftHand.y>low.frame().keeper.leftHand.y+.5);}
 finally{low.dispose();high.dispose();}
});
test('legacy cups migrate without losing IDs, scores, pending decisions or history',()=>{
 const storage=memory(),cup=newCup('JPN',7,'legacy');const old={...cup,version:1,difficulty:'hard'};delete (old as Record<string,unknown>).checkpoint;
 storage.setItem(storageKey('a'),JSON.stringify({version:1,active:old,history:[]}));const read=readSave(storage,'a');
 assert.equal(read.error,'');assert.equal(read.save.version,2);assert.equal(read.save.active?.id,'legacy');assert.deepEqual(read.save.active?.fixtures,cup.fixtures);assert.equal('difficulty' in read.save.active!,false);assert.equal(read.save.active?.checkpoint,null);
});
test('backup recovery and revisions preserve valid progress after corruption or a stale write',()=>{
 const storage=memory(),save={...updateCup(emptySave(),newCup('BRA',9,'safe')),revision:4};assert.ok(writeSave(storage,'a',save));
 assert.equal(writeSave(storage,'a',{...save,revision:3}),false);assert.equal(writeSave(storage,'a',{...save,active:newCup('JPN',3,'different')}),false);storage.setItem(storageKey('a'),'broken');
 const recovered=readSave(storage,'a');assert.equal(recovered.recovered,true);assert.equal(recovered.save.active?.id,'safe');assert.equal(storage.getItem(storageKey('a')),'broken');
});

// Real keeper contact must turn an incoming shot away from goal in Cup mode.
test('Cup glove blocks parry power shots; a ball outside the reach still scores',async()=>{
 await initializePhysics();
 for(const miss of [false,true]){const s=new ShootoutSimulation('keeping',6,22,{responsiveKeeping:true});
 try{while(s.phase!=='flight')s.step(emptyInput());const hand=s.keeperPose().leftHand;
 s.ball.setTranslation({x:miss?3.2:hand.x,y:hand.y,z:hand.z+.6},true);s.ball.setLinvel({x:0,y:0,z:-28},true);finish(s);
 assert.equal(s.result?.outcome,miss?'goal':'saved');assert.equal(s.result?.contacts.includes('keeper'),!miss);
 if(!miss)assert.ok(s.result?.contactFacts?.some(f=>f.bodyPart.startsWith('hand')));
 }finally{s.dispose();}}
});
test('Cup AI reacts to a central shot with a centre block and saves it through contact',async()=>{
 await initializePhysics();const s=new ShootoutSimulation('shooting',6,2,{responsiveKeeping:true});
 try{advance(s,.43,{...emptyInput(),shoot:true});s.step(emptyInput());finish(s);assert.equal(s.result?.outcome,'saved');assert.equal(s.frame().keeper.direction,0);assert.ok(s.result?.contactFacts?.length);}
 finally{s.dispose();}
});
test('Cup player dives save actual seeded shots on either side and retain replay poses',async()=>{
 await initializePhysics();for(const [seed,x] of [[1,1],[7,-1]] as const){const s=new ShootoutSimulation('keeping',6,seed,{responsiveKeeping:true});
 try{s.step({...emptyInput(),dive:{x,y:-.3}});finish(s);assert.equal(s.result?.outcome,'saved');assert.ok(s.result?.contacts.includes('keeper'));const first=structuredClone(s.frames[0]);s.replay();assert.deepEqual(s.frame(),first);}
 finally{s.dispose();}}
});
