import fs from 'node:fs';import {test} from 'node:test';import assert from 'node:assert/strict';
import {createCricketSimulation} from '../src/features/games/retro-innings/runtime/simulation.mjs';
const data=JSON.parse(fs.readFileSync('src/features/games/retro-innings/runtime/assets.json','utf8')).runtime;
const old=JSON.parse(fs.readFileSync('tests/retro-innings-batting-baseline.json','utf8')).runtime;
// Explicit unit fixtures choose a delivery/style, not a hit or scored outcome.
function setup(family:string,style='pace'){
 const s=createCricketSimulation(data);s.primary();s.state.phase='dead';s.state.deliveryNumber=['leg','off','defend'].indexOf(family);s.beginDelivery();s.state.plan.style=style;s.advance(500);return s;
}
test('All three complete source-derived sequences have explicit readable holds and unchanged visible/collision geometry',()=>{
 for(const name of ['leg','off','defend']){
  const f=data.families[name];assert.equal(f.poses.reduce((n:number,p:{durationMs:number})=>n+p.durationMs,0),f.durationMs);
  for(const p of f.poses){assert.ok(p.durationMs>=70);assert.ok(p.phase);assert.ok(p.endMs>p.startMs);const prior=old.poses[p.id];for(const key of ['atlas','origin','ground','cells','soleWorld','active'])assert.deepEqual(p[key],prior[key]);}
  assert.equal(f.timing.leadMs,(f.activeStartMs+f.activeEndMs)/2);assert.equal(f.timing.contactFreezeMs,40);
 }
 assert.ok(data.families.off.activeStartMs>data.families.leg.activeStartMs);assert.ok(data.families.defend.activeStartMs>data.families.leg.activeStartMs);
});
test('Three strokes, pace/spin and all modifier combinations hit visible blade once when prepared at their own timing',()=>{
 for(const name of ['leg','off','defend'])for(const style of ['pace','spin'])for(const loft of [false,true])for(const power of [false,true]){
  const s=setup(name,style),timing=s.strokeTiming(name);if(loft)s.held.loft.add('test');if(power)s.held.power.add('test');
  s.advance(s.state.plan.duration-(timing.leadMs+180));s.strike(name);assert.ok(s.state.strokeQueue);s.advance(2500);
  assert.ok(s.state.contact,`${name}/${style}/${loft}/${power}`);assert.equal(s.state.contact.family,name);assert.equal(s.state.contact.loft,loft);assert.equal(s.state.contact.power,power);
  assert.equal(s.state.events.filter((e:{type:string})=>e.type==='contact').length,1);assert.ok(s.state.contact.cells.length>0);assert.ok(s.state.contact.world.y>=347&&s.state.contact.world.y<=353);
 }
});
test('Wrong strokes and very early/late inputs do not manufacture contact',()=>{
 for(const name of ['leg','off','defend']){
  const early=setup(name);early.strike(name);early.advance(3000);assert.equal(early.state.contact,null);
  const late=setup(name);late.advance(late.state.plan.duration-20);late.strike(name);late.advance(2500);assert.equal(late.state.contact,null);
  for(const wrong of ['leg','off','defend'].filter(f=>f!==name)){
   const s=setup(name);s.advance(s.state.plan.duration-s.strokeTiming(wrong).leadMs-120);s.strike(wrong);s.advance(2500);assert.equal(s.state.contact,null,`${name}/${wrong}`);
  }
 }
});
test('Pause freezes preparation and contact hold; full recovery gates running and camera handoff',()=>{
 for(const name of ['leg','off','defend']){
  const s=setup(name),lead=s.strokeTiming(name).leadMs;s.advance(s.state.plan.duration-lead);s.strike(name);s.advance(20);
  const before=structuredClone(s.state);s.state.paused=true;s.advance(700);assert.equal(s.state.action.age,before.action.age);s.state.paused=false;
  for(let i=0;i<100&&!s.state.contact;i++)s.advance(5);assert.ok(s.state.contact);
  assert.equal(s.battingAction().phase,'contact-freeze');const frozenTime=s.state.time;s.advance(10);assert.equal(s.state.time,frozenTime);
  s.requestRun();assert.equal(s.state.run.departed,undefined);s.advance(3000);assert.ok(s.state.events.some((e:{type:string})=>e.type==='recovered'));
  const recovered=s.state.events.find((e:{type:string})=>e.type==='recovered'),run=s.state.events.find((e:{type:string})=>e.type==='run-start');if(run)assert.ok(run.time>=recovered.time);
 }
});
test('Fixed-step playback preserves actions and contact across different caller advance sizes',()=>{
 for(const name of ['leg','off','defend']){
  const run=(step:number)=>{const s=setup(name);s.advance(s.state.plan.duration-s.strokeTiming(name).leadMs-150);s.strike(name);for(let t=0;t<2100;t+=step)s.advance(step);return s;};
  const a=run(10),b=run(100);assert.equal(a.state.contact.pose,b.state.contact.pose);for(const axis of ['x','y','z'])assert.ok(Math.abs(a.state.contact.world[axis]-b.state.contact.world[axis])<1e-6);assert.equal(a.state.runs,b.state.runs);
 }
});
