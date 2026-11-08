import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
export const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
export const exists=p=>fs.stat(p).then(()=>true,()=>false);
export async function readJson(p,fallback) {try{return JSON.parse(await fs.readFile(p,'utf8'));}catch(e){if(fallback!==undefined&&e.code==='ENOENT')return fallback;throw e;}}
export async function atomicJson(file,data) {await fs.mkdir(path.dirname(file),{recursive:true});const temp=file+'.'+crypto.randomUUID()+'.tmp';await fs.writeFile(temp,JSON.stringify(data,null,2)+'\n',{flag:'wx'});await fs.rename(temp,file);}
export function within(root,file) {const rel=path.relative(path.resolve(root),path.resolve(file));return !rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel);}
export function safeRelative(name) {if(typeof name!=='string'||!name||name.includes('\\')||name.split('/').some(v=>!v||v==='.'||v==='..'||/[\x00-\x1f:<>"|?*]/.test(v)||/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(v)))throw Error('Unsafe relative path: '+name);return name;}
export async function configuration(root=process.cwd()) {
  root=await fs.realpath(root);const m=await readJson(path.join(root,'module.json'));
  if(m.schemaVersion!==1||!m.id||!/^pai45\/statoz-next-[a-z-]+$/.test(m.repository))throw Error('Invalid StatOz module configuration');
  const protectedRoots=m.protectedRoots||[];
  if(protectedRoots.some(p=>within(p,root)))throw Error('Original StatOz folders are read-only; use the new workspace');
  const base=process.env.STATOZ_DATA_ROOT||path.join(process.env.LOCALAPPDATA||path.join(os.homedir(),'.local/share'),'StatOz','next');
  const dataRoot=path.join(base,m.id);
  if(protectedRoots.some(p=>within(p,dataRoot))||within(root,dataRoot))throw Error('Private data must be outside source checkouts and protected originals');
  return {...m,root,dataRoot};
}
export function git(root,args,options={}) {return execFileSync('git',['-c','core.bare=false','-C',root,...args],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],...options}).trim();}
export function gh(repo,args,options={}) {return execFileSync('gh',[...args,'--repo',repo],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],...options}).trim();}
export function spawnCommand(command,args,{cwd,env=process.env,stdio='inherit',...rest}={}) {
  if(process.platform==='win32'&&/\.(cmd|bat)$/i.test(command)) {
    if(!path.isAbsolute(command))command=execFileSync('where.exe',[command],{encoding:'utf8',windowsHide:true}).trim().split(/\r?\n/)[0];
    const quote=value=>{if(/[\r\n"&|<>^]/.test(value))throw Error('Invalid command argument');return '"'+value+'"';};
    return spawn(process.env.ComSpec||'cmd.exe',['/d','/s','/c','"'+[command.replaceAll('/','\\'),...args].map(quote).join(' ')+'"'],{cwd,env,stdio,windowsHide:true,windowsVerbatimArguments:true,...rest});
  }
  return spawn(command,args,{cwd,env,stdio,windowsHide:true,...rest});
}
export function run(command,args,options={}) {return new Promise((resolve,reject)=>{const p=spawnCommand(command,args,options);p.on('error',reject);p.on('exit',(code,signal)=>code===0?resolve():reject(Error(`${path.basename(command)} failed (${signal||code})`)));});}
export function argsOf(argv) {const values={_:[]};for(let i=0;i<argv.length;i++){if(!argv[i].startsWith('--')){values._.push(argv[i]);continue;}const [name,...rest]=argv[i].slice(2).split('=');values[name]=rest.length?rest.join('='):argv[i+1]&&!argv[i+1].startsWith('--')?argv[++i]:true;}return values;}
export async function allFiles(root,prefix='') {const result=[];for(const e of await fs.readdir(path.join(root,prefix),{withFileTypes:true})){if(e.isSymbolicLink())throw Error('Symbolic links are not portable release inputs');const rel=prefix?prefix+'/'+e.name:e.name;if(e.isDirectory())result.push(...await allFiles(root,rel));else result.push(rel);}return result;}
export const invoked=url=>process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(url);
