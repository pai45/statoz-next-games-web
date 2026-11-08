import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {nations,groups} from '../src/features/games/penalty-cup/nations';
import {acceptResult,currentFixture,cpuLevel,knockout32,newCup,randomOpponent,retryFixture,simulateFixture,standings,storePending,thirdStandings} from '../src/features/games/penalty-cup/tournament';
import {emptySave,readSave,resultId,updateCup,validCup,writeSave} from '../src/features/games/penalty-cup/storage';
import {matchStatus} from '../src/features/games/penalty-shootout/engine/rules';
import {initializePhysics,ShootoutSimulation} from '../src/features/games/penalty-shootout/engine/simulation';
import type {Cup,MatchResult} from '../src/features/games/penalty-cup/types';
import type {KickResult} from '../src/features/games/penalty-shootout/game-types';

function result(c:Cup,outcome:'win'|'loss'|'draw'='win'):MatchResult{return{id:resultId(c,currentFixture(c)!),score:outcome==='draw'?[3,3]:outcome==='win'?[5,2]:[2,5],outcome,kicks:[],suddenDeath:false};}
const settle=(c:Cup,outcome:'win'|'loss'|'draw'='win')=>acceptResult(storePending(c,result(c,outcome)));
test('48 verified participants, 12 four-team groups; every team has three unique group opponents',()=>{
 assert.equal(nations.length,48);assert.equal(new Set(nations.map(n=>n.id)).size,48);assert.equal(new Set(nations.map(n=>n.rank)).size,48);
 for(const g of groups)assert.equal(nations.filter(n=>n.group===g).length,4);
 for(const n of nations){const c=newCup(n.id,23,'test');assert.equal(c.fixtures.length,72);assert.ok(validCup(c));assert.equal(currentFixture(c)?.stage,'group');}
 assert.throws(()=>newCup('invalid',1,'bad'));assert.throws(()=>randomOpponent('invalid',1));
});
test('all 495 official routes contain eight unique qualified groups and legal opponents',()=>{
 const routes:Record<string,string[]>=JSON.parse(fs.readFileSync('src/features/games/penalty-cup/third-routes.json','utf8'));
 assert.equal(Object.keys(routes).length,495);
 const pools=['CEFHI','EFGIJ','BEFIJ','ABCDF','AEHIJ','CDFGH','DEIJL','EHIJK'];
 for(const [key,route] of Object.entries(routes)){assert.equal(key.length,8);assert.equal(new Set(route).size,8);assert.equal([...route].sort().join(''),key);route.forEach((g,i)=>assert.ok(pools[i].includes(g),`${key} slot ${i}`));}
 assert.deepEqual(routes.EFGHIJKL,['E','J','I','F','H','G','L','K']);
});
test('group matches permit draws only after five each and never terminate at an early clinch',()=>{
 const kicks=Array.from({length:6},(_,i)=>({role:i%2?'keeping':'shooting',outcome:i%2?'saved':'goal'})) as KickResult[];
 assert.equal(matchStatus(kicks).winner,'player');assert.equal(matchStatus(kicks,{allowDraw:true,earlyClinch:false}).complete,false);
 const tied=Array.from({length:10},(_,i)=>({role:i%2?'keeping':'shooting',outcome:'goal'})) as KickResult[];
 assert.equal(matchStatus(tied).winner,null);assert.equal(matchStatus(tied).suddenDeath,true);
 assert.equal(matchStatus(tied,{allowDraw:true,earlyClinch:false}).outcome,'draw');
 assert.equal(matchStatus(tied,{allowDraw:true,earlyClinch:false}).suddenDeath,false);
 tied.push({role:'shooting',outcome:'goal'} as KickResult);assert.equal(matchStatus(tied).winner,null);
 tied.push({role:'keeping',outcome:'saved'} as KickResult);assert.equal(matchStatus(tied).winner,'player');
});
test('group draw reaches summary through the actual physics simulation',async()=>{
 await initializePhysics();const s=new ShootoutSimulation('shootout',1,1,{allowDraw:true,earlyClinch:false});
 try{s.kicks=Array.from({length:10},(_,i)=>({role:i%2?'keeping':'shooting',outcome:'goal'})) as KickResult[];s.phase='resolution';s.next();assert.equal(s.snapshot().phase,'summary');assert.equal(s.snapshot().outcome,'draw');}finally{s.dispose();}
});
test('head-to-head outranks overall goal difference and overall ranking resolves a complete tie',()=>{
 const c=newCup('ARG',1,'table'),ids=nations.filter(n=>n.group==='J').map(n=>n.id);
 // ARG defeats ALG head to head, despite ALG having a much stronger overall goal difference.
 const scores:Record<string,[number,number]>={ 'ARG:ALG':[1,0], 'AUT:JOR':[0,0], 'ARG:AUT':[0,1], 'JOR:ALG':[0,5], 'JOR:ARG':[0,1], 'ALG:AUT':[5,0] };
 c.fixtures=c.fixtures.map(f=>f.home&&scores[`${f.home}:${f.away}`]?{...f,score:scores[`${f.home}:${f.away}`]}:f);
 const table=standings(c,'J');assert.equal(table[0].team,ids[0]);assert.equal(table[1].team,ids[1]);
 const tied=newCup('ARG',1,'tie');tied.fixtures=tied.fixtures.map(f=>({...f,score:[2,2]}));assert.deepEqual(standings(tied,'J').map(r=>r.team),['ARG','AUT','ALG','JOR']);
});
test('multi-team mini-table reapplies head-to-head to the remaining tied teams',()=>{
 const c=newCup('ARG',1,'multi');
 const scores:Record<string,[number,number]>={'ARG:ALG':[2,0],'AUT:JOR':[3,0],'ARG:AUT':[1,2],'JOR:ALG':[0,1],'JOR:ARG':[0,1],'ALG:AUT':[3,0]};
 c.fixtures=c.fixtures.map(f=>scores[`${f.home}:${f.away}`]?{...f,score:scores[`${f.home}:${f.away}`]}:f);
 assert.deepEqual(standings(c,'J').map(r=>r.team),['ARG','ALG','AUT','JOR']);
});
test('a championship is eight player matches; all 104 fixtures settle and only one team wins the final',()=>{
 for(const n of nations){let c=newCup(n.id,42,'champ-'+n.id),matches=0;while(c.status==='active'){c=settle(c);assert.ok(validCup(c));matches++;assert.ok(matches<=8);}assert.equal(c.status,'champion');assert.equal(matches,8);assert.equal(c.fixtures.length,104);assert.ok(c.fixtures.every(f=>f.score));assert.equal(c.fixtures.find(f=>f.id==='M104')?.winner,n.id);}
});
test('third-place qualification and bracket use distinct teams under varied seeded results',()=>{
 for(let seed=0;seed<300;seed++){const c=newCup('ARG',seed,'draw');c.fixtures=c.fixtures.map(simulateFixture);const round=knockout32(c);assert.equal(round.length,16);assert.equal(new Set(round.flatMap(f=>[f.home,f.away])).size,32);assert.equal(thirdStandings(c).length,12);for(const f of round)assert.notEqual(nations.find(n=>n.id===f.home)?.group,nations.find(n=>n.id===f.away)?.group);}
});
test('retries preserve the opponent and challenge, change only attempt seed, and never settle CPU fixtures twice',()=>{
 let c=newCup('ARG',61,'retry');for(let i=0;i<3;i++)c=settle(c);
 const f=currentFixture(c)!,before=JSON.stringify(c.fixtures),pending=storePending(c,result(c,'loss'));
 assert.equal(JSON.stringify(pending.fixtures),before);assert.equal(storePending(pending,result(c)),pending);
 const retry=retryFixture(pending),rf=currentFixture(retry)!;assert.equal(rf.home,f.home);assert.equal(rf.away,f.away);assert.notEqual(rf.seed,f.seed);assert.equal(rf.attempts,1);assert.equal(retry.pending,null);
 assert.equal(storePending(retry,result(c,'loss')),retry);c=settle(retry);assert.equal(acceptResult(c),c);
 assert.deepEqual(c.fixtures.filter(x=>x.stage==='group'),retry.fixtures.filter(x=>x.stage==='group'));
});
test('accepting a semi-final loss leads to bronze; accepting other defeats ends the run',()=>{
 let c=newCup('BRA',84,'bronze');while(c.stage!=='semi')c=settle(c);c=settle(c,'loss');assert.equal(c.stage,'bronze');assert.equal(c.status,'active');c=settle(c);assert.equal(c.status,'third');assert.equal(c.fixtures.length,104);assert.ok(c.fixtures.every(f=>f.score));
 let d=newCup('FRA',2,'loss');while(d.stage==='group')d=settle(d);d=settle(d,'loss');assert.equal(d.status,'eliminated');assert.ok(d.fixtures.every(f=>f.score));
 let e=newCup('NZL',2,'group-loss');for(let i=0;i<3;i++)e=settle(e,'loss');assert.equal(e.status,'eliminated');assert.equal(e.fixtures.length,104);
});
test('save/resume preserves pending decisions and seeds, isolates accounts and rejects corrupt saves without overwriting',()=>{
 const records=new Map<string,string>(),storage={getItem:(k:string)=>records.get(k)??null,setItem:(k:string,v:string)=>{records.set(k,v);}};
 let c=newCup('ARG',5,'saved');for(let i=0;i<3;i++)c=settle(c);c=storePending(c,result(c,'loss'));const saved=updateCup(emptySave(),c);
 assert.ok(writeSave(storage,'a',saved));assert.deepEqual(readSave(storage,'a').save,JSON.parse(JSON.stringify(saved)));assert.equal(readSave(storage,'b').save.active,null);
 records.set('penalty-cup.v1.a','broken');assert.equal(readSave(storage,'a').recovered,true);assert.equal(records.get('penalty-cup.v1.a'),'broken');
 assert.equal(writeSave({getItem:()=>null,setItem:()=>{throw Error('denied');}},'a',saved),false);
 assert.equal(readSave({getItem:()=>{throw Error('denied');}},'a').unavailable,true);
 const broken=structuredClone(c);broken.fixtures[0].away=broken.fixtures[0].home;assert.equal(validCup(broken),false);
});
test('all random opponents differ, stage challenge stays within engine bounds, and completed history is idempotent',()=>{
 for(const n of nations)for(let seed=0;seed<20;seed++)assert.notEqual(randomOpponent(n.id,seed),n.id);
 assert.ok(cpuLevel('final')>cpuLevel('group'));assert.ok(cpuLevel('final')<=12);
 let c=newCup('ENG',12,'history');while(c.status==='active')c=settle(c);let save=updateCup(emptySave(),c);save=updateCup(save,c);assert.equal(save.history.length,1);
});
