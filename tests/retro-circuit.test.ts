import {drive} from '../src/features/games/retro-circuit/driver';
import {test} from "node:test";
import assert from "node:assert/strict";
import {RaceSimulation} from "../src/features/games/retro-circuit/simulation";
import {tracks, vehicles,roadsideProp,propSpacing} from "../src/features/games/retro-circuit/data";
import {neutralInput, type RuntimeOptions} from "../src/features/games/retro-circuit/types";
import {defaultSave,addResult,readSave,raceScore,localRecords} from "../src/features/games/retro-circuit/persistence";
import {roadProjection,projectedCar,cameraDistance} from "../src/features/games/retro-circuit/projection";

const options:RuntimeOptions={trackId:"coast",vehicleId:"vector",seed:42,sessionId:"test"};
function racing(opts=options){const g=new RaceSimulation(opts);g.start();for(let i=0;i<181;i++)g.update(neutralInput());return g;}
/** Actual public-input driver: no direct position/fuel manipulation in complete-race coverage. */
const driver=drive;
test("seeded races reproduce the same simulation with identical public inputs",()=>{
 const a=racing(),b=racing();for(let i=0;i<1800;i++){const input=driver(a);a.update(input);b.update(input);}assert.deepEqual(a.snapshot(),b.snapshot());
});
test("pause freezes time and resources; recovery cannot award progress",()=>{
 const g=racing();for(let i=0;i<300;i++)g.update({...neutralInput(),throttle:true});g.pause();const before=structuredClone(g.snapshot());for(let i=0;i<120;i++)g.update(neutralInput());assert.deepEqual(g.snapshot(),before);g.recover();assert.equal(g.cars[0].distance,before.player.distance);assert.equal(g.cars[0].checkpoint,before.player.checkpoint);g.resume();assert.equal(g.phase,"racing");
});
test("nitro is edge triggered and cannot replenish at a pit stop",()=>{
 const g=racing(),input={...neutralInput(),throttle:true,nitro:true};for(let i=0;i<240;i++)g.update(input);assert.equal(g.cars[0].nitro,2);for(let n=0;n<3;n++){g.update({...input,nitro:false});g.update(input);}assert.equal(g.cars[0].nitro,0);
});
test("all twelve combinations finish through actual steering, pedal and pit inputs",()=>{
 const results=[];
 for(const track of tracks)for(const vehicle of vehicles){const g=racing({...options,trackId:track.id,vehicleId:vehicle.id});for(let i=0;i<60*300&&g.phase==="racing";i++)g.update(driver(g));const s=g.snapshot();results.push({track:track.id,car:vehicle.id,time:s.elapsed,pits:s.player.pitStops,phase:s.phase,fuel:s.player.fuel,x:s.player.x,s:s.player.distance});assert.equal(s.phase,"finished",JSON.stringify(results.at(-1)));assert.equal(s.player.lapTimes.length,3);assert.ok(s.player.pitStops>=1);assert.ok(s.elapsed>=120&&s.elapsed<=240,JSON.stringify(results.at(-1)));assert.equal(s.result?.fieldSize,20);assert.ok(s.result!.position>=1&&s.result!.position<=20);}
 console.log(JSON.stringify(results));
});
test("running dry coasts to a single DNF event; terminal state cannot advance",()=>{
 const g=racing();g.cars[0].fuel=.001;g.cars[0].speed=3;for(let i=0;i<120;i++)g.update(neutralInput());assert.equal(g.phase,"dnf");assert.equal(g.drainEvents().filter(e=>e.type==="dnf").length,1);const time=g.elapsed;g.update({...neutralInput(),throttle:true});assert.equal(g.elapsed,time);
});
test("pit entry enforces low speed and permits a partial-fill departure",()=>{
 const g=racing(),p=g.cars[0];p.distance=g.track.pit.start+60;p.x=1.2;p.speed=40;g.update({...neutralInput(),brake:true});assert.equal(p.inPit,false);p.speed=10;g.update({...neutralInput(),brake:true});assert.equal(p.inPit,true);for(let i=0;i<90;i++)g.update({...neutralInput(),brake:true});const fuel=p.fuel;assert.ok(fuel>66&&fuel<100);g.update({...neutralInput(),throttle:true});assert.equal(p.inPit,false);assert.equal(p.pitStops,1);
});
test("an AI reaches the pit from the road and leaves with fuel",()=>{
 const g=racing(),ai=g.cars[1];ai.distance=322;ai.x=.32;ai.speed=40;ai.fuel=28;
 for(let i=0;i<1800;i++)g.update(neutralInput());assert.ok(ai.pitStops>=1);assert.equal(ai.inPit,false);assert.ok(ai.speed>10);assert.ok(ai.fuel>60);
});
test("best times survive bounded history and unavailable/future saves remain safe",()=>{
 const save=defaultSave(),g=racing();g.phase="finished";g.cars[0].finishedAt=150;const first=g.snapshot().result!;addResult(save,first);for(let i=0;i<110;i++)addResult(save,{...first,sessionId:String(i),elapsed:200+i});assert.equal(save.results.length,100);assert.equal(save.bestTimes.coast,150);assert.equal(readSave({getItem:()=>JSON.stringify(save)}).save.bestTimes.coast,150);assert.equal(readSave({getItem:()=>'{"schemaVersion":2}'}).temporary,true);assert.equal(readSave({getItem(){throw Error('blocked');}}).temporary,true);
});
test("roadside objects keep their side across camera segments and laps; contact matches the visible side",()=>{
 const g=racing(),track=g.track,spacing=propSpacing(track),count=Math.round(track.length/spacing);
 for(let i=0;i<count;i++)assert.deepEqual(roadsideProp(track,i),roadsideProp(track,i+count));
 const prop=roadsideProp(track,1),p=g.cars[0];p.distance=spacing-1;p.x=prop.x;p.speed=80;g.update({...neutralInput(),throttle:true});assert.ok(p.collisionCooldown>0);assert.ok(g.drainEvents().some(e=>e.type==="collision"));
 const safe=racing();safe.cars[0].distance=spacing-1;safe.cars[0].x=-prop.x;safe.cars[0].speed=80;safe.update({...neutralInput(),throttle:true});assert.equal(safe.cars[0].collisionCooldown,0);
});
test("cars physically ahead project above the player; cars behind project below",()=>{
 const g=racing();g.cars[0].distance=500;const state=g.snapshot(),points=roadProjection(state,g.track);
 const ego=projectedCar(cameraDistance(500,500),0,points)!,ahead=projectedCar(cameraDistance(510,500),0,points)!,behind=projectedCar(cameraDistance(490,500),0,points)!;
 assert.ok(ahead.y<ego.y);assert.ok(behind.y>ego.y);assert.ok(ahead.scale<ego.scale);assert.ok(behind.scale>ego.scale);
});
test("coasting over the finish line takes precedence over empty-fuel DNF",()=>{
 const g=racing(),p=g.cars[0];g.elapsed=180;p.distance=g.track.length*3-.0005;p.speed=.22;p.fuel=0;p.checkpoint=11;p.lapTimes=[60,60];p.lapStart=120;
 g.drainEvents();g.update(neutralInput());assert.equal(g.phase,"finished");assert.equal(p.dnf,false);assert.equal(g.snapshot().result?.position,1);assert.equal(g.notice,"CHEQUERED FLAG");assert.ok(!g.drainEvents().some(e=>e.type==="dnf"));
});

function record(sessionId:string,elapsed=180,position=3){const g=racing();g.phase="finished";g.cars[0].finishedAt=elapsed;return {...g.snapshot().result!,sessionId,elapsed,position};}
test("old v1 history migrates into local records without changing settings or fastest times",()=>{
 const old={...defaultSave(),vehicleId:'comet',music:false,results:[record('old',181,2)],bestTimes:{coast:160}} as Record<string,unknown>;
 delete old.records;delete old.bestScore;const {save,temporary}=readSave({getItem:()=>JSON.stringify(old)});
 assert.equal(temporary,false);assert.equal(save.vehicleId,'comet');assert.equal(save.music,false);assert.equal(save.bestTimes.coast,160);assert.equal(localRecords(save,'coast')[0].sessionId,'old');assert.equal(save.bestScore?.sessionId,'old');
});
test("top ten records and all-time score survive pruning the last one hundred races",()=>{
 const save=defaultSave();const winner=record('winner',150,1);addResult(save,winner);
 for(let i=0;i<130;i++)addResult(save,record(`race-${i}`,210+i/100,20));
 assert.equal(save.results.length,100);assert.ok(!save.results.some(r=>r.sessionId==='winner'));assert.equal(save.records.length,10);assert.equal(save.bestScore?.sessionId,'winner');
 const loaded=readSave({getItem:()=>JSON.stringify(save)}).save;assert.equal(localRecords(loaded,'coast')[0].sessionId,'winner');assert.equal(raceScore(loaded.bestScore!),29000);
});
test("local ranking breaks equal scores by time and isolates the three circuits",()=>{
 const save=defaultSave();addResult(save,record('slower',180.009,3));addResult(save,record('faster',180.001,3));addResult(save,{...record('desert'),trackId:'desert'});
 assert.equal(raceScore(save.results[0]),raceScore(save.results[1]));assert.deepEqual(localRecords(save,'coast').map(r=>r.sessionId),['faster','slower']);assert.equal(localRecords(save,'desert').length,1);assert.equal(localRecords(save,'city').length,0);
});
test("DNFs, duplicate sessions and malformed persisted races cannot award records",()=>{
 const save=defaultSave(),finished=record('finish');addResult(save,finished);addResult(save,finished);const dnf={...record('dnf'),outcome:'dnf' as const};addResult(save,dnf);
 assert.equal(raceScore(dnf),0);assert.equal(save.results.length,2);assert.equal(save.records.length,1);
 const loaded=readSave({getItem:()=>JSON.stringify({...save,records:[null,{...finished,elapsed:NaN},finished],results:[{...finished,position:0},dnf]})}).save;
 assert.equal(loaded.results.length,1);assert.equal(loaded.records.length,1);assert.equal(loaded.bestScore?.sessionId,'finish');
});

test('v2 retains legacy settings and leaves old route records untouched',()=>{const old=JSON.stringify({...defaultSave(),vehicleId:'comet',autoThrottle:true,music:false,results:[record('legacy')]}),values=new Map([['statoz.games.web.retro-circuit:v1',old]]);const {save,temporary}=readSave({getItem:k=>values.get(k)??null});assert.equal(temporary,false);assert.equal(save.vehicleId,'comet');assert.equal(save.music,false);assert.equal(save.autoThrottle,true);assert.deepEqual(save.records,[]);assert.equal(values.get('statoz.games.web.retro-circuit:v1'),old);});
