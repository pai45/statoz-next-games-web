import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {padDirections} from '../src/features/games/retro-football/runtime/touch-pad';import {Simulation} from '../src/features/games/retro-football/runtime/simulation';import {readResult} from '../src/features/games/retro-football/protocol';
const assets=JSON.parse(fs.readFileSync('public/games/retro-football/assets.json','utf8'));
test('One thumb covers eight directions and a stable neutral centre',()=>{
 for(const [x,y,expected]of [[0,-1,['up']],[1,-1,['right','up']],[1,0,['right']],[1,1,['right','down']],[0,1,['down']],[-1,1,['left','down']],[-1,0,['left']],[-1,-1,['left','up']]] as const)assert.deepEqual(padDirections(x,y),expected);
 assert.deepEqual(padDirections(.1,.1),[]);assert.deepEqual(padDirections(.22,0),[]);assert.deepEqual(padDirections(.22,0,['right']),['right']);assert.deepEqual(padDirections(.1,0,['right']),[]);
});
test('Diagonal commands retain normal total running speed',()=>{
 const run=(diagonal:boolean)=>{const sim=new Simulation(assets);sim.command({type:'start'});const s=sim.state;s.phase='open';s.restart=null;s.owner=9;s.selected=9;for(const p of s.players){p.x=5;p.y=5;p.cooldown=9999;}Object.assign(s.players[9],{x:45,y:34,cooldown:0});sim.command({type:'hold',key:'right',value:true,source:'test'});if(diagonal)sim.command({type:'hold',key:'down',value:true,source:'test'});for(let i=0;i<10;i++)sim.step();return Math.hypot(s.players[9].x-45,s.players[9].y-34);};assert.ok(Math.abs(run(true)-run(false))<1e-8);
});
test('Contextual A label matches actual CHANCE eligibility and both attack directions',()=>{
 const sim=new Simulation(assets);sim.command({type:'start'});const s=sim.state;s.phase='open';s.restart=null;s.owner=9;s.selected=9;const p=s.players[9];p.x=80;p.y=10;assert.equal(sim.primaryAction(),'SHOOT');sim.command({type:'A'});assert.equal(s.shotView,null);assert.equal(p.action?.kind,'shot');p.action=null;p.cooldown=0;p.y=34;assert.equal(sim.primaryAction(),'CHANCE');sim.command({type:'A'});assert.equal(sim.snapshot().shotView?.phase,'aim');assert.equal(sim.primaryAction(),'SHOOT');
 s.shotView=null;s.half=2;p.x=25;p.y=10;s.players[11].x=4;p.action=null;assert.equal(sim.primaryAction(),'SHOOT');p.y=34;assert.equal(sim.primaryAction(),'CHANCE');
});
test('Reference framing preserves live world state and result versions remain compatible',()=>{
 const sim=new Simulation(assets),before=sim.snapshot();sim.setViewportWidth(320);assert.deepEqual(sim.state.players,before.players);assert.deepEqual(sim.state.ball,before.ball);assert.equal(sim.state.owner,before.owner);
 const result={schemaVersion:2,gameId:'retro-football',mode:'exhibition',outcome:'draw',score:[0,0],airContacts:[0,0],airCollections:[0,0],passes:[0,0],shots:[0,0],saves:[0,0],halves:2,activeSeconds:180,runtimeVersion:'0.7.0',rulesVersion:'exhibition-handheld-v1',assetVersion:'football-handheld-atlas-v1'};assert.ok(readResult(result));assert.ok(readResult({...result,runtimeVersion:'0.6.0'}));assert.equal(readResult({...result,assetVersion:'football-complete-atlas-v1'}),null);
});
test('B and C show the available actions as possession changes',()=>{const sim=new Simulation(assets);sim.command({type:'start'});const s=sim.state;s.phase='open';s.restart=null;s.owner=s.selected;assert.equal(sim.secondaryAction(),'LOFT');assert.equal(sim.tertiaryAction(),'SHORT');s.owner=20;assert.equal(sim.secondaryAction(),'SLIDE');assert.equal(sim.tertiaryAction(),'SWITCH');});
