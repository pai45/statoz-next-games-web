import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function refreshPitchRushRecord(manifest,bytes){
  if(![1,2].includes(manifest.schemaVersion)||!Array.isArray(manifest.files))throw Error('Unsupported local download manifest');
  let changed=false;
  const hash=digest(bytes);
  const files=manifest.files.map(file=>{
    if(!file.url.split(/[?#]/)[0].endsWith('/embedded-games/pitch-rush/index.html'))return file;
    if(file.hash===hash&&file.bytes===bytes.length)return file;
    changed=true;return {...file,hash,bytes:bytes.length};
  });
  return changed?{...manifest,files,totalBytes:files.reduce((sum,file)=>sum+file.bytes,0),revision:digest(JSON.stringify(files))}:manifest;
}
export async function refreshPitchRushDownload(root=process.cwd()){
  // Only update manifests referenced by the current compiled host. Historical
  // manifests and every unrelated asset record remain byte-for-byte untouched.
  const chunks=path.join(root,'.next/static/chunks');
  const entries=await fs.readdir(chunks,{withFileTypes:true}).catch(error=>{if(error.code==='ENOENT')return [];throw error;});
  const ids=new Set();
  for(const entry of entries){
    if(!entry.isFile()||!entry.name.endsWith('.js'))continue;
    const code=await fs.readFile(path.join(chunks,entry.name),'utf8');
    if(!code.includes('_game-assets/'))continue;
    for(const id of code.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g)||[])ids.add(id);
  }
  const bytes=await fs.readFile(path.join(root,'public/embedded-games/pitch-rush/index.html'));
  let count=0;
  for(const id of ids){
    const packFile=path.join(root,'public/_game-assets',id,'games/pitch-rush.json');
    const packRaw=await fs.readFile(packFile,'utf8').catch(error=>{if(error.code==='ENOENT')return null;throw error;});
    if(packRaw){
      const pack=JSON.parse(packRaw),updated=refreshPitchRushRecord(pack,bytes);
      if(updated!==pack){
        const indexFile=path.join(root,'public/_game-assets',id,'index.json');
        const index=JSON.parse(await fs.readFile(indexFile,'utf8'));
        if(index.buildId!==id||!index.games?.['pitch-rush'])throw Error('Pitch Rush download index mismatch');
        index.games['pitch-rush']={...index.games['pitch-rush'],revision:updated.revision,totalBytes:updated.totalBytes};
        await fs.writeFile(packFile,JSON.stringify(updated));
        await fs.writeFile(indexFile,JSON.stringify(index));
        count++;
      }
      continue;
    }
    const file=path.join(root,'public/_game-assets',id+'.json');
    const raw=await fs.readFile(file,'utf8').catch(error=>{if(error.code==='ENOENT')return null;throw error;});
    if(!raw)continue;
    const manifest=JSON.parse(raw);if(manifest.buildId!==id)continue;
    const updated=refreshPitchRushRecord(manifest,bytes);
    if(updated!==manifest){await fs.writeFile(file,JSON.stringify(updated));count++;}
  }
  console.log(`Pitch Rush: refreshed ${count} current host download manifest(s)`);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await refreshPitchRushDownload();
