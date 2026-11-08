import fs from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createGzip,createGunzip} from 'node:zlib';
import readline from 'node:readline';
import {once} from 'node:events';
import {configuration,argsOf,allFiles,atomicJson,readJson,digest,safeRelative,within,exists,invoked} from './common.mjs';
import {assembleProject,applyProject} from './project-transfer.mjs';
const excluded=/(^|\/)(?:credentials?|secrets?|browser-profiles?|profiles?|sessions?|\.env(?:\..*)?|node_modules|\.git|locks|logs|schedules|schedule-runs|jobs|runs)(\/|$)|\.(?:pfx|p12|jks|keystore|pem|key)$/i;
const sensitive=/(^|\/)(?:credentials?|secrets?|browser-profiles?|profiles?|sessions?|\.env(?:\..*)?|node_modules|\.git)(\/|$)|\.(?:pfx|p12|jks|keystore|pem|key)$|(?:^|\/)key\.properties$/i;
const forbidden=(name,metadata)=>metadata?.operation==='backup'?sensitive.test(name):excluded.test(name);
export async function pack(directory,output,metadata,{privateTransfer=false,includeRoots}={}) {
  if(await exists(output))throw Error('Package output already exists; choose a new immutable filename');
  const inputs=includeRoots?(await Promise.all(includeRoots.map(async root=>{safeRelative(root);return (await allFiles(path.join(directory,root))).map(file=>root+'/'+file);}))).flat():await allFiles(directory);
  const records=[];for(const file of inputs.sort()) {
    safeRelative(file);if(privateTransfer&&forbidden(file,metadata))continue;
    const bytes=await fs.readFile(path.join(directory,file));if(bytes.length>256*1024*1024)throw Error('A file exceeds the 256 MiB portable package limit: '+file);
    records.push({path:file,bytes:bytes.length,sha256:digest(bytes)});
  }
  await fs.mkdir(path.dirname(output),{recursive:true});const temporary=output+'.'+crypto.randomUUID()+'.tmp',stream=createGzip(),dest=createWriteStream(temporary,{flags:'wx'});stream.pipe(dest);
  const line=async value=>{if(!stream.write(JSON.stringify(value)+'\n'))await once(stream,'drain');};
  try {await line({format:'statoz-package',version:1,metadata,files:records});for(const record of records){const bytes=await fs.readFile(path.join(directory,record.path));if(digest(bytes)!==record.sha256)throw Error('Input changed during packaging: '+record.path);await line({path:record.path,base64:bytes.toString('base64')});}stream.end();await once(dest,'close');await fs.rename(temporary,output);}catch(e){stream.destroy();dest.destroy();await fs.rm(temporary,{force:true});throw e;}
  return {sha256:digest(await fs.readFile(output)),files:records,metadata};
}
export async function unpack(archive,directory,{maxBytes=1024*1024*1024,privateTransfer=false}={}) {
  if(await exists(directory))throw Error('Extraction requires a fresh destination');await fs.mkdir(directory,{recursive:true});
  let header,total=0,count=0;const seen=new Set(),input=createReadStream(archive),unzip=createGunzip();input.pipe(unzip);
  try {for await(const line of readline.createInterface({input:unzip,crlfDelay:Infinity})) {
    if(line.length>360*1024*1024)throw Error('Oversized package entry');const entry=JSON.parse(line);
    if(!header){header=entry;if(header.format!=='statoz-package'||header.version!==1||!Array.isArray(header.files)||header.files.length>100000)throw Error('Unsupported package');for(const f of header.files){safeRelative(f.path);if(privateTransfer&&forbidden(f.path,header.metadata))throw Error('Package contains credentials or operational state');if(!Number.isSafeInteger(f.bytes)||f.bytes<0||f.bytes>256*1024*1024||seen.has(f.path.toLowerCase()))throw Error('Invalid or duplicate manifest path');seen.add(f.path.toLowerCase());total+=f.bytes;}if(total>maxBytes)throw Error('Package exceeds its size budget');seen.clear();continue;}
    const name=safeRelative(entry.path),record=header.files.find(f=>f.path===name);if(!record||seen.has(name))throw Error('Unexpected or duplicate package entry');const bytes=Buffer.from(entry.base64,'base64');if(bytes.length!==record.bytes||digest(bytes)!==record.sha256)throw Error('Package integrity mismatch: '+name);const dest=path.resolve(directory,name);if(!within(directory,dest))throw Error('Unsafe package path');await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,bytes,{flag:'wx'});seen.add(name);count++;
  }if(!header||count!==header.files.length)throw Error('Incomplete package');return header;
  }catch(e){input.destroy();unzip.destroy();await fs.rm(directory,{recursive:true,force:true});throw e;}
}
export async function main(argv=process.argv.slice(2)) {
  const a=argsOf(argv),action=a._[0],m=await configuration();await fs.mkdir(m.dataRoot,{recursive:true});
  if(action==='export'||action==='backup') {
    const id=String(a.project||'');if(action==='export'&&!/^[a-zA-Z0-9-]{1,100}$/.test(id))throw Error('Specify --project ID');
    const native=action==='export'?await assembleProject(m,id):null;
    const root=action==='backup'?m.dataRoot:native?.directory||path.join(m.dataRoot,'transfers',id);if(!await exists(root))throw Error('No project with that identity exists in this module.');
    const output=path.resolve(String(a.output||`${m.id}-${id||'backup'}-${Date.now()}.statozpack`));if(within(root,output))throw Error('Package output must be outside its input folder');const meta=await readJson(path.join(root,'transfer.json'),{});if(action==='export'&&(!meta.projectId||!meta.revisionId||!meta.provenance||!Array.isArray(meta.requiredAssets)))throw Error('transfer.json requires projectId, revisionId, parents, requiredAssets and provenance');for(const asset of meta.requiredAssets||[])if(!await exists(path.join(root,safeRelative(asset))))throw Error('Required asset unavailable: '+asset);
    const result=await pack(root,output,{...meta,module:m.id,operation:action,createdAt:new Date().toISOString()},{privateTransfer:true});if(native?.cleanup)await fs.rm(root,{recursive:true,force:true});console.log(JSON.stringify({output,sha256:result.sha256,files:result.files.length,projectId:meta.projectId,revisionId:meta.revisionId},null,2));return;
  }
  if(action==='import'||action==='restore') {
    if(!a.file)throw Error('Specify --file PACKAGE');const archive=path.resolve(String(a.file)),hash=digest(await fs.readFile(archive)),receipt=path.join(m.dataRoot,'transfer-receipts',hash+'.json');if(await exists(receipt)){console.log('Identical package already imported; no changes.');return;}
    const staging=path.join(m.dataRoot,'incoming',crypto.randomUUID()),header=await unpack(archive,staging,{privateTransfer:true});const meta=header.metadata;if(meta.module!==m.id)throw Error('Package belongs to another module');if((action==='restore')!==(meta.operation==='backup'||meta.kind==='backup'))throw Error('Use restore for backups and import for project handoffs');
    const dest=action==='restore'?path.join(m.dataRoot,'restored',hash):path.join(m.dataRoot,'transfers',safeRelative(meta.projectId),safeRelative(meta.revisionId));if(await exists(dest)){const fork=dest+'-conflict-'+hash.slice(0,12);await fs.mkdir(path.dirname(fork),{recursive:true});await fs.rename(staging,fork);await atomicJson(receipt,{state:'conflict',directory:fork,metadata:meta,sha256:hash});console.log('Divergent revision preserved at '+fork);return;}
    await fs.mkdir(path.dirname(dest),{recursive:true});await fs.rename(staging,dest);const result=action==='restore'?{state:'restored',directory:dest}:await applyProject(m,dest,meta);await atomicJson(receipt,{...result,metadata:meta,sha256:hash});console.log(JSON.stringify(result,null,2));return;
  }throw Error('Use export --project ID --output FILE, import --file FILE, backup --output FILE, or restore --file FILE');
}
if(invoked(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
