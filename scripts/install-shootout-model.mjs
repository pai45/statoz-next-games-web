import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=process.cwd(), source=path.join(root,'.cache/penalty-model-v5/export'), assets=path.join(root,'public/assets/games/penalty-shootout');
const readGLB=p=>{const b=fs.readFileSync(p);return JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));};
const baseline=path.join(root,'.cache/penalty-model-v5/baseline');fs.mkdirSync(baseline,{recursive:true});
for(const file of ['athlete.glb','athlete-low.glb']){
  const old=readGLB(path.join(assets,file)), next=readGLB(path.join(source,file));
  assert.deepEqual(next.animations.map(a=>a.name).sort(),old.animations.map(a=>a.name).sort());
  assert.deepEqual(next.skins[0].joints.map(i=>next.nodes[i].name),old.skins[0].joints.map(i=>old.nodes[i].name));
  assert.equal(next.skins[0].joints.length,60);
  if(!fs.existsSync(path.join(baseline,file)))fs.copyFileSync(path.join(assets,file),path.join(baseline,file));
  fs.copyFileSync(path.join(source,file),path.join(assets,file));
}
for(const file of ['hair-strands-normal.png','model-refinement.json'])fs.copyFileSync(path.join(source,file),path.join(assets,file));
fs.copyFileSync(path.join(source,'athlete-source.blend'),path.join(root,'docs/penalty-shootout/assets/athlete-source.blend'));
const manifest=JSON.parse(fs.readFileSync(path.join(assets,'manifest.json'),'utf8'));
manifest.assetVersion=manifest.runtimeVersion='character-model-5';
if(!manifest.model.adaptation.includes('Model v5:'))manifest.model.adaptation+=' Model v5: repaired anatomical eye sockets, fitted irises/pupils and brows, scalp-conforming original hair, distinct jaw/cheek/nose presets, skin vertex tones, smooth jersey panels and slimmed boots. No EA asset data.';
manifest.model.features=[...new Set([...manifest.model.features,'scalp-conforming hair with original directional normal map','anatomical eye sockets with separate pupils','distinct jaw, cheek and nose preset geometry','original face vertex tones'])];
const record=(file,base)=>{const bytes=fs.readFileSync(path.join(base,file));return {path:file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};};
manifest.files=[...new Set([...manifest.files.map(f=>f.path),'hair-strands-normal.png','model-refinement.json'])].map(file=>record(file,assets));
manifest.authoring.files=[...new Set([...manifest.authoring.files.map(f=>f.path),'docs/penalty-shootout/assets/athlete-source-v4.blend','docs/penalty-shootout/assets/refine-athlete.py'])].filter(file=>fs.existsSync(path.join(root,file))).map(file=>record(file,root));
manifest.authoring.note='The historical motion compiler is absent from this migrated checkout. Model v5 retains the existing CPU motion data, skeleton and clip names; refine-athlete.py consumes the preserved v4 editable source and the CC0 foundation.';
fs.writeFileSync(path.join(assets,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const types=path.join(root,'src/features/games/penalty-shootout/game-types.ts');fs.writeFileSync(types,fs.readFileSync(types,'utf8').replace(/RUNTIME_VERSION = "[^"]+"/,'RUNTIME_VERSION = "character-model-5"'));
console.log(JSON.stringify({version:manifest.assetVersion,payloadBytes:manifest.files.reduce((n,f)=>n+f.bytes,0),clips:readGLB(path.join(assets,'athlete.glb')).animations.length}));
