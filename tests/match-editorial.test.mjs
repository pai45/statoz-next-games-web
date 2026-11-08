import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';import vm from 'node:vm';import path from 'node:path';import {fileURLToPath} from 'node:url';
// Exercise real pure presentation code; erase type imports and resolve local adapters.
function module(file){const actual=path.resolve(path.dirname(fileURLToPath(import.meta.url)),file);const source=fs.readFileSync(actual,'utf8');const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const exports={};vm.runInNewContext(js,{exports,require:id=>module(path.resolve(path.dirname(actual),id+'.ts')),Date,Number,String,Set});return exports;}
const spec=module('../src/design-system/tokens/match-discovery.generated.ts').matchDiscovery;
const {selectEditorialCycles,selectFeaturedPicks,selectSportFuture}=module('../src/features/matches/editorial-cycle.ts');
const {editorialStatus,kickoffLabel,deadlineLabel}=module('../src/features/matches/editorial-format.ts');
test('lifecycle is explicit and time never fabricates missing or past deadlines',()=>{for(const [state,label]of Object.entries(spec.status))assert.equal(editorialStatus(state),label);assert.equal(editorialStatus(undefined),'');assert.equal(deadlineLabel(undefined,'live',0),'');assert.equal(deadlineLabel('invalid','upcoming',0),'');assert.equal(deadlineLabel('2026-10-14T10:28:00Z','upcoming',Date.parse('2026-10-14T10:00:00Z')),'Closes in 28m');assert.equal(deadlineLabel('2026-10-14T10:28:00Z','unresolved',Date.parse('2026-10-14T10:00:00Z')),'');assert.equal(deadlineLabel('2026-10-14T10:00:00Z','live',Date.parse('2026-10-14T10:28:00Z')),'');assert.equal(kickoffLabel('invalid',0),'');});
test('cycles keep sport order, priority and distinct fixture cards with partial groups',()=>{const fixtures=spec.sports.flatMap(sport=>Array.from({length:4},(_,i)=>({id:sport+i,sport,status:i===3?'live':'scheduled',kickoff:'2026-10-14'})));const markets=spec.sports.flatMap(sport=>Array.from({length:2},(_,i)=>({id:sport+i,sport,type:'event',outcomes:[{}]})));const cycles=selectEditorialCycles(fixtures,markets,m=>m.id.endsWith('1')?4:0);assert.deepEqual(Array.from(cycles,c=>c.sport),Array.from(spec.sports));for(const c of cycles){assert.equal(c.matches[0],c.sport+'1');assert.equal(c.matches[1],c.sport+'3');assert.equal(c.events.length,2);assert(!c.matches.includes(c.compact));assert.equal(c.missions.length,2);}assert.equal(selectEditorialCycles([],[]).length,0);});
test('carousel has only available distinct winner slots',()=>{const markets=spec.carouselSlots.map(slot=>({id:slot.preferred,sport:slot.sport,type:'match',outcomes:[{}]}));assert.equal(selectFeaturedPicks(markets).length,5);assert.equal(new Set(selectFeaturedPicks(markets).map(m=>m.id)).size,5);assert.equal(selectFeaturedPicks([]).length,0);});

const {editorialMatchAccent}=module('../src/features/matches/editorial-accent.ts');
test('tints obey lifecycle, following and supported winner data',()=>{const base={sport:'football',home:{name:'Home',shortName:'HOM',color:'#112233'},away:{name:'Away',shortName:'AWA',color:'#445566'},status:'scheduled'};assert.equal(editorialMatchAccent({...base,status:'live'},true),'var(--ds-color-danger)');assert.equal(editorialMatchAccent(base,true),'var(--ds-color-accent-cyan)');assert.equal(editorialMatchAccent(base,false),'var(--ds-color-border-default)');assert.equal(editorialMatchAccent({...base,status:'finished',homeScore:1,awayScore:2},true),'#445566');assert.equal(editorialMatchAccent({...base,sport:'cricket',status:'finished',homeScore:'201/7',awayScore:'203/5',resultLine:'Away beat Home'},true),'#445566');assert.equal(editorialMatchAccent({...base,status:'finished',homeScore:1,awayScore:1},true),'var(--ds-color-border-default)');});

test('percentage ink reads on yellow, sky blue, red and draw plates',()=>{const {editorialPercentageInk}=module('../src/features/matches/editorial-accent.ts');assert.equal(editorialPercentageInk('#6CABDD'),'var(--ds-color-text-inverse)');assert.equal(editorialPercentageInk('#FDE100'),'var(--ds-color-text-inverse)');assert.equal(editorialPercentageInk('#C8102E'),'var(--ds-color-text-default)');assert.equal(editorialPercentageInk('#64748B'),'var(--ds-color-text-default)');});

test('one available championship Future follows each sport, excludes carousel IDs and supports empty cycles',()=>{
 const markets=spec.sports.flatMap(sport=>[
  {id:sport+'-closed',sport,type:'future',status:'closed',question:'Season champion',outcomes:[{}]},
  {id:sport+'-open',sport,type:'future',status:'upcoming',question:'Season champion',outcomes:[{}]},
  {id:sport+'-ordinary',sport,type:'future',status:'upcoming',question:'Race winner',outcomes:[{}]},
  {id:sport+'-empty',sport,type:'future',status:'upcoming',question:'Title champion',outcomes:[]},
 ]);
 const cycles=selectEditorialCycles([],markets);
 assert.equal(cycles.length,4);for(const cycle of cycles){assert.equal(cycle.future,cycle.sport+'-open');assert.equal(cycle.matches.length,0);assert.equal(cycle.events.length,0);}
 assert.equal(selectSportFuture('football',markets,new Set(['football-open'])).id,'football-ordinary');
 assert.equal(selectSportFuture('football',[]),undefined);
 const featured={id:spec.carouselSlots[0].preferred,sport:'football',type:'future',status:'upcoming',question:'Title champion',outcomes:[{}]};
 assert.notEqual(selectEditorialCycles([],[featured,...markets])[0].future,featured.id);
});

test('personalization priority is evaluated once per unique fixture',()=>{
 const fixtures=Array.from({length:60},(_,i)=>({id:'fixture-'+i,sport:spec.sports[i%4],status:'scheduled',kickoff:'2026-10-15'}));
 const calls=new Map();
 selectEditorialCycles([...fixtures,fixtures[0]],[],m=>{calls.set(m.id,(calls.get(m.id)??0)+1);return 0;});
 assert.equal(calls.size,60);assert([...calls.values()].every(n=>n===1));
});

test('shared layout observers live only while cards subscribe',()=>{
 const file=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/features/matches/editorial-layout.ts');
 const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 let subscribe,created=0,disconnected=0,added=0,removed=0,frame=0;const frames=new Map();
 class Observer {constructor(){created++;}observe(){}disconnect(){disconnected++;}}
 const exported={};const root={};const win={innerWidth:400,addEventListener(){added++;},removeEventListener(){removed++;}};
 vm.runInNewContext(js,{exports:exported,require:id=>id==='react'?{useSyncExternalStore:(fn,snapshot)=>{subscribe=fn;return snapshot();}}:{matchDiscovery:spec},Set,parseFloat,window:win,document:{documentElement:root,head:{},body:{}},getComputedStyle:()=>({fontSize:'16px'}),MutationObserver:Observer,ResizeObserver:Observer,requestAnimationFrame:fn=>{frames.set(++frame,fn);return frame;},cancelAnimationFrame:id=>frames.delete(id)});
 assert.equal(exported.useEditorialSingleColumn(),false);const off=Array.from({length:12},()=>subscribe(()=>{}));
 assert.equal(created,2);assert.equal(added,1);off.slice(0,-1).forEach(fn=>fn());assert.equal(disconnected,0);off.at(-1)();assert.equal(disconnected,2);assert.equal(removed,1);
 win.innerWidth=320;assert.equal(exported.useEditorialSingleColumn(),true);const again=subscribe(()=>{});assert.equal(created,4);again();assert.equal(disconnected,4);
});

const {selectPersonalPredictions,personalPredictionStatus}=module('../src/features/matches/editorial-personal-predictions.ts');
test('saved cards are independent of cycle slots, retain quiz IDs and move from reveal to history',()=>{
 const fixtures=new Map(['old','draft','missing-results'].map(id=>[id,{id,sport:'football',status:id==='draft'?'scheduled':'finished'}]));
 const quizzes=new Map(['old::main','old::paid','draft::main','missing-results::main'].map(key=>[key,{id:key.split('::')[1],title:key,questions:[{type:'multipleChoice',settledOptionIndex:key.startsWith('missing-results')?undefined:0}]}]));
 const predictions=['old::main','old::paid','draft::main','missing-results::main','gone::main'].map((key,i)=>({matchId:key.split('::')[0],quizId:key.split('::')[1],status:key.startsWith('draft')?'open':'locked',submittedAt:'2026-10-15T10:0'+i+':00Z',answers:{q1:0},rewardEarned:0}));
 const select=entries=>selectPersonalPredictions(entries,id=>fixtures.get(id),(m,id)=>quizzes.get(m.id+'::'+id));
 const entries=select([...predictions,predictions[0]]);
 assert.equal(entries.length,4);assert.equal(entries.filter(e=>e.reveal).length,2);
 assert(entries[0].reveal&&entries[1].reveal);assert.equal(new Set(entries.map(e=>e.key)).size,4);
 const settled=select(predictions.map(p=>p.matchId==='old'?{...p,status:'settled',rewardEarned:80}:p));
 assert.equal(settled.filter(e=>e.reveal).length,0);assert.equal(settled.filter(e=>e.prediction.rewardEarned===80).length,2);
 assert.equal(personalPredictionStatus(fixtures.get('old'),settled.find(e=>e.match.id==='old').prediction),'settled');
 assert.equal(personalPredictionStatus(fixtures.get('missing-results'),predictions[3]),'unresolved');
 assert.equal(personalPredictionStatus({...fixtures.get('draft'),status:'live'},predictions[2]),'live');
 assert.equal(selectPersonalPredictions(predictions,id=>fixtures.get(id),(m,id)=>quizzes.get(m.id+'::'+id),()=>false).length,0);
 assert.equal(select([]).length,0);
});

test('kickoff clock preserves midnight, local zones and unavailable timing',()=>{
 const {kickoffClock}=module('../src/features/matches/editorial-format.ts');
 assert.equal(kickoffClock('2026-10-19T19:00:00Z','Asia/Kolkata'),'00:30');
 assert.equal(kickoffClock('2026-10-20T00:30:00Z','UTC'),'00:30');
 assert.equal(kickoffClock('unavailable'),'');
});
