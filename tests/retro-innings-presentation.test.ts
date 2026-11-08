import {test}from'node:test';
import assert from'node:assert/strict';
import {deliveryLandingMarker}from'../src/features/games/retro-innings/runtime/cricket-delivery-cue';
import {runningPose}from'../src/features/games/retro-innings/runtime/cricket-motion';
import {createCricketSimulation}from'../src/features/games/retro-innings/runtime/simulation.mjs';
import fs from'node:fs';
const data=JSON.parse(fs.readFileSync('src/features/games/retro-innings/runtime/assets.json','utf8')).runtime;

test('Each delivery marker coincides with the actual simulation ground bounce, pace/spin/wide',()=>{
 for(const lane of ['leg','off','defend','wide'])for(const style of ['pace','spin']){
  const sim=createCricketSimulation(data);sim.primary();Object.assign(sim.state,{innings:2,first:998,target:999});sim.settings.line=lane;sim.settings.style=style;
  // Start a fresh delivery through the engine, then use the ordinary release action.
  sim.state.phase='dead';sim.beginDelivery();const planned=deliveryLandingMarker(sim.state,data.families);assert.ok(planned);
  sim.release();const released=deliveryLandingMarker(sim.state,data.families);assert.ok(released);assert.deepEqual(released.point,planned.point);
  sim.advance(sim.state.plan.duration*.67);
  // Inspect the authoritative ball at ground contact; the existing event can be
  // emitted one step later because its threshold lacks a floating-point epsilon.
  const actual=sim.state.ball;assert.ok(actual);
  assert.ok(Math.abs(actual.x-released.point.x)<1e-6);assert.ok(Math.abs(actual.y-released.point.y)<1e-6);assert.ok(Math.abs(actual.z)<1e-6);
 }
});

test('Marker follows world projection, persists at ground contact and never follows airborne height',()=>{
 const s={status:'playing',phase:'delivery',plan:{lane:'leg',x:422,deliveryBounced:false},ball:{hit:false},camera:{x:305,y:275}};
 const a=deliveryLandingMarker(s,data.families)!;s.camera={x:288,y:260};s.plan.deliveryBounced=true;const b=deliveryLandingMarker(s,data.families)!;
 assert.deepEqual(a.point,b.point);assert.equal(b.screen.x-a.screen.x,17);assert.equal(b.screen.y-a.screen.y,15);assert.equal(b.stage,'bounced');
});

test('Marker is absent after hit, receiving, dead ball, result and before a delivery exists',()=>{
 const base={status:'playing',phase:'delivery',plan:{lane:'off'},ball:{hit:false},camera:{x:0,y:0}};
 for(const s of [{...base,ball:{hit:true}},{...base,phase:'keeper'},{...base,phase:'field'},{...base,phase:'dead'},{...base,status:'result'},{...base,plan:null}])assert.equal(deliveryLandingMarker(s,data.families),null);
});

test('Runner cadence depends on world travel, not path percentage or wall time; stops when idle',()=>{
 const state=(length:number,p:number)=>({time:0,run:{moving:true,p,from:[{id:0,x:0,y:0}],to:[{id:0,x:0,y:length}]}});
 const short=state(80,.5),long=state(160,.25);assert.equal(runningPose(short,{id:0}),runningPose(long,{id:0}));
 const pose=runningPose(short,{id:0});short.time=9000;assert.equal(runningPose(short,{id:0}),pose);
 short.run.moving=false;assert.equal(runningPose(short,{id:0}),'runner-distant');
});
