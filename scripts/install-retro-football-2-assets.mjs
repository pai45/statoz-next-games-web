// Provision from a locally authorized asset backup; never download proprietary game files.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target=path.join(root,'public/games/retro-football-2/arcade');
const source=process.argv[2];
if(!source) throw Error('Usage: node scripts/install-retro-football-2-assets.mjs <local-backup-directory-containing-data-and-roms>');
const manifest=JSON.parse(await fs.readFile(path.join(target,'assets-manifest.json'),'utf8'));
const verified=[];
for(const file of manifest.files){
  if(!/^(data|roms)\//.test(file.path)||file.path.split('/').includes('..')) throw Error('Invalid manifest path');
  const bytes=await fs.readFile(path.join(path.resolve(source),file.path));
  if(bytes.length!==file.bytes||createHash('sha256').update(bytes).digest('hex')!==file.sha256) throw Error('Asset identity mismatch: '+file.path);
  verified.push([file.path,bytes]);
}
// Verify every source before replacing any installed asset.
for(const [name,bytes] of verified){const dest=path.join(target,name);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,bytes);}
console.log(`Installed ${verified.length} verified local Retro Football 2 assets. Licences and provenance remain in assets-manifest.json and NOTICE.md.`);
