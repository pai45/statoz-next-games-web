import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CHASES,LESSONS} from '../src/features/games/cricketer/data';
import {STEP,WINDUP,newMatch,step,swing,contactAt,evaluate,checkpoint,restore,skipHighlight,ballPosition,fieldingTime,runningTime,outcomeVisible,RUN,type Match} from '../src/features/games/cricketer/engine';
import {emptySave,record,readSave} from '../src/features/games/cricketer/save';
import {gameRegistry} from '../src/mocks/games/game-registry';
import {sportGameDecks} from '../src/mocks/games/sport-decks';
import removedGames from '../src/domain/removed-games.json';
const advance=(s:Match,t:number)=>{for(let i=0;i<Math.round(t/STEP);i++)step(s);};
function play(s:Match,offset=0,wrong=false){const checkpoint=s.checkpoint;while(s.phase==='delivery'&&s.age<contactAt(s)-WINDUP+offset)step(s);swing(s,wrong?(s.delivery.side==='left'?'right':'left'):s.delivery.side);while(s.phase!=='finished'&&s.checkpoint===checkpoint)step(s);}
test('Cricketer is registered and the cricket hub respects retired games',()=>{assert.equal(gameRegistry.cricketer.href,'/play/cricketer');assert.ok(sportGameDecks.cricket.includes('cricketer'));assert.equal(sportGameDecks.cricket.includes('stick-cricket'),!removedGames.includes('stick-cricket'));assert.equal(CHASES.length,12);assert.equal(LESSONS.length,3);assert.deepEqual([CHASES[0].target,CHASES[0].balls],[5,5]);});
test('one swing per delivery; correct timing clears the rope, wrong direction consumes a ball',()=>{const s=newMatch(CHASES[1],1);advance(s,contactAt(s)-WINDUP);assert.equal(swing(s,s.delivery.side),true);assert.equal(swing(s,s.delivery.side),false);assert.equal(evaluate(s).runs,6);const m=newMatch(CHASES[1],1);play(m,0,true);assert.equal(m.score,0);assert.equal(m.ball,1);assert.equal(m.results[0].feedback,'WRONG SIDE');});
test('early, late and no-shot outcomes lose power consistently',()=>{for(const offset of [-.2,.2]){const s=newMatch(CHASES[1],12);play(s,offset);assert.ok(s.results[0].runs<4);assert.ok(s.results[0].runs>=0);}const s=newMatch(CHASES[0],5);advance(s,40);assert.equal(s.phase,'finished');assert.equal(s.won,false);assert.equal(s.ball,5);assert.equal(s.score,0);});
test('last-ball victory is recorded before exhausted-ball defeat',()=>{const s=newMatch({...CHASES[0],target:6,balls:1},45);play(s);assert.equal(s.won,true);assert.equal(s.phase,'finished');const lose=newMatch({...CHASES[0],target:7,balls:1},45);play(lose);assert.equal(lose.won,false);});
test('boundaries, runs and automatic running resolve before committing the next delivery',()=>{const s=newMatch(CHASES[3],4);play(s);assert.equal(s.results[0].runs,6);const four=newMatch(CHASES[3],4);play(four,.065);assert.equal(four.results[0].runs,4);const run=newMatch(CHASES[3],4);play(run,.14);assert.ok(run.results[0].runs>0&&run.results[0].runs<4);assert.equal(run.checkpoint,1);});
test('all six shot families are selected from seeded line and length',()=>{const shots=new Set();for(let i=0;i<500;i++)shots.add(newMatch(CHASES[11],i*7951).delivery.shot);assert.deepEqual([...shots].sort(),['cut','drive','hook','pull','scoop','sweep']);});
test('left and right inputs match the visible side of the pitch and shot trajectory',()=>{for(let seed=1;seed<20;seed++){const s=newMatch(CHASES[4],seed);assert.equal(Math.sign(s.delivery.line),s.delivery.side==='left'?-1:1);advance(s,contactAt(s)-WINDUP);swing(s,s.delivery.side);while(s.phase==='delivery')step(s);assert.equal(Math.sign(s.trajectory.vx),s.delivery.side==='left'?-1:1);}});
test('same actions have identical results at 30, 60 and 120 rendering fps',()=>{const run=(fps:number)=>{const s=newMatch(CHASES[7],99);let acc=0;while(s.phase!=='finished'){acc+=1/fps;while(acc+1e-9>=STEP){if(s.phase==='delivery'&&!s.input&&s.age>=contactAt(s)-WINDUP)swing(s,s.delivery.side);step(s);acc-=STEP;}}return {score:s.score,results:s.results,seed:s.seed,time:s.time};};assert.deepEqual(run(30),run(60));assert.deepEqual(run(60),run(120));});
test('checkpoint restores RNG and completed deliveries and replays an interrupted ball',()=>{const s=newMatch(CHASES[8],35);play(s,.1);const cp=checkpoint(s),copy=restore(s.challenge,cp);assert.deepEqual(copy.delivery,s.delivery);assert.equal(copy.seed,s.seed);assert.deepEqual(copy.results,s.results);advance(s,.7);const again=restore(s.challenge,checkpoint(s));assert.equal(again.age,0);assert.deepEqual(again.delivery,copy.delivery);play(copy);play(again);assert.deepEqual(copy.results,again.results);});
test('wins unlock next chase and lessons persist; incompatible saves are preserved by the reader',()=>{let save=emptySave();const s=newMatch(CHASES[0],11);play(s);save=record(save,s);assert.equal(save.unlocked,1);assert.equal(save.best[s.challenge.id],6);assert.equal(readSave(JSON.stringify(save)).incompatible,false);assert.equal(readSave('{"schemaVersion":3}').incompatible,true);assert.equal(readSave('{broken').incompatible,true);const lesson=newMatch(LESSONS[0],1);play(lesson);save=record(save,lesson);assert.ok(save.lessons.includes(lesson.challenge.id));});
test('invalid checkpoints cannot inject scores or unknown challenges',()=>{const s=emptySave();s.checkpoint={challengeId:'chase-1',initialSeed:5,seed:5,results:[{runs:999,feedback:'hi',offset:0,quality:1,shot:'drive',caught:false}]};assert.equal(readSave(JSON.stringify(s)).incompatible,true);s.checkpoint.challengeId='no-game';assert.equal(readSave(JSON.stringify(s)).incompatible,true);});
test('ball trajectory stays finite and highlight skip never changes the earned result',()=>{const s=newMatch(CHASES[4],19);advance(s,contactAt(s)-WINDUP);swing(s,s.delivery.side);while(s.phase==='delivery')step(s);assert.equal(s.phase,'flight');const result={...s.outcome};for(let i=0;i<30;i++){const p=ballPosition(s);assert.ok([p.x,p.y,p.z].every(Number.isFinite));step(s);}assert.equal(skipHighlight(s),true);while(s.checkpoint===0)step(s);assert.deepEqual(s.results[0],result);});

test('result announcements wait for the shot or fielding action to finish',()=>{
 for(const offset of [0,.065,.14]){const s=newMatch(CHASES[3],4);advance(s,contactAt(s)-WINDUP+offset);swing(s,s.delivery.side);while(s.phase==='delivery')step(s);
 assert.equal(outcomeVisible(s),false);while(s.phase==='flight'||s.phase==='running'){assert.equal(outcomeVisible(s),false);step(s);}
 advance(s,.2);assert.equal(outcomeVisible(s),true);}
});
test('return throw arrives after completed runs and before the next delivery',()=>{
 for(const runs of [1,2,3]){const s=newMatch(CHASES[3],4);s.outcome={runs,feedback:'GOOD TIMING',quality:.5,offset:0,shot:'drive',caught:false};s.trajectory={vx:10,vy:4,vz:-8,duration:1.6,landing:{x:16,y:0,z:-12.8}};
 const f=fieldingTime(s);assert.ok(f.arrival>runs*RUN);assert.ok(f.arrival<s.trajectory.duration+runningTime(s));assert.ok(f.release>=f.pickup+.48);}
});

test('caught feedback stays hidden until the fielder takes the catch',()=>{
 let s=newMatch(CHASES[3],1);for(let seed=2;s.delivery.length<=.65;seed++)s=newMatch(CHASES[3],seed);
 advance(s,contactAt(s)-WINDUP-.23);swing(s,s.delivery.side);while(s.phase==='delivery')step(s);assert.equal(s.outcome?.caught,true);assert.equal(outcomeVisible(s),false);
 while(s.phase==='flight'){assert.equal(outcomeVisible(s),false);step(s);}advance(s,.2);assert.equal(outcomeVisible(s),true);assert.equal(s.outcome?.feedback,'CAUGHT');
});
