import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {at,DIFFICULTIES,drivableLane,emptyInput,LAUNCH_WINDOW,lineAt,newRace,profileFor,ROAD_HALF,STEP,step,TRACK_LENGTH,type Difficulty,type RaceEvent} from '../src/features/games/racer/engine';

const countdown=(r:ReturnType<typeof newRace>,gasFrom:number|null)=>{while(r.countdown>0){step(r,{...emptyInput(),gas:gasFrom!==null&&r.countdown<=gasFrom},STEP);}};

test('Gas on the fifth start light gives a perfect launch; holding it earlier gives wheelspin',()=>{
 const perfect=newRace();countdown(perfect,LAUNCH_WINDOW-.05);assert.equal(perfect.launch,'perfect');assert.ok(perfect.player.speed>8);assert.equal(perfect.boost,90);
 assert.deepEqual(perfect.events.map(e=>e.type),['launch']);
 const early=newRace();countdown(early,2);assert.equal(early.launch,'jumped');assert.ok(early.wheelspin>0);
 const none=newRace();countdown(none,null);assert.equal(none.launch,'none');assert.equal(none.player.speed,0);
 // Wheelspin costs real acceleration compared with a clean, unassisted getaway.
 const clean=newRace();countdown(clean,null);for(const r of [early,clean]){r.opponents=[];for(let i=0;i<60;i++)step(r,{...emptyInput(),gas:true},STEP);}
 assert.ok(early.player.speed<clean.player.speed-2,`${early.player.speed} vs ${clean.player.speed}`);
});

test('Overtakes reward boost only for new ground, so swapping places cannot farm it',()=>{
 const r=newRace();r.countdown=0;r.time=3;const events:RaceEvent[]=[];
 // Put the player just ahead of the last CPU: one new best position.
 const last=r.opponents.at(-1)!;Object.assign(r.player,at(last.progress+6,0),{progress:last.progress+6,validatedProgress:last.progress+6,nextGate:last.nextGate,waypointsPassed:last.waypointsPassed});
 const before=r.boost;step(r,emptyInput(),STEP);events.push(...r.events.splice(0));
 const gained=events.find(e=>e.type==='position');assert.ok(gained&&gained.type==='position'&&gained.gained>0&&gained.reward>0);assert.ok(r.boost>before);
 // Drop back and regain the same place: no second reward.
 Object.assign(r.player,at(last.progress-6,0),{progress:last.progress-6,validatedProgress:last.progress-6});step(r,emptyInput(),STEP);
 const boost=r.boost;Object.assign(r.player,at(last.progress+6,0),{progress:last.progress+6,validatedProgress:last.progress+6});step(r,emptyInput(),STEP);
 const again=r.events.filter(e=>e.type==='position').at(-1);assert.ok(again&&again.type==='position'&&again.reward===0);assert.ok(r.boost<=boost+1);
});

test('The racing line stays on the tarmac and never cuts inside a hairpin',()=>{
 for(let d=0;d<TRACK_LENGTH;d+=1){const lane=lineAt(d);assert.ok(Math.abs(lane)<=5.4+1e-9&&Math.abs(lane)<ROAD_HALF-1.5,`line ${lane} at ${d}`);if(d%2===0)assert.ok(Math.abs(drivableLane(d,lane)-lane)<1e-9,`line exceeds the drivable radius at ${d}`);}
 assert.ok(Math.max(...Array.from({length:200},(_,i)=>Math.abs(lineAt(i*10))))>3,'The line must actually use the track width');
});

test('CPU character is fixed per slot and difficulty, and faster drivers start nearer the front',()=>{
 assert.deepEqual(profileFor(3,'pro'),profileFor(3,'pro'));
 for(const d of Object.keys(DIFFICULTIES) as Difficulty[])assert.ok(profileFor(0,d).pace>profileFor(18,d).pace);
 assert.ok(profileFor(5,'rookie').pace<profileFor(5,'pro').pace&&profileFor(5,'pro').pace<profileFor(5,'elite').pace);
 assert.equal(newRace().difficulty,'pro');assert.equal(newRace('#fff',{difficulty:'elite',chassis:'race-future'}).player.chassis,'race-future');
});

test('Rival skill changes CPU race pace: Rookie fields finish clearly behind Elite fields',()=>{
 const median=(difficulty:Difficulty)=>{
  const r=newRace('#fff',{difficulty});r.countdown=0;Object.assign(r.player,at(-82,12),{lane:12});
  for(let i=0;i<36000&&!r.opponents.every(c=>c.finishTime!==null);i++)step(r,{...emptyInput(),brake:true},STEP);
  assert.ok(r.opponents.every(c=>c.finishTime!==null),difficulty+' field must finish');
  return r.opponents.map(c=>c.finishTime!).sort((a,b)=>a-b)[9];
 };
 const rookie=median('rookie'),elite=median('elite');assert.ok(rookie>elite+6,`rookie ${rookie} elite ${elite}`);
});

test('CPUs never steer into a car alongside on the grid launch',()=>{
 const r=newRace();while(r.countdown>0)step(r,emptyInput(),STEP);
 let stalled=0;for(let i=0;i<Math.round(3/STEP);i++){step(r,{...emptyInput(),gas:true},STEP);if(i>120&&r.opponents.slice(0,6).some(c=>c.speed<1))stalled++;}
 assert.equal(stalled,0,'Front-row CPUs must not be blocked by their neighbour');
});

test('Racer runtime art and sound are Kenney CC0 files pinned by hash',()=>{
 const provenance=JSON.parse(readFileSync('public/games/f1-racing/kenney/PROVENANCE.json','utf8'));
 assert.equal(provenance.license,'CC0-1.0');assert.ok(provenance.sources.every((s:{page:string})=>/opengameart\.org\/content|github\.com\/KenneyNL/.test(s.page)));
 for(const file of provenance.files)assert.equal(createHash('sha256').update(readFileSync('public/games/f1-racing/kenney/'+file.file)).digest('hex'),file.sha256,file.file);
 const renderer=readFileSync('src/features/games/racer/renderer.ts','utf8');assert.ok(!renderer.includes('assets.json'),'Recovered reference meshes must not be loaded at runtime');assert.ok(renderer.includes('racer-kit.glb'));
});

import {angle as wrapAngle,CAR_HALF_WIDTH,pedalSpeed,project,WALL_SAMPLES,WALL_STEP,wallKind,wallLane,walls} from '../src/features/games/racer/engine';

test('Barriers enclose the circuit and never sit on any tarmac',()=>{
 for(const side of [-1,1])for(let i=0;i<WALL_SAMPLES;i++){
  const d=i*WALL_STEP,lane=wallLane(d,side);if(wallKind(d,side)==='none')continue;
  const p=at(d,side*lane),q=project(p.x,p.z);assert.ok(Math.abs(q.lane)>ROAD_HALF+.9,`barrier on tarmac at ${d} side ${side}`);assert.ok(lane>=9.6&&lane<=22);
 }
 const kinds=new Set([...walls.left.kind,...walls.right.kind]);for(const k of ['rail','tyres','concrete'])assert.ok(kinds.has(k as never),k);
 const open=[...walls.left.kind,...walls.right.kind].filter(k=>k==='none').length;assert.ok(open<60,'Only hairpin apex islands may be open: '+open);
});

const aimAtWall=(d:number,side:number,speed:number,angleIn:number)=>{
 const r=newRace();r.countdown=0;r.opponents=[];const lane=side*(wallLane(d,side)-CAR_HALF_WIDTH-3),p=at(d,lane);
 Object.assign(r.player,p,{progress:d,lane,speed,heading:wrapAngle(p.heading-side*angleIn),nextGate:Math.ceil(d/24)*24,validatedProgress:d});r.lastDistance=d;return r;
};
test('A hard barrier hit stops at the wall, scrubs speed, spins the car out and damages it',()=>{
 const r=aimAtWall(470,1,44,.9);let maxLane=0;const events:RaceEvent[]=[];
 for(let i=0;i<120;i++){step(r,{...emptyInput(),gas:true},STEP);events.push(...r.events.splice(0));maxLane=Math.max(maxLane,Math.abs(r.player.lane));}
 assert.ok(maxLane<=wallLane(470,1)-CAR_HALF_WIDTH+.05,`car passed the barrier: ${maxLane}`);
 const hit=events.find(e=>e.type==='impact');assert.ok(hit&&hit.type==='impact'&&hit.kind==='wall'&&hit.heavy&&hit.car===0);
 assert.ok(r.player.speed<30,`speed after hit ${r.player.speed}`);assert.ok(r.player.damage>10);assert.ok(r.hits>=1);
 const spun=aimAtWall(470,1,44,.9);let spinning=false;for(let i=0;i<20;i++){step(spun,{...emptyInput(),gas:true},STEP);if(spun.player.spin>0)spinning=true;}assert.ok(spinning,'a hard hit spins the car');
});
test('A glancing barrier scrape keeps most of the speed and turns the car parallel',()=>{
 // The guardrail sits beyond the grass verge, so measure speed just before and after first contact.
 const r=aimAtWall(470,-1,40,.12);let before=0,after=0;for(let i=0;i<180;i++){const speed=r.player.speed;step(r,{...emptyInput(),gas:true},STEP);if(r.player.scrape>0&&!before){before=speed;after=r.player.speed;}}
 assert.ok(before>0,'the car must reach the barrier');assert.equal(r.player.spin,0);assert.ok(after>before*.9,`scrape ${before} -> ${after}`);
 assert.ok(Math.abs(wrapAngle(r.player.heading-at(r.player.progress).heading))<.12,'car aligned with the barrier');
});
test('Side-by-side contact separates the cars and transfers sideways momentum',()=>{
 const r=newRace();r.countdown=0;r.time=5;const d=470,a=at(d,-1),b=at(d+.5,.9);
 const rival={...r.opponents[0],...b,progress:d+.5,lane:.9,speed:30,sideVelocity:0,heading:b.heading,nextGate:Math.ceil(d/24)*24,lastGate:-1};
 r.opponents=[rival];Object.assign(r.player,a,{progress:d,lane:-1,speed:30,sideVelocity:6,heading:a.heading,nextGate:Math.ceil(d/24)*24});
 for(let i=0;i<6;i++)step(r,{...emptyInput(),gas:true},STEP);
 const gap=Math.abs(project(r.player.x,r.player.z).lane-project(rival.x,rival.z).lane);
 assert.ok(gap>1.9,`cars still overlap: ${gap}`);assert.ok(rival.sideVelocity>0.5,'rival is pushed sideways');assert.ok(r.player.sideVelocity<6,'player loses sideways speed');
 assert.ok(r.events.some(e=>e.type==='impact'&&e.kind==='car'));
});
test('Damage costs top speed',()=>{
 let fresh=0,damaged=0;for(let i=0;i<3000;i++){fresh=pedalSpeed(fresh,{...emptyInput(),gas:true},STEP,false,false,false,0,1,1);damaged=pedalSpeed(damaged,{...emptyInput(),gas:true},STEP,false,false,false,0,1,1-80*.0008);}
 assert.ok(damaged<fresh-2.5,`${damaged} vs ${fresh}`);
});
