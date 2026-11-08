import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCricketSimulation} from '../src/features/games/retro-innings/runtime/simulation.mjs';
const baseline=JSON.parse(fs.readFileSync('tests/retro-innings-crease-baseline.json','utf8'));
import {deliveryLandingMarker} from '../src/features/games/retro-innings/runtime/cricket-delivery-cue';
const data=JSON.parse(fs.readFileSync('src/features/games/retro-innings/runtime/assets.json','utf8')).runtime;

test('AI and player approaches never advance their ground anchor past the bowling crease',()=>{
 for(const innings of [1,2]){
  const sim=createCricketSimulation(data);sim.primary();sim.state.innings=innings;
  for(let frame=0;frame<240;frame++){
   const position=sim.bowlerPosition();assert.ok(position.y>=475);
   if(sim.state.phase==='runup')assert.equal(position.x,459);
   sim.advance(1000/120);
  }
 }
});

test('Manual early, normal and delayed releases all leave the observed raised hand without a position jump',()=>{
 const pose=data.actors['bowler-4'];
 for(const delay of [0,125,350,500,1000,1300]){
  const sim=createCricketSimulation(data);sim.primary();Object.assign(sim.state,{innings:2,first:998,target:999});
  sim.advance(delay);const before=sim.bowlerPosition();sim.release();
  assert.deepEqual(sim.bowlerPosition(),before);assert.ok(before.y>=475);
  const ball=sim.state.ball;assert.equal(ball.x,before.x+pose.anchors.release.x-pose.ground[0]);
  assert.equal(ball.y,before.y);assert.equal(ball.z,pose.ground[1]-pose.anchors.release.y);
  assert.deepEqual(sim.state.events.at(-1).point,sim.state.plan.releaseOrigin);
  assert.equal(sim.state.plan.illegal,delay>1100?'no-ball':null);
  assert.equal(sim.state.fielders[10].x,before.x);assert.equal(sim.state.fielders[10].y,before.y);
 }
});

test('All lanes/styles retain the accepted bounce point, post-bounce ball path and batting timing',()=>{
 for(const lane of ['leg','off','defend','wide'])for(const style of ['pace','spin']){
  const revised=createCricketSimulation(data),expected=baseline.find((item:{lane:string;style:string})=>item.lane===lane&&item.style===style);
  for(const sim of [revised]){
   sim.primary();Object.assign(sim.state,{innings:2,first:998,target:999});
   sim.settings.line=lane;sim.settings.style=style;sim.state.phase='dead';sim.beginDelivery();sim.advance(350);sim.release();
  }
  assert.equal(revised.state.plan.duration,expected.duration);assert.equal(revised.state.plan.aiAt,expected.aiAt+200-revised.strokeTiming(lane==='wide'?'off':lane).leadMs);
  for(const fraction of [.67,.7,.8,.95,1,1.02]){
   const a=revised.incomingAt(revised.state.plan.duration*fraction),b=expected.path.find((item:{fraction:number})=>item.fraction===fraction).point;
   for(const axis of ['x','y','z'] as const)assert.ok(Math.abs(a[axis]-b[axis])<1e-8,`${lane}/${style}/${fraction}/${axis}`);
  }
  const bounce=revised.incomingAt(revised.state.plan.duration*.67),cue=deliveryLandingMarker(revised.state,data.families)!;
  for(const axis of ['x','y','z'] as const)assert.ok(Math.abs(bounce[axis]-cue.point[axis])<1e-8);
 }
});

test('First-innings leg batting still contacts through the same public timing',()=>{
 const sim=createCricketSimulation(data);sim.primary();sim.advance(1200);sim.strike('leg');sim.advance(500);
 assert.ok(sim.state.contact);assert.equal(sim.state.contact.family,'leg');
});
