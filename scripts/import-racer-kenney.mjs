/**
 * Packs the Kenney (CC0) models Racer uses into one local GLB and copies its sounds.
 *
 * Usage: node scripts/import-racer-kenney.mjs --source <folder>
 *   <folder>/racing-kit.zip + rk/   Racing Kit 1.2 (opengameart.org/content/racing-kit, uploaded by Kenney)
 *   <folder>/car-kit.zip    + ck/   Car Kit 3.1   (opengameart.org/content/car-kit, uploaded by Kenney)
 *   <folder>/starter/               github.com/KenneyNL/Starter-Kit-Racing (audio/*.ogg, LICENSE)
 *
 * Output (served locally, never fetched from Kenney at runtime):
 *   public/games/f1-racing/kenney/racer-kit.glb, audio/*.ogg, PROVENANCE.json, License.txt
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const root = process.cwd();
const sourceArg = process.argv.indexOf('--source');
if (sourceArg < 0) throw new Error('Pass --source <folder with the extracted Kenney packs>');
const source = path.resolve(process.argv[sourceArg + 1]);
const out = path.join(root, 'public/games/f1-racing/kenney');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// Car Kit vehicles keep their child nodes (body + four named wheels).
const cars = {'car-race': 'race.glb', 'car-race-future': 'race-future.glb'};
// Racing Kit props. Their root translation is a layout position in Kenney's sample scene, so it is dropped.
const props = ['grandStandCovered', 'grandStand', 'pitsGarage', 'pitsGarageCorner', 'pitsOffice', 'overheadLights', 'billboard', 'billboardLow', 'barrierRed', 'barrierWhite', 'treeLarge', 'treeSmall', 'tent', 'tentLong', 'flagCheckers', 'flagGreen', 'flagRed', 'lightRedDouble', 'radarEquipment', 'pylon', 'fenceStraight', 'barrierWall', 'rail'];
// Car Kit debris thrown off in heavy crashes.
const debris = ['debris-tire', 'debris-spoiler-a', 'debris-bumper', 'debris-plate-a', 'debris-plate-small-a', 'debris-door', 'debris-bolt'];
const sounds = ['engine.ogg', 'skid.ogg', 'impact.ogg'];

function readGltf(file) {
  const bytes = fs.readFileSync(file);
  if (file.endsWith('.glb')) {
    const jsonLength = bytes.readUInt32LE(12);
    const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
    const binStart = 20 + jsonLength;
    return {json, buffers: [bytes.subarray(binStart + 8, binStart + 8 + bytes.readUInt32LE(binStart))], dir: path.dirname(file)};
  }
  const json = JSON.parse(bytes.toString());
  return {json, buffers: json.buffers.map(b => fs.readFileSync(path.join(path.dirname(file), b.uri))), dir: path.dirname(file)};
}

const output = {asset: {version: '2.0', generator: 'statoz-games-web import-racer-kenney'}, scene: 0, scenes: [{nodes: []}], nodes: [], meshes: [], accessors: [], bufferViews: [], materials: [], textures: [], images: [], samplers: []};
const chunks = [];
let byteLength = 0;
function pushBytes(bytes, target) {
  const pad = (4 - (byteLength % 4)) % 4;
  if (pad) {chunks.push(Buffer.alloc(pad)); byteLength += pad;}
  output.bufferViews.push({buffer: 0, byteOffset: byteLength, byteLength: bytes.length, ...(target ? {target} : {})});
  chunks.push(bytes); byteLength += bytes.length;
  return output.bufferViews.length - 1;
}
const materialIds = new Map(), imageIds = new Map();
function copyAccessor(src, index, target) {
  const a = src.json.accessors[index], view = src.json.bufferViews[a.bufferView];
  const size = {SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4}[a.type] * {5126: 4, 5125: 4, 5123: 2, 5121: 1}[a.componentType];
  const start = (view.byteOffset || 0) + (a.byteOffset || 0), stride = view.byteStride || size;
  const bytes = Buffer.alloc(size * a.count);
  for (let i = 0; i < a.count; i++) src.buffers[view.buffer].copy(bytes, i * size, start + i * stride, start + i * stride + size);
  const {bufferView, byteOffset, ...rest} = a;
  output.accessors.push({...rest, bufferView: pushBytes(bytes, target)});
  return output.accessors.length - 1;
}
function copyImage(src, imageIndex) {
  const image = src.json.images[imageIndex];
  let bytes, name = image.name || image.uri;
  if (image.uri) bytes = fs.readFileSync(path.join(src.dir, decodeURIComponent(image.uri)));
  else {const v = src.json.bufferViews[image.bufferView]; bytes = src.buffers[v.buffer].subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength);}
  const key = sha(bytes);
  if (!imageIds.has(key)) {output.images.push({name: path.basename(name || 'image'), mimeType: 'image/png', bufferView: pushBytes(bytes)}); imageIds.set(key, output.images.length - 1);}
  return imageIds.get(key);
}
function copyMaterial(src, index, prefix) {
  const m = src.json.materials[index];
  // Kenney's fictional "Tankco" banner becomes a plain 'sign' slot; Racer draws StatOz signage into it.
  const texture = m.pbrMetallicRoughness?.baseColorTexture;
  const textureImage = texture !== undefined ? src.json.images[src.json.textures[texture.index].source] : null;
  const isSign = textureImage && /tankco/i.test(textureImage.uri || textureImage.name || '');
  const name = isSign ? 'sign' : prefix + m.name;
  const key = name + JSON.stringify(m.pbrMetallicRoughness?.baseColorFactor || []);
  if (materialIds.has(key)) return materialIds.get(key);
  const pbr = {...(m.pbrMetallicRoughness || {})};
  if (isSign) {delete pbr.baseColorTexture; pbr.baseColorFactor = [1, 1, 1, 1];}
  else if (texture !== undefined) {
    const srcTexture = src.json.textures[texture.index];
    const sampler = srcTexture.sampler !== undefined ? src.json.samplers[srcTexture.sampler] : {};
    output.samplers.push(sampler);
    output.textures.push({sampler: output.samplers.length - 1, source: copyImage(src, srcTexture.source)});
    pbr.baseColorTexture = {index: output.textures.length - 1};
  }
  output.materials.push({...m, name, pbrMetallicRoughness: pbr});
  materialIds.set(key, output.materials.length - 1);
  return output.materials.length - 1;
}
function copyMesh(src, meshIndex, prefix) {
  const mesh = src.json.meshes[meshIndex];
  const primitives = mesh.primitives.map(p => {
    const attributes = {};
    for (const name of ['POSITION', 'NORMAL', 'TEXCOORD_0']) if (p.attributes[name] !== undefined) attributes[name] = copyAccessor(src, p.attributes[name], 34962);
    return {attributes, indices: copyAccessor(src, p.indices, 34963), material: copyMaterial(src, p.material, prefix), mode: p.mode ?? 4};
  });
  output.meshes.push({name: mesh.name, primitives});
  return output.meshes.length - 1;
}
function copyNode(src, nodeIndex, prefix, keepTranslation) {
  const n = src.json.nodes[nodeIndex], node = {name: n.name};
  if (keepTranslation && n.translation) node.translation = n.translation;
  if (n.rotation) node.rotation = n.rotation;
  if (n.scale) node.scale = n.scale;
  if (n.mesh !== undefined) node.mesh = copyMesh(src, n.mesh, prefix);
  if (n.children) node.children = n.children.map(c => copyNode(src, c, prefix, true));
  output.nodes.push(node);
  return output.nodes.length - 1;
}
function addAsset(name, file, keepTranslation, prefix) {
  const src = readGltf(file), scene = src.json.scenes[src.json.scene || 0];
  const children = scene.nodes.map(n => copyNode(src, n, prefix, keepTranslation));
  output.nodes.push({name, children});
  output.scenes[0].nodes.push(output.nodes.length - 1);
}

for (const [name, file] of Object.entries(cars)) addAsset(name, path.join(source, 'ck/Models/GLB format', file), true, 'car-');
for (const part of debris) addAsset('kit-' + part, path.join(source, 'ck/Models/GLB format', part + '.glb'), false, 'car-');
for (const prop of props) addAsset('kit-' + prop, path.join(source, 'rk/Models/glTF format', prop + '.gltf'), false, 'kit-');

const bin = Buffer.concat(chunks);
const binPadded = Buffer.concat([bin, Buffer.alloc((4 - (bin.length % 4)) % 4)]);
output.buffers = [{byteLength: binPadded.length}];
const jsonBytes = Buffer.from(JSON.stringify(output));
const jsonPadded = Buffer.concat([jsonBytes, Buffer.alloc((4 - (jsonBytes.length % 4)) % 4, 0x20)]);
const header = Buffer.alloc(12); header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + jsonPadded.length + 8 + binPadded.length, 8);
const chunkHeader = (length, type) => {const b = Buffer.alloc(8); b.writeUInt32LE(length, 0); b.writeUInt32LE(type, 4); return b;};
const glb = Buffer.concat([header, chunkHeader(jsonPadded.length, 0x4e4f534a), jsonPadded, chunkHeader(binPadded.length, 0x004e4942), binPadded]);

fs.mkdirSync(path.join(out, 'audio'), {recursive: true});
fs.writeFileSync(path.join(out, 'racer-kit.glb'), glb);
for (const sound of sounds) fs.copyFileSync(path.join(source, 'starter/audio', sound), path.join(out, 'audio', sound));
fs.copyFileSync(path.join(source, 'ck/License.txt'), path.join(out, 'License.txt'));

const zip = name => fs.existsSync(path.join(source, name)) ? sha(fs.readFileSync(path.join(source, name))) : null;
const file = rel => {const bytes = fs.readFileSync(path.join(out, rel)); return {file: rel, sha256: sha(bytes), bytes: bytes.length};};
const triangles = output.accessors.filter((a, i) => output.meshes.some(m => m.primitives.some(p => p.indices === i))).reduce((n, a) => n + a.count / 3, 0);
const provenance = {
  game: 'f1-racing (Racer)',
  version: 1,
  policy: 'Only CC0 assets by Kenney (www.kenney.nl), checked on the original upload pages. Nothing is fetched at runtime; every file is served locally from this folder.',
  author: 'Kenney (www.kenney.nl)',
  license: 'CC0-1.0',
  licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  sources: [
    {title: 'Racing Kit 1.2', page: 'https://opengameart.org/content/racing-kit', download: 'https://opengameart.org/sites/default/files/Racing%20Kit%20%281.2%29.zip', uploader: 'kenney', zipSha256: zip('racing-kit.zip'), used: props},
    {title: 'Car Kit 3.1', page: 'https://opengameart.org/content/car-kit', download: 'https://opengameart.org/sites/default/files/kenney_car-kit_3.1.zip', uploader: 'kenney', zipSha256: zip('car-kit.zip'), used: [...Object.values(cars), ...debris.map(d => d + '.glb')]},
    {title: 'Starter Kit Racing (audio)', page: 'https://github.com/KenneyNL/Starter-Kit-Racing', note: 'Repository code is MIT; its 3D models and sounds are CC0 per the README.', used: sounds.map(s => 'audio/' + s)},
  ],
  adaptations: [
    'racer-kit.glb merges the listed models into one binary glTF. Geometry, UVs and colours are unchanged.',
    'Racing Kit root layout offsets are removed; Racer recentres and scales each prop at runtime.',
    "Kenney's fictional Tankco banner texture is not included; the banner slot is named 'sign' and Racer draws StatOz CIRCUITS signage into it.",
    'Car body paint is recoloured at runtime per livery (saturated paint texels only).',
  ],
  triangles,
  files: [file('racer-kit.glb'), ...sounds.map(s => file('audio/' + s)), file('License.txt')],
};
fs.writeFileSync(path.join(out, 'PROVENANCE.json'), JSON.stringify(provenance, null, 2) + '\n');
console.log(`Racer Kenney kit: ${output.scenes[0].nodes.length} assets, ${triangles} triangles, ${(glb.length / 1024).toFixed(0)} KiB GLB.`);
