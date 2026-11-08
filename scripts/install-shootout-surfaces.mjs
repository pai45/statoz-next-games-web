import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const source='.cache/penalty-model-v6/export',assets='public/assets/games/penalty-shootout';
const glb=file=>{const b=fs.readFileSync(file);return JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));};
for(const file of ['athlete.glb','athlete-low.glb']){
 const old=glb(path.join(assets,file)),next=glb(path.join(source,file));
 assert.deepEqual(old.animations.map(a=>a.name).sort(),next.animations.map(a=>a.name).sort());
 for(const index of old.skins[0].joints){const a=old.nodes[index],b=next.nodes.find(n=>n.name===a.name);for(const field of ['translation','rotation','scale','matrix'])assert.deepEqual(b[field],a[field]);}
 assert.equal(next.skins[0].joints.length,60);
}
const files=['athlete.glb','athlete-low.glb','face-pigment-v6.png','face-pores-v6.png','face-roughness-v6.png','model-refinement.json'];
for(const file of files)fs.copyFileSync(path.join(source,file),path.join(assets,file));
fs.copyFileSync(path.join(source,'athlete-source.blend'),'docs/penalty-shootout/assets/athlete-source.blend');
const m=JSON.parse(fs.readFileSync(path.join(assets,'manifest.json'),'utf8'));m.assetVersion=m.runtimeVersion='character-surface-6';
if(!m.model.adaptation.includes('Surface v6:'))m.model.adaptation+=' Surface v6: original pigment/roughness/pores face maps, scalp-projected tapered hair locks sharing scalp primitives, cleaned garment shading normals and neck taper. Existing skeleton, motion and contacts retained.';
m.model.features=[...new Set([...m.model.features,'original facial pigment, pore and regional roughness maps','scalp-projected layered hair locks','garment depth and shading refinement'])];
const record=(base,file)=>{const b=fs.readFileSync(path.join(base,file));return {path:file,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};};
m.files=[...new Set([...m.files.map(f=>f.path),...files])].map(file=>record(assets,file));
assert.ok(m.files.reduce((n,f)=>n+f.bytes,0)<15*1024*1024,'Asset budget');
m.authoring.files=[...new Set([...m.authoring.files.map(f=>f.path),'docs/penalty-shootout/assets/refine-surfaces.py','docs/penalty-shootout/assets/athlete-source-v5.blend'])].map(file=>record('.',file));
fs.writeFileSync(path.join(assets,'manifest.json'),JSON.stringify(m,null,2)+'\n');
const file='src/features/games/penalty-shootout/game-types.ts';fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace(/RUNTIME_VERSION = "[^"]+"/,'RUNTIME_VERSION = "character-surface-6"'));
console.log({version:m.assetVersion,assetBytes:m.files.reduce((n,f)=>n+f.bytes,0)});
