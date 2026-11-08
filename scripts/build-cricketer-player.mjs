// Bakes the Cricketer runtime player (public/games/cricketer/cricketer-player.glb) from the
// downloaded Sketchfab source folder (scene.gltf + scene.bin + textures/).
//
// What it keeps: the low-poly mesh, the 49-joint Mixamo skin, the bat mesh and the batting cycle.
// What it removes: both source textures. The body texture is photographic and the bat texture
// carries real bat brands, so neither ships. The body texture is read here only to decide which
// faces are skin, hair, shirt, sleeve, trousers or shoes; Cricketer's own kit colours are applied
// at runtime from that region id.
//
// Usage: node scripts/build-cricketer-player.mjs <extracted source folder>
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';

export const REGION = {skin: 0, armSkin: 1, hand: 2, hair: 3, stubble: 4, shirt: 5, trim: 6, sleeve: 7, trousers: 8, shoes: 9, shoeAccent: 10};

const source = process.argv[2];
if (!source) throw Error('Pass the extracted "Virat Kohli Cricket Batting Animation - Low Poly" folder.');
const root = process.cwd(), out = path.join(root, 'public/games/cricketer/cricketer-player.glb');
const gltf = JSON.parse(await fs.readFile(path.join(source, 'scene.gltf'), 'utf8'));
const bin = await fs.readFile(path.join(source, 'scene.bin'));
const COMPONENTS = {SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16};
const ARRAYS = {5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array};

function read(index) {
  const a = gltf.accessors[index], view = gltf.bufferViews[a.bufferView], n = COMPONENTS[a.type], Arr = ARRAYS[a.componentType];
  const stride = view.byteStride || n*Arr.BYTES_PER_ELEMENT, base = bin.byteOffset+(view.byteOffset||0)+(a.byteOffset||0), outArr = new Arr(a.count*n);
  for (let i = 0; i < a.count; i++) {
    const copy = new Arr(bin.buffer.slice(base+i*stride, base+i*stride+n*Arr.BYTES_PER_ELEMENT));
    outArr.set(copy, i*n);
  }
  return {data: outArr, n, componentType: a.componentType, type: a.type, count: a.count};
}

// ---- Body mesh and joint naming ------------------------------------------------------------
const bodyMeshIndex = gltf.meshes.findIndex(m => /Virat/i.test(m.name));
const batMeshIndex = gltf.meshes.findIndex(m => /Bat/i.test(m.name));
if (bodyMeshIndex < 0 || batMeshIndex < 0) throw Error('Unexpected source: body or bat mesh missing.');
const body = gltf.meshes[bodyMeshIndex].primitives[0];
const indices = read(body.indices).data, position = read(body.attributes.POSITION).data, uv = read(body.attributes.TEXCOORD_0).data;
const joints = read(body.attributes.JOINTS_0).data, weights = read(body.attributes.WEIGHTS_0).data;
const skin = gltf.skins[0];
const jointName = skin.joints.map(j => gltf.nodes[j].name.replace(/^mixamorig:/, '').replace(/_\d+$/, ''));
const group = name => /^(Head|HeadTop|Neck)/.test(name) ? 'head' : /^(Spine|Hips)/.test(name) ? 'torso' : /Shoulder$/.test(name) ? 'torso'
  : /(Left|Right)Arm$/.test(name) ? 'upperArm' : /ForeArm$/.test(name) ? 'foreArm' : /Hand/.test(name) ? 'hand'
  : /(UpLeg|Leg)$/.test(name) ? 'leg' : /(Foot|Toe)/.test(name) ? 'foot' : 'torso';

// Bind-space joint positions (inverse of the inverse bind matrices) give the body's axes.
const ibm = read(skin.inverseBindMatrices).data;
function bindPosition(name) {
  const j = jointName.indexOf(name); if (j < 0) throw Error('Missing joint '+name);
  const m = ibm.subarray(j*16, j*16+16);
  // Inverse of an affine column-major matrix: p = -R^T t (bones carry no shear here).
  const r = [[m[0], m[4], m[8]], [m[1], m[5], m[9]], [m[2], m[6], m[10]]], t = [m[12], m[13], m[14]];
  const s2 = [0, 1, 2].map(c => r[0][c]**2+r[1][c]**2+r[2][c]**2);
  return [0, 1, 2].map(c => -(r[0][c]*t[0]+r[1][c]*t[1]+r[2][c]*t[2])/s2[c]);
}
const P = n => bindPosition(n);
const toe = P('LeftToeBase'), foot = P('LeftFoot'), forward = Math.sign(toe[2]-foot[2]) || 1;
const head = P('Head'), neck = P('Neck'), spine1 = P('Spine1'), spine2 = P('Spine2');
// HeadTop_End carries no bind data; the crown is the highest vertex.
let crown = -Infinity; for (let i = 1; i < position.length; i += 3) crown = Math.max(crown, position[i]);

// ---- Texture classification ----------------------------------------------------------------
const texture = gltf.images[gltf.textures[gltf.materials[body.material].pbrMetallicRoughness.baseColorTexture.index].source].uri;
const {data: pixels, info} = await sharp(path.join(source, texture)).removeAlpha().raw().toBuffer({resolveWithObject: true});
function colourClass(u, v) {
  const x = Math.min(info.width-1, Math.max(0, Math.floor((u-Math.floor(u))*info.width)));
  const y = Math.min(info.height-1, Math.max(0, Math.floor((v-Math.floor(v))*info.height)));
  const o = (y*info.width+x)*3, r = pixels[o], g = pixels[o+1], b = pixels[o+2], lum = .299*r+.587*g+.114*b;
  if (lum < 42) return 'dark';
  if (r > 150 && g < 95 && b < 95) return 'red';
  if (lum > 185 && Math.max(r, g, b)-Math.min(r, g, b) < 40) return 'white';
  if (b > r+6 && b >= g-4 && lum < 120) return 'navy';
  if (r > g+14 && g > b-4 && r > 85) return 'skin';
  if (g >= r-8 && g > b+6 && lum < 160) return 'olive';
  return lum < 80 ? 'dark' : 'other';
}
const triangles = indices.length/3, region = new Uint8Array(triangles);
const SAMPLES = [[1/3, 1/3, 1/3], [.6, .2, .2], [.2, .6, .2], [.2, .2, .6], [.45, .45, .1], [.1, .45, .45], [.45, .1, .45]];
const centroid = new Float32Array(triangles*3), normal = new Float32Array(triangles*3);
for (let t = 0; t < triangles; t++) {
  const v = [indices[t*3], indices[t*3+1], indices[t*3+2]];
  const votes = {};
  for (const w of SAMPLES) {
    const u0 = w[0]*uv[v[0]*2]+w[1]*uv[v[1]*2]+w[2]*uv[v[2]*2], v0 = w[0]*uv[v[0]*2+1]+w[1]*uv[v[1]*2+1]+w[2]*uv[v[2]*2+1];
    const c = colourClass(u0, v0); votes[c] = (votes[c]||0)+1;
  }
  const colour = Object.entries(votes).sort((a, b) => b[1]-a[1])[0][0];
  const groups = {};
  for (const i of v) for (let k = 0; k < 4; k++) {const g = group(jointName[joints[i*4+k]]); groups[g] = (groups[g]||0)+weights[i*4+k];}
  const g = Object.entries(groups).sort((a, b) => b[1]-a[1])[0][0];
  const p = v.map(i => [position[i*3], position[i*3+1], position[i*3+2]]);
  const c = [0, 1, 2].map(k => (p[0][k]+p[1][k]+p[2][k])/3); centroid.set(c, t*3);
  const e1 = [0, 1, 2].map(k => p[1][k]-p[0][k]), e2 = [0, 1, 2].map(k => p[2][k]-p[0][k]);
  const nrm = [e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0]], len = Math.hypot(...nrm)||1; normal.set(nrm.map(x => x/len), t*3);
  let r;
  if (g === 'head') {
    const back = (c[2]-head[2])*forward < -.035;
    if (colour === 'olive' || colour === 'white' || colour === 'red') r = c[1] < neck[1]+.035 ? REGION.trim : REGION.skin;
    else if (colour === 'dark' || colour === 'navy') r = back || c[1] > head[1]+(crown-head[1])*.4 ? REGION.hair : REGION.stubble;
    else r = REGION.skin;
  } else if (g === 'torso') {
    // Kit layout is Cricketer's own: plain shirt, a collar band at the neck, trousers below the waist.
    const waist = P('Hips')[1]-.02;
    r = colour === 'skin' && c[1] > spine2[1] ? REGION.skin : c[1] < waist && colour !== 'olive' ? REGION.trousers : c[1] > neck[1]-.06 && Math.abs(c[0]-neck[0]) < .085 ? REGION.trim : REGION.shirt;
  }
  else if (g === 'upperArm') r = colour === 'skin' ? REGION.armSkin : REGION.sleeve;
  else if (g === 'foreArm') r = REGION.armSkin;
  else if (g === 'hand') r = REGION.hand;
  else if (g === 'leg') r = REGION.trousers;
  else r = colour === 'red' ? REGION.shoeAccent : REGION.shoes;
  region[t] = r;
}

// Clean up texture speckle: a face that disagrees with every neighbour takes the local majority.
const key = i => `${Math.round(position[i*3]*2000)},${Math.round(position[i*3+1]*2000)},${Math.round(position[i*3+2]*2000)}`;
const byVertex = new Map();
for (let t = 0; t < triangles; t++) for (let k = 0; k < 3; k++) {const id = key(indices[t*3+k]); if (!byVertex.has(id)) byVertex.set(id, []); byVertex.get(id).push(t);}
const SMOOTHABLE = new Set([REGION.skin, REGION.hair, REGION.stubble, REGION.shirt, REGION.trim, REGION.sleeve, REGION.armSkin]);
for (let pass = 0; pass < 3; pass++) {
  const next = region.slice();
  for (let t = 0; t < triangles; t++) {
    if (!SMOOTHABLE.has(region[t])) continue;
    const counts = {};
    for (let k = 0; k < 3; k++) for (const n of byVertex.get(key(indices[t*3+k]))) if (n !== t) counts[region[n]] = (counts[region[n]]||0)+1;
    const total = Object.values(counts).reduce((a, b) => a+b, 0), [best, count] = Object.entries(counts).sort((a, b) => b[1]-a[1])[0] || [region[t], 0];
    if (!counts[region[t]] || (counts[region[t]] < total*.2 && count > total*.6)) if (SMOOTHABLE.has(+best)) next[t] = +best;
  }
  region.set(next);
}

// Back-of-shirt decal coordinates for the runtime number (outside 0..1 = no lettering).
const kitUV = new Float32Array(triangles*3*2).fill(-4);
const backTop = neck[1]-.05, backBottom = spine1[1]-.06;
for (let t = 0; t < triangles; t++) {
  if (region[t] !== REGION.shirt && region[t] !== REGION.trim) continue;
  if (normal[t*3+2]*forward > -.25 || centroid[t*3+1] < backBottom-.05 || centroid[t*3+1] > backTop+.05) continue;
  for (let k = 0; k < 3; k++) {
    const i = indices[t*3+k];
    kitUV[(t*3+k)*2] = .5+position[i*3]*forward/.30;
    kitUV[(t*3+k)*2+1] = (position[i*3+1]-backBottom)/(backTop-backBottom);
  }
}

// ---- Rebuild the binary ----------------------------------------------------------------------
const chunks = [], views = [], accessors = [];
let offset = 0;
function push(array, type, componentType, {target, minmax = false, normalized = false} = {}) {
  const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength), pad = (4-(offset%4))%4;
  if (pad) {chunks.push(Buffer.alloc(pad)); offset += pad;}
  views.push({buffer: 0, byteOffset: offset, byteLength: bytes.length, ...(target ? {target} : {})});
  chunks.push(bytes); offset += bytes.length;
  const n = COMPONENTS[type], accessor = {bufferView: views.length-1, componentType, count: array.length/n, type, ...(normalized ? {normalized} : {})};
  if (minmax) {const min = Array(n).fill(Infinity), max = Array(n).fill(-Infinity); for (let i = 0; i < array.length; i++) {min[i%n] = Math.min(min[i%n], array[i]); max[i%n] = Math.max(max[i%n], array[i]);} accessor.min = min; accessor.max = max;}
  accessors.push(accessor); return accessors.length-1;
}
// Flat, de-indexed body so each face keeps one kit colour.
// Normals are omitted: the faceted material derives one normal per face. Joints and weights fit in bytes.
const flat = {POSITION: new Float32Array(triangles*9), JOINTS_0: new Uint8Array(triangles*12), WEIGHTS_0: new Uint8Array(triangles*12), _REGION: new Float32Array(triangles*3)};
for (let t = 0; t < triangles; t++) for (let k = 0; k < 3; k++) {
  const i = indices[t*3+k], o = t*3+k;
  flat.POSITION.set(position.subarray(i*3, i*3+3), o*3); flat.JOINTS_0.set(joints.subarray(i*4, i*4+4), o*4); flat._REGION[o] = region[t];
  const w = [0, 1, 2, 3].map(k => Math.round(weights[i*4+k]*255)), heaviest = w.indexOf(Math.max(...w));
  w[heaviest] += 255-w.reduce((a, b) => a+b, 0); flat.WEIGHTS_0.set(w, o*4);
}
const bodyPrimitive = {attributes: {
  POSITION: push(flat.POSITION, 'VEC3', 5126, {target: 34962, minmax: true}),
  JOINTS_0: push(flat.JOINTS_0, 'VEC4', 5121, {target: 34962}), WEIGHTS_0: push(flat.WEIGHTS_0, 'VEC4', 5121, {target: 34962, normalized: true}),
  _REGION: push(flat._REGION, 'SCALAR', 5126, {target: 34962}), _KITUV: push(kitUV, 'VEC2', 5126, {target: 34962}),
}, material: 0, mode: 4};
const batSource = gltf.meshes[batMeshIndex].primitives[0];
const batPrimitive = {attributes: {
  POSITION: push(read(batSource.attributes.POSITION).data, 'VEC3', 5126, {target: 34962, minmax: true}),
  NORMAL: push(read(batSource.attributes.NORMAL).data, 'VEC3', 5126, {target: 34962}),
  TEXCOORD_0: push(read(batSource.attributes.TEXCOORD_0).data, 'VEC2', 5126, {target: 34962}),
}, indices: push(Uint16Array.from(read(batSource.indices).data), 'SCALAR', 5123, {target: 34963}), material: 1, mode: 4};

const inverseBind = push(ibm, 'MAT4', 5126);
// One merged clip; constant channels become the node's rest transform.
const channels = [], samplers = [], inputs = new Map();
let duration = 0;
for (const animation of gltf.animations) for (const channel of animation.channels) {
  const sampler = animation.samplers[channel.sampler], values = read(sampler.output), time = read(sampler.input);
  duration = Math.max(duration, time.data[time.data.length-1]);
  const n = values.n, first = values.data.subarray(0, n);
  let constant = true; for (let i = n; i < values.data.length && constant; i++) if (Math.abs(values.data[i]-first[i%n]) > 1e-5) constant = false;
  const node = gltf.nodes[channel.target.node];
  if (constant) {node[channel.target.path] = [...first]; continue;}
  const inputKey = createHash('sha1').update(Buffer.from(time.data.buffer)).digest('hex');
  if (!inputs.has(inputKey)) inputs.set(inputKey, push(time.data, 'SCALAR', 5126, {minmax: true}));
  samplers.push({input: inputs.get(inputKey), output: push(values.data, values.type, 5126), interpolation: sampler.interpolation||'LINEAR'});
  channels.push({sampler: samplers.length-1, target: channel.target});
}

const rename = {'Sketchfab_model': 'Cricketer_Root', 'Virat Playing Cricket': 'Cricketer_Rig', 'ViratKohli': 'Cricketer_Body', 'Cricket Bat': 'Cricketer_Bat', 'Cricket Bat_Cricket Bat_0': 'Cricketer_Bat_Mesh'};
const nodes = gltf.nodes.map(node => {
  const copy = {...node};
  copy.name = rename[node.name] || (/\.fbx$/.test(node.name) ? 'Cricketer_Model' : node.name.replace(/^mixamorig:/, ''));
  if (copy.mesh === bodyMeshIndex) copy.mesh = 0; else if (copy.mesh === batMeshIndex) copy.mesh = 1; else if (copy.mesh !== undefined) delete copy.mesh;
  if (copy.skin !== undefined) copy.skin = 0;
  return copy;
});
const credit = 'Based on "Virat Kohli Cricket Batting Animation - Low Poly" (https://sketchfab.com/3d-models/virat-kohli-cricket-batting-animation-low-poly-a21f5e7ee14f4b6aa5cf6c94a1016932) by bhagathartworks (https://sketchfab.com/bhagathartworks), CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). Adapted for Cricketer: source textures removed, kit regions baked, flat low-poly faces, constant animation channels removed.';
const json = {
  asset: {version: '2.0', generator: 'Cricketer build-cricketer-player.mjs', copyright: credit},
  scene: 0, scenes: [{name: 'Cricketer', nodes: gltf.scenes[gltf.scene||0].nodes}], nodes,
  meshes: [{name: 'Cricketer_Body', primitives: [bodyPrimitive]}, {name: 'Cricketer_Bat', primitives: [batPrimitive]}],
  materials: [
    {name: 'Cricketer_Body', pbrMetallicRoughness: {baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: .82}},
    {name: 'Cricketer_Bat', pbrMetallicRoughness: {baseColorFactor: [.86, .74, .53, 1], metallicFactor: 0, roughnessFactor: .7}},
  ],
  skins: [{...skin, inverseBindMatrices: inverseBind}],
  animations: [{name: 'bat_drive_cycle', channels, samplers}],
  accessors, bufferViews: views, buffers: [{byteLength: offset}],
};
const jsonBytes = Buffer.from(JSON.stringify(json)), jsonPad = (4-jsonBytes.length%4)%4, binBytes = Buffer.concat(chunks), binPad = (4-binBytes.length%4)%4;
const glb = Buffer.concat([
  Buffer.from(new Uint32Array([0x46546C67, 2, 12+8+jsonBytes.length+jsonPad+8+binBytes.length+binPad]).buffer),
  Buffer.from(new Uint32Array([jsonBytes.length+jsonPad, 0x4E4F534A]).buffer), jsonBytes, Buffer.alloc(jsonPad, 0x20),
  Buffer.from(new Uint32Array([binBytes.length+binPad, 0x004E4942]).buffer), binBytes, Buffer.alloc(binPad),
]);
await fs.writeFile(out, glb);
const counts = {}; for (const r of region) counts[Object.keys(REGION).find(k => REGION[k] === r)] = (counts[Object.keys(REGION).find(k => REGION[k] === r)]||0)+1;
console.log(JSON.stringify({file: path.relative(root, out), bytes: glb.length, sha256: createHash('sha256').update(glb).digest('hex'), triangles, duration: +duration.toFixed(4), channels: channels.length, forward, regions: counts}, null, 1));

// Record the reviewed runtime inputs; the bundle build refuses files that do not match.
const directory = path.dirname(out), manifest = {schemaVersion: 2, source: 'Sketchfab a21f5e7ee14f4b6aa5cf6c94a1016932 (CC-BY-4.0, bhagathartworks); baked by scripts/build-cricketer-player.mjs', sourceTexturesIncluded: false, files: []};
for (const file of ['cricketer-player.glb', 'PLAYER-LICENSE.txt']) {const bytes = await fs.readFile(path.join(directory, file)); manifest.files.push({path: file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex')});}
await fs.writeFile(path.join(directory, 'characters-manifest.json'), JSON.stringify(manifest, null, 2)+'\n');
