import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
/** These files are local build inputs, never fetched implicitly from Downloads or a remote source. */
export async function verifyCricketerCharacters(root=process.cwd()) {
 const directory=path.join(root,'public/games/cricketer');
 const manifest=JSON.parse(await fs.readFile(path.join(directory,'characters-manifest.json'),'utf8'));
 if(manifest.schemaVersion!==2||manifest.sourceTexturesIncluded!==false)throw Error('Invalid Cricketer character manifest');
 const expected=['cricketer-player.glb','PLAYER-LICENSE.txt'];
 if(manifest.files.map(entry=>entry.path).sort().join()!==[...expected].sort().join())throw Error('Unexpected Cricketer character inputs');
 for(const entry of manifest.files){let bytes;try{bytes=await fs.readFile(path.join(directory,entry.path));}catch{throw Error('Missing local Cricketer character input: '+entry.path+'. Rebuild it with scripts/build-cricketer-player.mjs; no remote fallback is used.');}if(bytes.length!==entry.bytes||createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw Error('Cricketer character input hash mismatch: '+entry.path);if(entry.path.endsWith('.glb')){if(bytes.toString('ascii',0,4)!=='glTF'||bytes.readUInt32LE(4)!==2)throw Error('Invalid Cricketer GLB: '+entry.path);const json=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));if(json.images?.length||json.textures?.length)throw Error('Cricketer player must not embed source textures');if(!/bhagathartworks/.test(json.asset?.copyright||''))throw Error('Cricketer player credit missing');}}
}
