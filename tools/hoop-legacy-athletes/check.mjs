import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {NodeIO} from '../../src/features/games/hoop-legacy/source/node_modules/@gltf-transform/core/dist/index.js';
import {ALL_EXTENSIONS} from '../../src/features/games/hoop-legacy/source/node_modules/@gltf-transform/extensions/dist/index.js';
import {MeshoptDecoder} from '../../src/features/games/hoop-legacy/source/node_modules/meshoptimizer/index.js';

const root=path.resolve('public/games/hoop-legacy/athletes');
const manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8'));
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const summary={levels:{},combinedTextureMiB:0,files:0};
const textures=new Map();
assert.equal(manifest.version,2);assert.equal(manifest.bones.length,19);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const checked=new Set();
for(const [level,data]of Object.entries(manifest.levels)) {
  for(const name of ['body','head','uniform','shoes','eyes','faceCards','gear',...'buzz fade waves afro hightop twists braids locs bun'.split(' ').map(n=>'hair-'+n)])assert.ok(data.assets[name],`${level}: ${name}`);
  let bytes=0;
  for(const item of [...Object.values(data.assets).map(a=>a.glb),...Object.values(data.textures)]) {
    const file=path.resolve(root,item.file);assert.ok(file.startsWith(root+path.sep));
    const raw=await fs.readFile(file);assert.equal(raw.length,item.bytes,item.file);assert.equal(sha(raw),item.sha256,item.file);bytes+=raw.length;checked.add(item.file);
  }
  assert.equal(bytes,data.bytes);
  assert.ok(bytes<({lod1:4,lod0:8,hero:20})[level]*1048576,`${level} download budget`);
  const parts=Object.values(data.assets),base=parts.filter(a=>a.slot!=='hair');
  const triangles=base.reduce((n,a)=>n+a.triangles,0)+Math.max(...parts.filter(a=>a.slot==='hair').map(a=>a.triangles));
  const calls=base.reduce((n,a)=>n+a.drawCalls,0)+Math.max(...parts.filter(a=>a.slot==='hair').map(a=>a.drawCalls));
  assert.ok(triangles<({lod1:55000,lod0:110000,hero:300000})[level],`${level} triangle budget: ${triangles}`);
  assert.ok(calls<=({lod1:8,lod0:9,hero:10})[level],`${level} draw-call budget`);
  const head=data.assets.head.meshes.flatMap(m=>m.morphs);
  assert.ok(head.filter(n=>n.startsWith('face_')).length>=28);
  for(const asset of parts) {
    assert.ok(asset.license.startsWith('CC0-1.0'));
    const doc=await io.read(path.join(root,asset.glb.file));
    for(const accessor of doc.getRoot().listAccessors())for(const value of accessor.getArray())assert.ok(Number.isFinite(value),asset.glb.file+' finite data');
    for(const node of doc.getRoot().listNodes())if(node.getMesh()) {
      const skin=node.getSkin();assert.ok(skin,asset.glb.file+' has skin');
      const joints=skin.listJoints();assert.ok(joints.every(j=>manifest.bones.includes(j.getName())));
      for(const primitive of node.getMesh().listPrimitives()) {
        const indices=primitive.getAttribute('JOINTS_0').getArray();assert.ok([...indices].every(i=>i>=0&&i<joints.length));
        const weights=primitive.getAttribute('WEIGHTS_0'),array=weights.getArray();
        const divisor=weights.getNormalized()?(array instanceof Uint8Array?255:65535):1;
        for(let i=0;i<array.length;i+=4)assert.ok(Math.abs((array[i]+array[i+1]+array[i+2]+array[i+3])/divisor-1)<.015,asset.glb.file+' normalized skin weights');
      }
    }
  }
  for(const record of Object.values(data.textures))if(!textures.has(record.sha256))textures.set(record.sha256,record.gpuBytes);
  summary.levels[level]={MiB:bytes/1048576,triangles,calls};
}
summary.files=checked.size;
// All three loaded tiers share identical texture content by SHA-256.
summary.combinedTextureMiB=[...textures.values()].reduce((a,b)=>a+b,0)/1048576;
assert.ok(summary.combinedTextureMiB<=160,'Combined tier texture budget');
const provenance=JSON.parse(await fs.readFile(path.join(root,'PROVENANCE.json'),'utf8'));
for(const file of checked)assert.equal(provenance.files[file],sha(await fs.readFile(path.join(root,file))));
await fs.mkdir('test-results/hoop-legacy-athletes',{recursive:true});
await fs.writeFile('test-results/hoop-legacy-athletes/asset-check.json',JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary,null,2));
