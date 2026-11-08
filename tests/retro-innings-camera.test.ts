import fs from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCricketSimulation} from '../src/features/games/retro-innings/runtime/simulation.mjs';

const data=JSON.parse(fs.readFileSync('src/features/games/retro-innings/runtime/assets.json','utf8')).runtime;

test('field camera holds the selected fielder near centre while a return travels across the frame',()=>{
 const game=createCricketSimulation(data);
 game.primary();
 game.advance(500);
 game.advance(game.state.plan.duration-game.strokeTiming('leg').leadMs-150);
 game.nesShot('ground');
 for(let i=0;i<150;i++){
  game.advance(20);
  const s=game.state,f=s.fielders[s.selected];
  if(s.phase!=='field'||!s.ball||s.ball.x-f.x<70)continue;
  const screenFielder={x:f.x-s.camera.x,y:f.y-s.camera.y};
  const screenBall={x:s.ball.x-s.camera.x,y:s.ball.y-s.ball.z-s.camera.y};
  assert.ok(Math.abs(screenFielder.x-124)<30,`selected x ${screenFielder.x}`);
  assert.ok(Math.abs(screenFielder.y-105)<30,`selected y ${screenFielder.y}`);
  assert.ok(screenBall.x>=8&&screenBall.x<=248,`ball x ${screenBall.x}`);
  assert.ok(screenBall.y>=8&&screenBall.y<=216,`ball y ${screenBall.y}`);
  assert.ok(s.events.some((e:{type:string})=>e.type==='camera-handoff'));
  return;
 }
 assert.fail('expected a live cross-field return');
});
