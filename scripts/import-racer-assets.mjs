/** Reuse the pinned local research exports without modifying their originals. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd(),source=path.join(root,'.local-game-assets/f1-racing/objects/Mesh');
const selected={body:'resources_assets_190.obj',chassis:'resources_assets_189.obj',frontWheel:'resources_assets_188.obj',rearWheel:'resources_assets_180.obj',grandstand:'resources_assets_186.obj',gantry:'sharedassets1_assets_75.obj'};
const assets={},provenance=[];
for(const [id,name] of Object.entries(selected)){
 const bytes=await fs.readFile(path.join(source,name)),vertices=[],normals=[],indices=[],lookup=new Map(),positions=[],sourceNormals=[];
 for(const line of bytes.toString().split(/\r?\n/)){
  const [kind,...values]=line.trim().split(/\s+/);
  if(kind==='v')vertices.push(values.slice(0,3).map(Number));
  if(kind==='vn')normals.push(values.slice(0,3).map(Number));
  if(kind!=='f')continue;
  const face=values.map(key=>{if(lookup.has(key))return lookup.get(key);const parts=key.split('/'),index=positions.length/3;positions.push(...vertices[Number(parts[0])-1].map(n=>Math.round(n*10000)/10000));sourceNormals.push(...(normals[Number(parts[2])-1]||[0,1,0]).map(n=>Math.round(n*1000)/1000));lookup.set(key,index);return index;});
  for(let i=1;i<face.length-1;i++)indices.push(face[0],face[i],face[i+1]);
 }
 assets[id]={positions,normals:sourceNormals,indices};
 provenance.push({id,source:'.local-game-assets/f1-racing/objects/Mesh/'+name,sha256:createHash('sha256').update(bytes).digest('hex'),vertices:positions.length/3,triangles:indices.length/3,adaptation:'Geometry retained; textures omitted; newly authored materials, placement, lighting and circuit signage.'});
}
const target=path.join(root,'src/features/games/racer');await fs.mkdir(target,{recursive:true});
await fs.writeFile(path.join(target,'assets.json'),JSON.stringify(assets));
await fs.mkdir(path.join(root,'docs/racer'),{recursive:true});
await fs.writeFile(path.join(root,'docs/racer/asset-provenance.json'),JSON.stringify({schemaVersion:1,title:'Racer',originalTitle:'Crazy Grand Prix',scope:'Local adaptation of recovered proprietary reference geometry; original rights and source notices retained. New game code is authored in this checkout.',assets:provenance},null,2)+'\n');
console.log('Racer: imported '+provenance.length+' recovered meshes; '+provenance.reduce((n,a)=>n+a.triangles,0)+' triangles.');
