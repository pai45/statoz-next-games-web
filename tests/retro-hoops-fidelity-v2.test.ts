import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createMatch,step,NO_INPUT,HZ,anchor} from '../src/features/games/retro-hoops/simulation';
import {readArchive} from '../src/features/games/retro-hoops/persistence';
import {poseFor} from '../src/features/games/retro-hoops/presentation';
import {CHARACTER_PACK} from '../src/features/games/retro-hoops/character-pack';
const free=()=>{const s=createMatch(1,false,{periods:1});s.actors.slice(1).forEach((a,i)=>{a.x=400+i*65;a.y=i%2?180:310;a.nextAI=999999;});return s;};
test('source profile removes the unsupported possession expiry without removing match expiry',()=>{
 const s=free();assert.equal(s.remaining,120*HZ);s.shotClock=1;step(s);assert.equal(s.phase,'playing');assert.equal(s.shotClock,1);s.remaining=1;step(s);assert.equal(s.phase,'result');
});
test('opening tip has a free visible ball, frozen clock and one authoritative winner',()=>{
 const s=createMatch(2,false,{opening:true});const time=s.remaining;
 for(let i=0;i<89;i++){step(s,{...NO_INPUT,shoot:true});assert.equal(s.remaining,time);assert.equal(s.ball.owner,null);assert.equal(s.phase,'opening');}
 step(s);assert.equal(s.phase,'playing');assert.equal(s.ball.owner,0);assert.equal(s.buffer,null);assert.ok(s.events.some(e=>e.type==='tip'));
});
test('two-period format resolves interval once and preserves score without emitting a final result',()=>{
 const s=createMatch(1,false,{periods:2});s.score=[6,4];s.remaining=1;step(s);assert.equal(s.phase,'interval');assert.ok(!s.events.some(e=>e.type==='result'));
 for(let i=0;i<120;i++)step(s);assert.equal(s.period,2);assert.equal(s.remaining,120*HZ);assert.equal(s.buzzer,false);assert.deepEqual(s.score,[6,4]);
 s.remaining=1;step(s);assert.equal(s.phase,'result');
});
test('second A during shot preparation fakes without releasing or consuming super',()=>{
 const s=free();s.charge[0]=100;step(s,{...NO_INPUT,shoot:true});for(let i=0;i<4;i++)step(s);step(s,{...NO_INPUT,shoot:true});assert.equal(s.actors[0].action,'fake');assert.equal(s.buffer,null);assert.ok(s.events.some(e=>e.type==='fake'));
 for(let i=0;i<80;i++)step(s);assert.equal(s.shotId,0);assert.equal(s.ball.owner,0);assert.equal(s.charge[0],100);assert.equal(s.actors[0].action,'idle');
});
test('dunk fake preserves vertical flight then lands without a score or duplicate jump',()=>{
 const s=free(),a=s.actors[0];a.x=770;a.y=247;Object.assign(s.ball,anchor(a));s.charge[0]=100;step(s,{...NO_INPUT,shoot:true});for(let i=0;i<9;i++)step(s);assert.ok(a.z>0);step(s,{...NO_INPUT,shoot:true});assert.equal(a.action,'fake');
 let jumps=0;for(let i=0;i<100;i++){step(s);jumps+=s.events.filter(e=>e.type==='jump').length;}assert.equal(jumps,0);assert.equal(a.z,0);assert.equal(s.score[0],0);assert.equal(s.charge[0],100);assert.equal(s.ball.owner,0);
});
test('old saves migrate settings without replacing historical results',()=>{
 const old={version:1,settings:{sfx:true,music:false,controlScale:99,gameSeconds:123,leftHanded:'yes'},results:[{id:'old',seed:1,score:[2,4],completedAt:'2026-10-20',rulesVersion:'1.7.0'}]};
 const a=readArchive({getItem:()=>JSON.stringify(old)});assert.equal(a.settings.controlScale,1.2);assert.equal(a.settings.gameSeconds,120);assert.equal(a.settings.leftHanded,false);assert.equal(a.settings.scanlines,false);assert.equal(a.results[0].rulesVersion,'1.7.0');
});
test('authored pack covers selected and off-ball actions, directions and depths without loading reference rasters',()=>{
 const m=JSON.parse(fs.readFileSync(`public/games/retro-hoops/${CHARACTER_PACK.folder}/manifest.json`,'utf8'));
 assert.equal(m.classification,'original authored pixel geometry; no reference rasters');
 const code=fs.readFileSync('scripts/build-retro-hoops-authored.py','utf8');assert.doesNotMatch(code,/Image\.open\(/);assert.ok(m.frames.length>1000);
 for(const team of [0,1]as const)for(const face of [-1,1]as const)for(const y of [180,247,310])for(const action of ['idle','shoot','pass','dunk','block','steal','recoil','receive','gather','fake']as const){
  const s=createMatch(),a=s.actors[team===0?0:3];a.face=face;a.y=y;a.action=action;s.ball.owner=a.id;s.tick=22;a.started=0;assert.ok(m.regions[poseFor(s,a)],poseFor(s,a));
 }
 for(const view of ['front','back'])assert.ok(m.regions['navy-run-01-'+view+'-source']);
});
test('ten deterministic full-match seeds terminate with one score stream and finite actors',()=>{
 for(let seed=10;seed<20;seed++){const s=createMatch(seed,true,{opening:true});let count=0,last=0;
  for(let i=0;i<15000&&s.phase!=='result';i++){step(s);for(const e of s.events){assert.ok(e.id>last);last=e.id;if(e.type==='score'){count++;assert.ok(e.value===2||e.value===3);}}assert.ok(s.actors.every(a=>Number.isFinite(a.x+a.y+a.z)&&a.z>=0));assert.ok(s.ball.owner===null||s.actors[s.ball.owner]);}
  assert.equal(s.phase,'result',String(seed));assert.ok(count>0);const score=[...s.score];step(s);assert.deepEqual(s.score,score);
 }
});

test('authored basket rim centres share the simulation scoring anchor in both directions',async()=>{
 const {BASKET_ART,courtPoint}=await import('../src/features/games/retro-hoops/view');
 for(const [key,x]of [['left',85],['right',815]]as const){const ground=courtPoint(x,247),rim=courtPoint(x,247,120),art=BASKET_ART[key];const top={x:ground.x-art.rimX*ground.scale,y:ground.y-(120+art.rimY)*ground.scale};assert.equal(top.x+art.rimX*ground.scale,rim.x);assert.ok(Math.abs(top.y+art.rimY*ground.scale-rim.y)<1e-10);}
});

test('directional dribble arms use the same view and shoulder as their body layer',()=>{
 const m=JSON.parse(fs.readFileSync(`public/games/retro-hoops/${CHARACTER_PACK.folder}/manifest.json`,'utf8'));
 const byKey=new Map(m.frames.map((f:{key:string;anchors:{shoulders?:number[][];shoulder?:number[]}})=>[f.key,f.anchors]));
 for(const view of ['front','back'])for(const team of ['navy','amber'])for(const face of ['source','mirrored']){
  const body=byKey.get(`${team}-dribble-body-00-${view}-${face}`) as {shoulders:number[][]};
  const arm=byKey.get(`${team}-dribble-arm-00-${view}-${face}`) as {shoulder:number[]};
  assert.deepEqual(arm.shoulder,body.shoulders[0]);
 }
});
test('ready stance knees bend away from the centre rather than crossing between ankles',()=>{
 const m=JSON.parse(fs.readFileSync(`public/games/retro-hoops/${CHARACTER_PACK.folder}/manifest.json`,'utf8'));
 for(const view of ['','-front','-back'])for(const team of ['navy','amber']){
  const frame=m.frames.find((f:{key:string})=>f.key===`${team}-neutral-a${view}-source`);
  assert.ok(frame.anchors.knees[0][0]<72);assert.ok(frame.anchors.knees[1][0]>72);
  assert.deepEqual(frame.anchors.feet,[72,116]);
 }
});
