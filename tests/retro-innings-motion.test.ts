import fs from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCricketSimulation} from '../src/features/games/retro-innings/runtime/simulation.mjs';
import {bowlingPose} from '../src/features/games/retro-innings/runtime/cricket-motion';

const data=JSON.parse(fs.readFileSync('src/features/games/retro-innings/runtime/assets.json','utf8')).runtime;

test('bowler uses each preparation pose once before release',()=>{
 for(const [age,id] of [[0,'bowler-0'],[124,'bowler-0'],[125,'bowler-1'],[249,'bowler-1'],[250,'bowler-2'],[374,'bowler-2'],[375,'bowler-3'],[499,'bowler-3']] as const){
  const sim=createCricketSimulation(data);sim.primary();sim.advance(age);
  assert.equal(sim.state.phase,'runup');assert.equal(bowlingPose(sim.state),id,`run-up ${age}ms`);
 }
});

test('bowler release, follow-through and recovery remain ordered',()=>{
 for(const [age,id] of [[0,'bowler-4'],[89,'bowler-4'],[90,'bowler-5'],[219,'bowler-5'],[220,'bowler-6'],[459,'bowler-6'],[460,'bowler-ready']] as const){
  const sim=createCricketSimulation(data);sim.primary();sim.advance(500);sim.advance(age);
  assert.equal(sim.state.phase,'delivery');assert.equal(bowlingPose(sim.state),id,`post-release ${age}ms`);
  assert.ok(sim.bowlerPosition().y>=475);
 }
});
