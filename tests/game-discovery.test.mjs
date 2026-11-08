import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { stripTypeScriptTypes } from 'node:module';
import {generate,writeOrCheck,sample} from '../scripts/sync-game-discovery.mjs';
const root=process.cwd();
const {files,data}=generate(path.join(root,'scripts/game-discovery-source'),null,root);
const source=fs.readFileSync(path.join(root,'src/features/games/components/discovery-motion.ts'),'utf8');
const {sampleDiscoveryMotion}=await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(source))}`);
test('all 18 games have distinct complete, local generated artwork',()=>{
  writeOrCheck(files,true);
  assert.equal(Object.keys(data.games).length,18);
  assert.equal(new Set(Object.values(data.games).map(g=>g.flutter)).size,18);
  const perSport={};
  for(const [id,g]of Object.entries(data.games)){
    perSport[g.sport]=(perSport[g.sport]??0)+1;
    assert.deepEqual(g.layers.map(l=>l.id),['setting','subject','action']);
    const master=fs.readFileSync(path.join(root,'scripts/game-discovery-source/masters',id+'.svg'),'utf8');
    assert.ok((master.match(/fill="#[A-Fa-f0-9]{6}"/g)??[]).length>=5,id+' needs substantial fills');
    assert.doesNotMatch(master,/<script|<image|foreignObject|href=|<text|url\(/i);
  }
  assert.deepEqual(perSport,{football:6,cricket:3,basketball:3,motorsport:3,tennis:3});
});
test('web evaluator matches generated stills at every review phase and loop joins',()=>{
  for(const g of Object.values(data.games))for(const l of g.layers){
    for(const phase of [0,.12,.28,.4,.5,.68,.88,.999,1])assert.deepEqual(sampleDiscoveryMotion(l.frames,phase),sample(l.frames,phase));
    assert.deepEqual(sampleDiscoveryMotion(l.frames,0),sampleDiscoveryMotion(l.frames,1));
    const still=sampleDiscoveryMotion(l.frames,.28);
    assert.ok(still.opacity>=0&&still.opacity<=1);
  }
});
test('master aliases and materials are shared tokens; sport variants differ',()=>{
  const source=fs.readFileSync(path.join(root,'src/design-system/tokens/game-discovery.generated.ts'),'utf8');
  const css=fs.readFileSync(path.join(root,'src/design-system/styles/game-discovery.generated.css'),'utf8');
  for(const [id,g]of Object.entries(data.games)){assert.ok(source.includes(`"game-${id}": "${g.accent}"`));assert.ok(css.includes(`--ds-color-accent-game-${id}: ${g.accent}`));}
  const variants=['football-quiz','cricket-quiz','basketball-quiz','motorsport-quiz','tennis-quiz'].map(id=>fs.readFileSync(path.join(root,'scripts/game-discovery-source/masters',id+'.svg'),'utf8'));
  assert.equal(new Set(variants).size,5);
});
