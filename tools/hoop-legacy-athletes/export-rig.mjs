import fs from 'node:fs/promises';
import {build} from 'esbuild';
const target = '.cache/hoop-legacy-athletes/build';
await fs.mkdir(target, {recursive: true});
const result = await build({stdin: {contents: `
import fs from 'node:fs';
import {ARM_A,B,LEG_A,OFFSETS,PARENT,bindPose,bindRotation} from './src/features/games/hoop-legacy/source/src/game/world/character/rig.ts';
const names=[];for(const [name,i] of Object.entries(B))names[i]=name;
const bp=bindPose();fs.writeFileSync('${target}/rig.json',JSON.stringify({armA:ARM_A,legA:LEG_A,bones:names.map((name,i)=>({index:i,name,parent:PARENT[i]>=0?names[PARENT[i]]:null,offset:OFFSETS[i],bindEuler:bindRotation(i),bindPos:bp.pos[i],bindMatrix:bp.mat[i].elements}))},null,2));
`, resolveDir: process.cwd(), loader: 'ts'}, bundle: true, platform: 'node', format: 'cjs', write: false,
tsconfig: 'src/features/games/hoop-legacy/source/tsconfig.json'});
await fs.writeFile('.cache/hoop-legacy-athletes/rig.cjs', result.outputFiles[0].text);
await import('../../.cache/hoop-legacy-athletes/rig.cjs');
console.log('Exported exact 19-bone rig from the game');
