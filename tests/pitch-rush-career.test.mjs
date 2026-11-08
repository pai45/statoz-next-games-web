import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {createCareer,currentFixture,recordResult,nextSeason,standings,makeSeason,careerDifficulty} from '../src/features/games/pitch-rush/career.mjs';
import {freshProgress,loadProgress,saveProgress,checkpoint,restoreMatch,validProgress,PROGRESS_KEY,BACKUP_KEY} from '../src/features/games/pitch-rush/progress.mjs';
import {createTutorial,arrangeDrill,beforeTutorialStep,afterTutorialStep} from '../src/features/games/pitch-rush/tutorial.mjs';
import {adaptSimulation,adaptKicks} from '../src/features/games/pitch-rush/gameplay.mjs';
import {AI_LEVELS,BTN} from '../src/features/games/pitch-rush/source/src/constants.js';
import {refreshPitchRushRecord} from '../scripts/refresh-pitch-rush-download.mjs';
const built=await build({stdin:{contents:"export {step} from './src/features/games/pitch-rush/source/src/game/sim.js'; export {createMatch} from './src/features/games/pitch-rush/source/src/game/state.js';",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'pitch-rush',setup(b){
  b.onLoad({filter:/game[\\/]sim\.js$/},async a=>({contents:adaptSimulation(await fs.readFile(a.path,'utf8')),loader:'js'}));
  b.onLoad({filter:/game[\\/]kick\.js$/},async a=>({contents:adaptKicks(await fs.readFile(a.path,'utf8')),loader:'js'}));
}}]});
const {step,createMatch}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const winSeason=career=>{for(let i=0;i<5;i++)career=recordResult(career,currentFixture(career).id,[10,0]);return career;};
test('selected build refreshes the current download record without changing other games',()=>{
  const other={url:'/embedded-games/other/index.html',hash:'untouched',bytes:17};
  const manifest={schemaVersion:1,buildId:'current',revision:'old',totalBytes:20,files:[other,{url:'/base/embedded-games/pitch-rush/index.html',hash:'old',bytes:3}]};
  const next=refreshPitchRushRecord(manifest,Buffer.from('rebuilt'));
  assert.equal(next.files[0],other);assert.equal(next.buildId,'current');assert.equal(next.totalBytes,24);assert.notEqual(next.revision,'old');
  assert.equal(refreshPitchRushRecord(next,Buffer.from('rebuilt')),next);assert.equal(manifest.files[1].hash,'old');
});
test('six-club schedule covers all fifteen pairings in five rounds',()=>{
  const s=makeSeason(0,1,91),pairs=new Set();
  for(const round of s.rounds){assert.equal(new Set(round.flatMap(f=>[f.home,f.away])).size,6);for(const f of round)pairs.add([f.home,f.away].sort().join(':'));}
  assert.equal(pairs.size,15);
  assert.deepEqual(standings(s).map(r=>r.id),[0,1,2,3,4,5]);
});
test('results and other matches are deterministic, correctly orientated, and committed once',()=>{
  const c=createCareer(2026),id=currentFixture(c).id;
  const a=recordResult(c,id,[2,1]),b=recordResult(createCareer(2026),id,[2,1]);
  assert.deepEqual(a,b);assert.equal(a.season.round,1);assert.ok(a.season.rounds[0].every(f=>f.score));
  assert.equal(standings(a.season).find(r=>r.id===0).points,3);
  assert.equal(recordResult(a,id,[99,0]),a);assert.equal(c.season.round,0);
  const next=currentFixture(a),draw=recordResult(a,next.id,[1,1]);
  assert.equal(standings(draw.season).find(r=>r.id===0).points,4);
});
test('a full climb grants promotion kits, all trophies, champion rewards, and replay',()=>{
  let c=createCareer(501);
  for(let division=0;division<4;division++){
    c=winSeason(c);assert.equal(c.season.summary.rank,1);assert.equal(c.trophies[division],1);
    assert.equal(c.unlocked,division+1);
    if(division<3){assert.equal(c.season.summary.promoted,true);c=nextSeason(c);assert.equal(c.season.division,division+1);}
  }
  assert.equal(c.champion,true);assert.equal(c.season.summary.champion,true);
  const replay=nextSeason(c);assert.equal(replay.season.division,3);assert.equal(replay.season.round,0);assert.deepEqual(replay.trophies,[1,1,1,1]);
});
test('second place promotes, losses stay in the division and preserve cosmetics',()=>{
  let c=createCareer(51);
  c.kit='blue';for(let i=0;i<5;i++)c=recordResult(c,currentFixture(c).id,[0,10]);
  assert.ok(c.season.summary.rank>2);assert.equal(c.season.summary.promoted,false);assert.equal(nextSeason(c).season.division,0);
  // A deliberately authored valid table: club 0 wins four, loses only to club 1.
  const s=makeSeason(0,1,1);for(const f of s.rounds.flat())f.score=f.home===0?[f.away===1?0:5,f.away===1?5:0]:f.away===0?[f.home===1?5:0,f.home===1?0:5]:f.home===1?[5,0]:f.away===1?[0,5]:[0,0];
  assert.equal(standings(s)[1].id,0);
  let second=createCareer(1);second.season.rounds=s.rounds;second.season.round=4;
  for(const f of second.season.rounds[4])f.score=null;
  const fixture=currentFixture(second);second=recordResult(second,fixture.id,[0,5]);
  assert.equal(second.season.summary.rank,2);assert.equal(second.season.summary.promoted,true);assert.equal(second.trophies[0],0);
});
test('regional CPU settings interpolate while other difficulties use existing levels',()=>{
  const regional=careerDifficulty('regional',AI_LEVELS);assert.ok(regional.speed>AI_LEVELS.easy.speed&&regional.speed<AI_LEVELS.normal.speed);
  assert.ok(regional.reactTicks>=AI_LEVELS.normal.reactTicks);assert.equal(careerDifficulty('hard',AI_LEVELS),AI_LEVELS.hard);
});
function storage(){const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),data};}
test('progress backup, corrupt data, future versions, and storage failures',()=>{
  const store=storage(),p=freshProgress();p.career=createCareer(5);saveProgress(store,p);p.tutorial.status='skipped';saveProgress(store,p);
  assert.equal(loadProgress(store).data.tutorial.status,'skipped');store.setItem(PROGRESS_KEY,'broken');
  const recovered=loadProgress(store);assert.equal(recovered.recovered,true);assert.equal(recovered.data.tutorial.status,'new');
  store.setItem(BACKUP_KEY,JSON.stringify({...p,version:99}));assert.ok(loadProgress(store).error);assert.equal(store.getItem(PROGRESS_KEY),'broken');
  saveProgress(store,p);assert.equal(store.getItem(PROGRESS_KEY+'.unreadable'),'broken');
  assert.throws(()=>saveProgress({getItem:()=>null,setItem(){throw new DOMException('Full','QuotaExceededError');}},p),/Full/);
  assert.equal(validProgress({...p,career:{...p.career,kit:'missing'}}),false);
});
test('checkpoint round trip preserves RNG, AI history, score and subsequent simulation',()=>{
  const state=createMatch({seed:93,halfSeconds:45,humans:[true,false],difficulty:'normal'});
  for(let i=0;i<300;i++)step(state,[0,0]);
  const active=checkpoint(state,'1:0:0:0'),restored=restoreMatch(active);
  const baseline=restoreMatch(active);assert.equal(restored.rng,state.rng);assert.deepEqual(restored.score,state.score);assert.equal(restored.tick,state.tick);
  for(let i=0;i<120;i++){step(restored,[BTN.UP,0]);step(baseline,[BTN.UP,0]);}
  assert.deepEqual(restored,baseline);
  const p=freshProgress();p.career=createCareer(1);p.activeMatch=checkpoint(state,currentFixture(p.career).id);
  assert.equal(validProgress(p),true);
  p.activeMatch.state.teams[0].players[9].charging=true;p.activeMatch.state.teams[0].players[9].charge=35;
  assert.equal(restoreMatch(p.activeMatch).teams[0].players[9].charging,false);
  p.activeMatch.state.ball.owner={team:9,idx:99};assert.equal(validProgress(p),false);
});
function runDrill(t,s,mask,ticks){let outcome;for(let i=0;i<ticks;i++){beforeTutorialStep(t,s);step(s,[mask,0]);outcome=afterTutorialStep(t,s);if(outcome!=='playing')return outcome;}return outcome;}
test('passing drill requires movement and two real, short, received passes',()=>{
  const t=createTutorial(0);let s=arrangeDrill(t);
  for(let pass=0;pass<2;pass++){
    const direction=pass===0?BTN.RIGHT:BTN.LEFT;
    runDrill(t,s,direction,8);assert.equal(t.moved,true);
    runDrill(t,s,BTN.FIRE|direction,3);runDrill(t,s,0,1);
    const result=runDrill(t,s,0,120);assert.equal(result,pass===0?'pass':'complete');
    if(pass===0)s=arrangeDrill(t);
  }
  assert.equal(t.passes,2);assert.equal(t.success,true);
});
test('defending drill requires a real slide and recovery, rather than pressing a button',()=>{
  const t=createTutorial(1),s=arrangeDrill(t);
  assert.equal(runDrill(t,s,0,10),'playing');
  runDrill(t,s,BTN.UP,8);runDrill(t,s,BTN.FIRE|BTN.UP,1);
  let result;for(let i=0;i<180;i++){
    const p=s.teams[0].players[s.teams[0].controlled],b=s.ball;
    const mask=(b.y<p.y-3?BTN.UP:b.y>p.y+3?BTN.DOWN:0)|(b.x<p.x-3?BTN.LEFT:b.x>p.x+3?BTN.RIGHT:0);
    result=runDrill(t,s,mask,1);if(result!=='playing')break;
  }
  assert.equal(t.slid,true);assert.equal(result,'complete',JSON.stringify({ball:s.ball,p:s.teams[0].players[9],op:s.teams[1].players[9]}));assert.equal(s.ball.owner.team,0);
});
test('scoring drill uses an actual charged shot and goal; failed attempts reset',()=>{
  const t=createTutorial(2),s=arrangeDrill(t);
  // The practice keeper leaves the near corner open; physics detects the goal.
  runDrill(t,s,BTN.FIRE|BTN.UP,35);runDrill(t,s,0,1);
  const result=runDrill(t,s,0,160);assert.equal(t.shot,true);assert.equal(result,'complete',JSON.stringify({ball:s.ball,p:s.teams[0].players[9],keeper:s.teams[1].players[0]}));assert.equal(s.score[0],1);
  const retry=createTutorial(2),miss=arrangeDrill(retry);miss.phase='restart';assert.equal(afterTutorialStep(retry,miss),'retry');
  assert.equal(arrangeDrill(retry).score[0],0);assert.equal(retry.attempt,2);
});
