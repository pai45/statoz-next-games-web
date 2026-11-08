import {copyFile,readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

/** Next 16.3 Windows exports preserve backslashes as nested segment folders.
 * The browser protocol uses dots. Keep originals and add byte-identical aliases.
 * Already-correct POSIX exports are a no-op. Never replace different content.
 */
export async function normalizeStaticSegments(directory){
 const plans=[];
 async function segments(root,current,pieces){
  for(const item of await readdir(current,{withFileTypes:true})){
   if(item.isSymbolicLink())continue;
   const source=path.join(current,item.name),parts=[...pieces,item.name];
   if(item.isDirectory())await segments(root,source,parts);
   else if(item.isFile()&&item.name.endsWith('.txt'))plans.push({source,target:path.join(root,parts.join('.'))});
  }
 }
 async function walk(current){
  for(const item of await readdir(current,{withFileTypes:true})){
   if(!item.isDirectory()||item.isSymbolicLink())continue;
   const child=path.join(current,item.name);
   if(item.name.startsWith('__next.'))await segments(current,child,[item.name]);
   else await walk(child);
  }
 }
 await walk(path.resolve(directory));
 // Check all destinations before any mutation, including ambiguous dotted paths.
 const destinations=new Map();
 for(const plan of plans){
  const bytes=await readFile(plan.source),planned=destinations.get(plan.target);
  if(planned&&!planned.equals(bytes))throw Error('Conflicting segment alias: '+plan.target);
  const existing=await readFile(plan.target).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
  if(existing&&!existing.equals(bytes))throw Error('Existing segment alias differs: '+plan.target);
  destinations.set(plan.target,bytes);plan.exists=!!existing;
 }
 let copied=0;
 for(const plan of plans)if(!plan.exists){await copyFile(plan.source,plan.target);copied++;}
 return {segments:plans.length,copied};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)console.log(JSON.stringify(await normalizeStaticSegments(process.argv[2]||'out')));
