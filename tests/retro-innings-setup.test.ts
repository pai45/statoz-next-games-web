import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCricketSimulation} from '../src/features/games/retro-innings/runtime/simulation.mjs';

const data=JSON.parse(fs.readFileSync('src/features/games/retro-innings/runtime/assets.json','utf8')).runtime;
const game=()=>createCricketSimulation(data);

test('one-day match accepts two distinct manual countries and source over choices',()=>{
 for(const overs of [10,20,30,40,50]){
  const s=game();
  assert.equal(s.configureMatch({mode:'one-day',overs,playerTeam:'India',opponentTeam:'Australia'}),true);
  assert.deepEqual(s.state.match,{mode:'one-day',overs,wicketLimit:10,playerTeam:'India',opponentTeam:'Australia',playerBatInnings:1});
  assert.equal(s.configureMatch({mode:'one-day',overs,playerTeam:'India',opponentTeam:'India'}),false);
  s.primary();assert.equal(s.configureMatch({mode:'practice'}),false);
 }
 const s=game();assert.equal(s.teams.length,8);
 assert.equal(s.configureMatch({mode:'one-day',overs:5,playerTeam:'India',opponentTeam:'England'}),false);
 assert.equal(s.configureMatch({mode:'one-day',overs:10,playerTeam:'Unknown',opponentTeam:'England'}),false);
});

test('bowl-first toss changes player controls, innings order and chase winner',()=>{
 const s=game();
 assert.equal(s.configureMatch({mode:'one-day',overs:10,playerTeam:'India',opponentTeam:'England',playerBatInnings:2}),true);
 s.primary();assert.equal(s.state.status,'playing');assert.equal(s.state.phase,'ready');assert.equal(s.playerBatting(),false);
 assert.equal(s.nesBowl('A'),false,'a bounce point is required before selecting speed');
 assert.equal(s.placeBowlPoint(430,395),true);
 assert.equal(s.nesBowl('A'),true);
 assert.equal(s.state.phase,'runup');
 s.state.legal=59;s.resolve('DOT');
 assert.equal(s.state.status,'intermission');assert.equal(s.state.target,1);
 s.primary();assert.equal(s.state.innings,2);assert.equal(s.playerBatting(),true);assert.equal(s.state.phase,'runup');
 s.state.pendingOutcome=null;s.state.settled=false;s.state.completedRuns=1;s.resolve('ONE');
 assert.equal(s.state.result,'INDIA WIN');assert.equal(s.state.playerBatRuns,1);
});

test('fast match chooses distinct teams while practice preserves the short trial',()=>{
 const fast=game();assert.equal(fast.configureMatch({mode:'fast',overs:20,seed:123}),true);
 assert.notEqual(fast.state.match.playerTeam,fast.state.match.opponentTeam);
 assert.ok(fast.teams.includes(fast.state.match.playerTeam));
 const practice=game();assert.equal(practice.configureMatch({mode:'practice',overs:50}),true);
 assert.equal(practice.state.match.overs,1);assert.equal(practice.state.match.wicketLimit,3);
});

test('configured over and wicket limits govern both innings and result names',()=>{
 const s=game();s.configureMatch({mode:'one-day',overs:10,playerTeam:'India',opponentTeam:'England'});s.primary();
 s.state.legal=58;s.resolve('DOT');assert.equal(s.state.legal,59);assert.equal(s.state.status,'playing');
 s.state.pendingOutcome=null;s.state.settled=false;s.resolve('DOT');
 assert.equal(s.state.legal,60);assert.equal(s.state.status,'intermission');assert.equal(s.state.target,1);
 s.primary();assert.equal(s.state.innings,2);assert.equal(s.state.match.opponentTeam,'England');
 s.state.legal=59;s.state.pendingOutcome=null;s.state.settled=false;s.resolve('DOT');
 assert.equal(s.state.result,'TIE');
 const chase=game();chase.configureMatch({mode:'one-day',overs:10,playerTeam:'India',opponentTeam:'England'});chase.primary();
 chase.state.wickets=9;chase.resolve('BOWLED','bowled');assert.equal(chase.state.status,'intermission');
 chase.primary();chase.state.pendingOutcome=null;chase.state.settled=false;chase.state.completedRuns=1;chase.resolve('ONE');
 assert.equal(chase.state.result,'ENGLAND WIN');
});
