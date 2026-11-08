// Restore only from an authorized local backup. Native ownership remains unchanged.
import fs from 'node:fs/promises';import path from 'node:path';import{createHash}from'node:crypto';import{fileURLToPath}from'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),target=path.join(root,'public/games/stick-cricket');
const source=process.argv[2];if(!source)throw Error('Usage: node scripts/install-stick-cricket-assets.mjs --verify | <local-backup-containing-unity-directory>');
const manifest=JSON.parse(await fs.readFile(path.join(target,'assets-manifest.json'),'utf8')),verified=[];
for(const file of manifest.files){if(!/^unity\/(Build|StreamingAssets)\//.test(file.path))continue;if(file.path.split('/').some(p=>p==='..'||p===''))throw Error('Invalid asset path');const bytes=await fs.readFile(path.join(source==='--verify'?target:path.resolve(source),file.path));if(bytes.length!==file.bytes||createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw Error('Native asset identity mismatch: '+file.path);verified.push([file.path,bytes]);}
if(verified.length!==51)throw Error('Unexpected native asset inventory');
if(source!=='--verify')for(const[name,bytes]of verified){const dest=path.join(target,name);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,bytes);}
console.log(`${source==='--verify'?'Verified':'Restored'} ${verified.length} native Stick Cricket files. Local reference scope; see NOTICE.md.`);
