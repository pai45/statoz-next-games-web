import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCricketSimulation} from '../src/features/games/retro-innings/runtime/simulation.mjs';
import {deliveryLandingMarker} from '../src/features/games/retro-innings/runtime/cricket-delivery-cue';

const data=JSON.parse(fs.readFileSync('src/features/games/retro-innings/runtime/assets.json','utf8')).runtime;

function bowling(){
 const s=createCricketSimulation(data);s.primary();
 Object.assign(s.state,{innings:2,first:19,target:20,phase:'ready'});
 return s;
}

test('bowling requires a direction selection before A fast or B slow',()=>{
 const s=bowling();
 assert.equal(s.nesBowl('A'),false);
 assert.equal(s.state.phase,'ready');
 assert.equal(s.state.events.some((e:{type:string;innings:number})=>e.type==='delivery-start'&&e.innings===2),false);
 assert.equal(s.selectBowlDirection('left'),true);
 assert.equal(s.state.bowlAim.name,'left');
 assert.equal(s.state.phase,'ready');
 assert.equal(s.nesBowl('A'),true);
 assert.equal(s.state.phase,'runup');
 assert.equal(s.state.bowlAim,null);
 assert.equal(s.state.plan.nesIntent.speed,'fast');
 s.advance(500);
 assert.equal(s.state.phase,'delivery');
 assert.equal(s.state.plan.duration,1100);
});

test('selected direction persists after D-pad release and can be changed before delivery',()=>{
 for(const name of ['left','right','up','down']){
  const s=bowling();s.held[name].add('key');s.selectBowlDirection(name);s.held[name].clear();
  const expected={...s.state.bowlAim.landing};
  assert.equal(s.nesBowl('B'),true);
  assert.deepEqual(s.state.plan.landing,expected);
  assert.deepEqual(s.state.plan.nesIntent.selected,name);
  s.advance(500);
  assert.equal(s.state.plan.duration,1400);
  assert.deepEqual(deliveryLandingMarker(s.state,data.families)!.point,expected);
  s.advance(s.state.plan.duration*.67);
  for(const axis of ['x','y','z'] as const)assert.ok(Math.abs(s.state.ball[axis]-expected[axis])<1e-6,`${name}/${axis}`);
 }
 const changed=bowling();changed.selectBowlDirection('left');changed.selectBowlDirection('right');
 assert.equal(changed.state.bowlAim.name,'right');changed.nesBowl('A');
 assert.equal(changed.state.plan.nesIntent.selected,'right');
});

test('a placed pitch point is clamped, visible in state, and used by both speeds',()=>{
 for(const button of ['A','B'] as const){
  const s=bowling();
  assert.equal(s.placeBowlPoint(444,390),true);
  assert.deepEqual(s.state.bowlAim.landing,{x:444,y:390,z:0});
  assert.equal(s.state.phase,'ready');
  assert.equal(s.nesBowl(button),true);
  assert.equal(s.state.plan.nesIntent.speed,button==='A'?'fast':'slow');
  assert.deepEqual(s.state.plan.landing,{x:444,y:390,z:0});
  s.advance(500);
  s.advance(s.state.plan.duration*.67);
  for(const axis of ['x','y','z'] as const)assert.ok(Math.abs(s.state.ball[axis]-s.state.plan.landing[axis])<1e-6,`${button}/${axis}`);
 }
 const edge=bowling();
 assert.equal(edge.placeBowlPoint(-100,999),true);
 assert.deepEqual(edge.state.bowlAim.landing,{x:408,y:416,z:0});
 assert.equal(edge.placeBowlPoint(NaN,390),false);
 assert.deepEqual(edge.state.bowlAim.landing,{x:408,y:416,z:0});
});

test('bowling selection is phase gated, pause safe and reset for the next ball',()=>{
 const s=bowling();s.state.paused=true;
 assert.equal(s.selectBowlDirection('up'),false);
 assert.equal(s.placeBowlPoint(432,397),false);
 s.state.paused=false;
 assert.equal(s.selectBowlDirection('up'),true);
 const before=structuredClone(s.state.bowlAim);s.advance(100);
 assert.deepEqual(s.state.bowlAim,before);
 assert.equal(s.nesBowl('A'),true);
 assert.equal(s.selectBowlDirection('down'),false);
 assert.equal(s.placeBowlPoint(432,397),false);
 s.state.phase='dead';
 assert.equal(s.nesBowl('A'),false);
 assert.equal(s.selectBowlDirection('down'),true);
 assert.equal(s.nesBowl('B'),true);
 const bat=createCricketSimulation(data);bat.primary();
 assert.equal(bat.selectBowlDirection('left'),false);
});

test('ground/air batting remains independent from bowling selection',()=>{
 function contact(kind:'ground'|'air',direction:'left'|'right'){
  const s=createCricketSimulation(data);s.primary();s.advance(500);
  s.advance(s.state.plan.duration-s.strokeTiming('leg').leadMs-150);
  s.held[direction].add('test');s.nesShot(kind);
  for(let i=0;i<300&&!s.state.contact;i++)s.advance(5);
  assert.ok(s.state.contact);assert.equal(s.state.contact.family,'leg');return s;
 }
 assert.ok(contact('ground','left').state.ball.vx<0);
 assert.ok(contact('ground','right').state.ball.vx>0);
 assert.ok(contact('air','right').state.ball.vz>contact('ground','right').state.ball.vz);
});
