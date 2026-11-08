/**
 * Explicit, reproducible art import. Not part of the normal/offline game build.
 * Quaternius' CC0 meshes are fitted to Vibe's existing contact skeleton; no
 * downloaded animation or third-party game code is used.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/examples/jsm/exporters/GLTFExporter.js';
import sharp from 'sharp';

const cache = '.cache/vibe-revamp';
const output = 'public/games/vibe-basketball/art';
const revision = '54368c0875c5f72be00160fafb040c6ce5c4e760';
const mirror = `https://raw.githubusercontent.com/BoQsc/gpu-marching-cubes/${revision}/models/entities/player/Universal%20Base%20Characters%5BStandard%5D/`;
const sourceFiles = [
  'License_Standard.txt',
  ...['Male', 'Female'].flatMap(sex => [
    `Base Characters/Godot - UE/Superhero_${sex}_FullBody.gltf`,
    `Base Characters/Godot - UE/Superhero_${sex}_FullBody.bin`,
    `Base Characters/Godot - UE/T_Superhero_${sex}_${sex === 'Male' ? 'Dark' : 'Dark_BaseColor'}.png`,
    `Base Characters/Godot - UE/T_Superhero_${sex}_Normal.png`,
  ]),
  'Base Characters/Godot - UE/T_Eye_Brown.png',
];
const J = {
  Hips: [0, 1.04, 0], Spine: [0, 1.16, 0], Spine1: [0, 1.28, 0],
  Spine2: [0, 1.40, 0], Neck: [0, 1.53, 0], Head: [0, 1.60, 0],
  LeftShoulder: [.045, 1.465, 0], LeftArm: [.205, 1.49, 0],
  LeftForeArm: [.232, 1.18, .022], LeftHand: [.252, .905, .052],
  RightShoulder: [-.045, 1.465, 0], RightArm: [-.205, 1.49, 0],
  RightForeArm: [-.232, 1.18, .022], RightHand: [-.252, .905, .052],
  LeftUpLeg: [.115, .99, 0], LeftLeg: [.115, .53, .014],
  LeftFoot: [.115, .095, -.018], LeftToeBase: [.115, .045, .13],
  RightUpLeg: [-.115, .99, 0], RightLeg: [-.115, .53, .014],
  RightFoot: [-.115, .095, -.018], RightToeBase: [-.115, .045, .13],
};
const parents = {
  Hips: null, Spine: 'Hips', Spine1: 'Spine', Spine2: 'Spine1', Neck: 'Spine2', Head: 'Neck',
  LeftShoulder: 'Spine2', LeftArm: 'LeftShoulder', LeftForeArm: 'LeftArm', LeftHand: 'LeftForeArm',
  RightShoulder: 'Spine2', RightArm: 'RightShoulder', RightForeArm: 'RightArm', RightHand: 'RightForeArm',
  LeftUpLeg: 'Hips', LeftLeg: 'LeftUpLeg', LeftFoot: 'LeftLeg', LeftToeBase: 'LeftFoot',
  RightUpLeg: 'Hips', RightLeg: 'RightUpLeg', RightFoot: 'RightLeg', RightToeBase: 'RightFoot',
};
const mapping = {
  root: 'Hips', pelvis: 'Hips', spine_01: 'Spine', spine_02: 'Spine1',
  spine_03: 'Spine2', neck_01: 'Neck', Head: 'Head',
};
const links = {
  pelvis: 'spine_01', spine_01: 'spine_02', spine_02: 'spine_03',
  spine_03: 'neck_01', neck_01: 'Head',
};
for (const [suffix, side] of [['l', 'Left'], ['r', 'Right']]) {
  for (const [source, target, next] of [
    ['clavicle', 'Shoulder', 'upperarm'], ['upperarm', 'Arm', 'lowerarm'],
    ['lowerarm', 'ForeArm', 'hand'], ['thigh', 'UpLeg', 'calf'],
    ['calf', 'Leg', 'foot'], ['foot', 'Foot', 'ball'],
  ]) {
    mapping[`${source}_${suffix}`] = side + target;
    links[`${source}_${suffix}`] = `${next}_${suffix}`;
  }
  mapping[`hand_${suffix}`] = side + 'Hand';
  mapping[`ball_${suffix}`] = mapping[`ball_leaf_${suffix}`] = side + 'ToeBase';
}
const vector = a => new THREE.Vector3().fromArray(a);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
globalThis.ProgressEvent ??= class ProgressEvent {
  constructor(type, data) { this.type = type; Object.assign(this, data); }
};
globalThis.FileReader ??= class FileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); });
  }
};

await fs.mkdir(cache, {recursive: true});
await fs.mkdir(output, {recursive: true});
const basketballUrl = 'https://static.poly.pizza/23cf3830-1385-406c-b458-5c42b6eec051.glb';
if (process.argv.includes('--download')) {
  const response = await fetch(basketballUrl);
  if (!response.ok) throw Error(`Basketball download failed: ${response.status}`);
  await fs.writeFile(`${cache}/basketball.glb`, Buffer.from(await response.arrayBuffer()));
}
const acquisitions = [];
for (const file of sourceFiles) {
  const local = path.join(cache, path.basename(file));
  const url = mirror + file.split('/').map(encodeURIComponent).join('/');
  if (process.argv.includes('--download')) {
    const response = await fetch(url);
    if (!response.ok) throw Error(`Asset download failed: ${response.status} ${file}`);
    await fs.writeFile(local, Buffer.from(await response.arrayBuffer()));
  }
  const bytes = await fs.readFile(local);
  acquisitions.push({file: path.basename(file), url, sha256: digest(bytes)});
}

for (const sex of ['Male', 'Female']) {
  const json = JSON.parse(await fs.readFile(`${cache}/Superhero_${sex}_FullBody.gltf`, 'utf8'));
  for (const buffer of json.buffers) {
    buffer.uri = 'data:application/octet-stream;base64,' + (await fs.readFile(path.join(cache, buffer.uri))).toString('base64');
  }
  json.materials = json.materials.map((material, i) => ({
    name: ['brows', 'eyes', 'skin'][i],
    pbrMetallicRoughness: {baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: .8},
  }));
  delete json.images; delete json.textures; delete json.animations;
  const model = await new GLTFLoader().parseAsync(JSON.stringify(json), '');
  model.scene.updateMatrixWorld(true);
  const sourceBones = {};
  model.scene.traverse(node => { if (node.isBone) sourceBones[node.name] = node; });
  const sourcePosition = name => sourceBones[name].getWorldPosition(new THREE.Vector3());
  const transforms = {};
  const targetPositions = Object.fromEntries(Object.entries(J).map(([name, position]) => [name, vector(position)]));
  const targetParents = {...parents};
  const boneMap = {...mapping};

  for (const [name, target] of Object.entries(mapping)) {
    const a = sourcePosition(name);
    let b, end;
    if (links[name]) {
      b = sourcePosition(links[name]);
      end = targetPositions[mapping[links[name]]];
    } else if (name.startsWith('hand_')) {
      const sign = name.endsWith('_l') ? 1 : -1;
      b = a.clone().add(new THREE.Vector3(sign * .18, 0, 0));
      end = targetPositions[target].clone().add(new THREE.Vector3(sign * .004, -.165, .023));
    } else {
      b = a.clone().add(new THREE.Vector3(0, .1, 0));
      end = targetPositions[target].clone().add(new THREE.Vector3(0, .1, 0));
    }
    const from = b.clone().sub(a), to = end.clone().sub(targetPositions[target]);
    const rotation = new THREE.Quaternion().setFromUnitVectors(from.clone().normalize(), to.clone().normalize());
    const scale = to.length() / from.length();
    transforms[name] = point => {
      const delta = point.clone().sub(a), axis = from.clone().normalize();
      // Change segment length without inflating the artist's anatomy.
      delta.addScaledVector(axis, delta.dot(axis) * (scale - 1));
      return delta.applyQuaternion(rotation).add(targetPositions[target]);
    };
  }

  for (const [suffix, side] of [['l', 'Left'], ['r', 'Right']]) {
    for (const finger of ['index', 'middle', 'ring', 'pinky', 'thumb']) {
      for (let joint = 1; joint <= 4; joint++) {
        const name = `${finger}_0${joint}${joint === 4 ? '_leaf' : ''}_${suffix}`;
        const target = `${side}${finger[0].toUpperCase() + finger.slice(1)}${joint}`;
        boneMap[name] = target;
        targetPositions[target] = transforms[`hand_${suffix}`](sourcePosition(name));
        targetParents[target] = joint === 1 ? side + 'Hand' : `${side}${finger[0].toUpperCase() + finger.slice(1)}${joint - 1}`;
        transforms[name] = transforms[`hand_${suffix}`];
      }
    }
  }
  const scene = new THREE.Scene(), armature = new THREE.Group();
  scene.add(armature);
  const bones = Object.fromEntries(Object.keys(targetParents).map(name => {
    const bone = new THREE.Bone(); bone.name = name; return [name, bone];
  }));
  for (const [name, parent] of Object.entries(targetParents)) {
    bones[name].position.copy(targetPositions[name]);
    if (parent) { bones[name].position.sub(targetPositions[parent]); bones[parent].add(bones[name]); }
    else armature.add(bones[name]);
  }
  scene.updateMatrixWorld(true);
  const boneList = Object.values(bones), targetIndex = Object.fromEntries(boneList.map((bone, i) => [bone.name, i]));
  const skeleton = new THREE.Skeleton(boneList);
  let triangles = 0;
  model.scene.traverse(mesh => {
    if (!mesh.isSkinnedMesh) return;
    const geometry = mesh.geometry.clone();
    const positions = geometry.attributes.position;
    const sourceIndices = geometry.attributes.skinIndex, sourceWeights = geometry.attributes.skinWeight;
    const indices = new Uint16Array(positions.count * 4), weights = new Float32Array(positions.count * 4);
    for (let i = 0; i < positions.count; i++) {
      const original = new THREE.Vector3().fromBufferAttribute(positions, i);
      const fitted = new THREE.Vector3(), combined = new Map();
      for (let slot = 0; slot < 4; slot++) {
        const weight = sourceWeights.getComponent(i, slot);
        if (weight < 1e-6) continue;
        const name = mesh.skeleton.bones[sourceIndices.getComponent(i, slot)].name;
        if (!transforms[name] || !boneMap[name]) throw Error(`Unmapped source bone: ${name}`);
        fitted.addScaledVector(transforms[name](original), weight);
        const index = targetIndex[boneMap[name]];
        combined.set(index, (combined.get(index) || 0) + weight);
      }
      positions.setXYZ(i, fitted.x, fitted.y, fitted.z);
      [...combined].forEach(([index, weight], slot) => {
        indices[i * 4 + slot] = index; weights[i * 4 + slot] = weight;
      });
    }
    geometry.setAttribute('skinIndex', new THREE.BufferAttribute(indices, 4));
    geometry.setAttribute('skinWeight', new THREE.BufferAttribute(weights, 4));
    // Recompute normals after the T-pose → neutral basketball stance fitting.
    geometry.deleteAttribute('tangent');
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({color: 0xffffff, roughness: .8});
    material.name = mesh.material.name;
    const fittedMesh = new THREE.SkinnedMesh(geometry, material);
    fittedMesh.name = material.name;
    fittedMesh.bind(skeleton);
    armature.add(fittedMesh);
    triangles += geometry.index.count / 3;
  });
  scene.userData = {author: 'Quaternius', license: 'CC0-1.0', fittedTo: 'Vibe Basketball contact rig', triangles};
  const bytes = await new GLTFExporter().parseAsync(scene, {binary: true});
  await fs.writeFile(`${output}/athlete-${sex.toLowerCase()}.glb`, Buffer.from(bytes));
  const colorFile = `T_Superhero_${sex}_${sex === 'Male' ? 'Dark' : 'Dark_BaseColor'}.png`;
  await sharp(`${cache}/${colorFile}`).resize(1024).webp({quality: 88}).toFile(`${output}/skin-${sex.toLowerCase()}.webp`);
  await sharp(`${cache}/T_Superhero_${sex}_Normal.png`).resize(1024).webp({lossless: true}).toFile(`${output}/normal-${sex.toLowerCase()}.webp`);
  console.log(`Fitted ${sex}: ${triangles} triangles, ${boneList.length} bones (including articulated fingers)`);
}
await sharp(`${cache}/T_Eye_Brown.png`).resize(256).webp({quality: 92}).toFile(`${output}/eyes.webp`);
await fs.copyFile(`${cache}/basketball.glb`, `${output}/basketball.glb`);
await fs.copyFile(`${cache}/License_Standard.txt`, `${output}/QUATERNIUS-LICENSE.txt`);
const files = {};
for (const file of await fs.readdir(output)) {
  if (file === 'PROVENANCE.json' || file === 'CREDITS.txt') continue;
  files[file] = digest(await fs.readFile(path.join(output, file)));
}
await fs.writeFile(`${output}/CREDITS.txt`, [
  'Vibe Basketball — additional art credits',
  '',
  'Athlete bodies, faces, eyes and skin textures: Quaternius, Universal Base Characters [Standard].',
  'CC0 1.0 Universal: https://creativecommons.org/publicdomain/zero/1.0/',
  'Original source and license verified at https://quaternius.com/packs/universalbasecharacters.html',
  'https://quaternius.itch.io/universal-base-characters',
  'Adaptations: fitted to Vibe’s contact skeleton, articulated fingers, resized textures.',
  'Basketball uniforms, hair, shoes, lobby staging and basketball animation: original local work.',
  '',
  'Basketball by Zer0_Time (https://poly.pizza/m/wNXXIhP0ip)',
  'CC BY 3.0: https://creativecommons.org/licenses/by/3.0/',
  'Used as the lobby warmup ball; normalized size, material roughness and original seam overlays.',
  'Gameplay/contest basketball remains upstream so scoring colours and physics are preserved.',
  '',
  'Upstream game and Three.js credits remain in LICENSES.txt.',
].join('\n') + '\n');
files['CREDITS.txt'] = digest(await fs.readFile(`${output}/CREDITS.txt`));
await fs.writeFile(`${output}/PROVENANCE.json`, JSON.stringify({
  version: 1,
  author: 'Quaternius',
  license: 'CC0-1.0',
  originalSource: 'https://quaternius.com/packs/universalbasecharacters.html',
  acquisitionNote: 'The original free itch.io download endpoint was unavailable in the environment. Standard CC0 source bytes were acquired from the pinned public mirror below, with the original author’s license preserved.',
  mirrorRevision: revision,
  acquisitions,
  basketball: {
    author: 'Zer0_Time', license: 'CC-BY-3.0', source: 'https://poly.pizza/m/wNXXIhP0ip',
    download: basketballUrl,
    sourceSha256: digest(await fs.readFile(`${cache}/basketball.glb`)),
  },
  files,
}, null, 2) + '\n');
