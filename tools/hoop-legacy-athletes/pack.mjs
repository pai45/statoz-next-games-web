import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {NodeIO} from '../../src/features/games/hoop-legacy/source/node_modules/@gltf-transform/core/dist/index.js';
import {ALL_EXTENSIONS} from '../../src/features/games/hoop-legacy/source/node_modules/@gltf-transform/extensions/dist/index.js';
import {dedup, weld, prune, meshopt} from '../../src/features/games/hoop-legacy/source/node_modules/@gltf-transform/functions/dist/index.js';
import {MeshoptEncoder, MeshoptDecoder} from '../../src/features/games/hoop-legacy/source/node_modules/meshoptimizer/index.js';
import {rawToDocument} from '../../src/features/games/hoop-legacy/source/tools/athletes/lib/raw.mjs';

const build = path.resolve('.cache/hoop-legacy-athletes/build');
const output = path.resolve('public/games/hoop-legacy/athletes');
const cache = path.resolve('.cache/hoop-legacy-athletes');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder});
await fs.mkdir(output, {recursive: true});
const manifest = {version: 2, generator: 'tools/hoop-legacy-athletes', bones: JSON.parse(await fs.readFile(path.join(build, 'rig.json'))).bones.map(b => b.name), levels: {},
  license: {file: 'LICENSES.txt', provenance: 'PROVENANCE.json'}, technical: {units: 'normalized height', up: 'Y', forward: '+Z', soleY: -.039, textures: 'lossless WebP; sRGB only for colour maps'}};
async function write(directory, name, extension, bytes) {
  const hash = sha(bytes); const file = `${directory}/${name}.${hash.slice(0,12)}.${extension}`;
  await fs.mkdir(path.dirname(path.join(output, file)), {recursive: true}); await fs.writeFile(path.join(output,file),bytes);
  return {file, bytes: bytes.length, sha256: hash};
}
const metas = await Promise.all((await fs.readdir(path.join(build,'meta'))).filter(f=>f.endsWith('.json')).map(async f=>JSON.parse(await fs.readFile(path.join(build,'meta',f)))));
for (const level of ['lod1','lod0','hero']) {
  const assets = {}, textures = {};let bytes = 0;
  for (const meta of metas) {
    if (!meta.levels[level] || ['smoke','jersey','shorts','brows','lashes','headband','wristbands'].includes(meta.slot)) continue;
    const src = path.join(build,meta.levels[level].raw); const doc = rawToDocument(src);
    if(meta.slot==='body')for(const mesh of doc.getRoot().listMeshes())for(const primitive of mesh.listPrimitives()) {
      const p=primitive.getAttribute('POSITION').getArray(),index=primitive.getIndices(),old=index.getArray(),next=[];
      const covered=i=>{const x=Math.abs(p[i*3]),y=p[i*3+1],z=p[i*3+2];return (y>.328&&y<.615&&x<.14)||(y>=.615&&y<.786&&x<.076)||(x>.052&&x<.098&&y>.805&&y<.865&&z>-.026&&z<.066);};
      for(let i=0;i<old.length;i+=3)if(![old[i],old[i+1],old[i+2]].every(covered))next.push(old[i],old[i+1],old[i+2]);
      index.setArray(new Uint32Array(next));
    }
    await doc.transform(dedup(),weld(),prune({keepAttributes:true,keepLeaves:true}),meshopt({encoder:MeshoptEncoder,level:'high'}));
    let triangles=0,vertices=0;const meshes=[];
    for(const mesh of doc.getRoot().listMeshes()) {
      for(const primitive of mesh.listPrimitives()) {triangles+=(primitive.getIndices()?.getCount()||primitive.getAttribute('POSITION').getCount())/3;vertices+=primitive.getAttribute('POSITION').getCount();}
      meshes.push({name:mesh.getName(),morphs:mesh.getExtras().targetNames||[]});
    }
    const glb=await write(level,meta.name,'glb',Buffer.from(await io.writeBinary(doc)));
    assets[meta.name]={slot:meta.slot,variant:meta.variant||null,license:meta.license,glb,triangles,vertices,drawCalls:meshes.length,meshes,extras:meta.extras||{}};bytes+=glb.bytes;
  }
  for(const region of ['body','head'])for(const role of ['normal','orm','detail']) {
    const resolution=level==='lod1'?1024:role==='orm'||(role==='detail'&&region==='body')?1024:2048;
    const source=path.join(build,'textures',level,`skin_${region}_${role}.png`);
    const image=sharp(source).resize(resolution,resolution);const encoded=await image.webp({lossless:true,effort:5}).toBuffer();
    const record=await write('shared',`${region}-${role}-${resolution}`,'webp',encoded);
    textures[`${region}-${role}`]={...record,width:resolution,height:resolution,srgb:false,gpuBytes:Math.ceil(resolution*resolution*4*4/3)};bytes+=encoded.length;
  }
  for(const [name,source,srgb]of [
    ['eye',path.join(cache,'makehuman/eyes/materials/brown_eye.png'),true],
    ['brow',path.join(cache,'mhsys/eyebrows/eyebrow001/eyebrow001.png'),true],
    ['lash',path.join(cache,'mhsys/eyelashes/eyelashes01/eyelashes01.png'),true],
    ['hair-afro',path.join(cache,'mhsys/hair/afro01/afro_diffuse.png'),true],
  ]) {
    const encoded=await sharp(source).resize(level==='lod1'?256:512,level==='lod1'?256:512,{fit:'fill'}).webp({lossless:true}).toBuffer();
    const record=await write('shared',name,'webp',encoded);textures[name]={...record,width:level==='lod1'?256:512,height:level==='lod1'?256:512,srgb,gpuBytes:Math.ceil((level==='lod1'?256:512)**2*4*4/3)};bytes+=encoded.length;
  }
  manifest.levels[level]={bytes,assets,textures};
  const worst=Object.values(assets).filter(a=>a.slot!=='hair'&&a.slot!=='headband'&&a.slot!=='wristbands').reduce((n,a)=>n+a.triangles,0)+Math.max(...Object.values(assets).filter(a=>a.slot==='hair').map(a=>a.triangles));
  console.log(`${level}: ${(bytes/1048576).toFixed(2)} MiB shared pack, ${Math.round(worst)} triangles/athlete before optional gear`);
}
await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const license=await fs.readFile(path.join(cache,'makehuman/LICENSE.ASSETS.md'),'utf8');
await fs.writeFile(path.join(output,'LICENSES.txt'),'Hoop Legacy authored athletes\n\nBody/head/eye/proxy data: MakeHuman CC0 assets at a8bc2d54ff0ac92e78ff71431b1023eda42bf482.\nSystem skins, brow, lash and afro01 hair cards: MakeHuman system-assets CC0 archive.\nOriginal uniform, footwear, strand hair and gear: generated by tools/hoop-legacy-athletes and dedicated to CC0.\nBlender is an offline build tool; no MakeHuman program code is shipped.\n\n'+license);
const files={};for(const lv of Object.values(manifest.levels))for(const item of [...Object.values(lv.assets).map(a=>a.glb),...Object.values(lv.textures)])files[item.file]=item.sha256;
await fs.writeFile(path.join(output,'PROVENANCE.json'),JSON.stringify({schemaVersion:1,date:'2026-11-06',sourcePlan:'Downloads/hoop legacy/plans/nba2k-grade-athletes.md',sourceCommit:'a8bc2d54ff0ac92e78ff71431b1023eda42bf482',assetLicenseURL:'https://raw.githubusercontent.com/makehumancommunity/makehuman/a8bc2d54ff0ac92e78ff71431b1023eda42bf482/LICENSE.ASSETS.md',systemAssetLicenseURL:'https://www.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html',systemArchiveSha256:'b542127a8e25547c7c29c19f2d1d2adb9a664c80396ecd694095dbc8028a0107',generator:manifest.generator,blender:'4.5.10 LTS',files},null,2)+'\n');
const keep=new Set([...Object.keys(files),'manifest.json','LICENSES.txt','PROVENANCE.json']);
async function pruneGenerated(directory) {
  for(const entry of await fs.readdir(directory,{withFileTypes:true})) {
    const file=path.join(directory,entry.name);
    if(entry.isDirectory())await pruneGenerated(file);
    else if(!keep.has(path.relative(output,file).replaceAll('\\','/')))await fs.unlink(file);
  }
}
await pruneGenerated(output);
