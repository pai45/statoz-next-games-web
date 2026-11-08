/** Keep the local production preview aligned with the build currently on disk. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.RACER_PREVIEW_PORT||3212);
if(!Number.isSafeInteger(port)||port<1024||port>65535)throw Error('Invalid Racer preview port');
const url=`http://127.0.0.1:${port}/play/racer`;
const buildFile=path.join(root,'.next/BUILD_ID');
let child=null,build='',busy=false,closing=false,retryAfter=0;
// Next can write BUILD_ID before its start-server manifests. A rebuild by
// another local task must not make the launcher boot an incomplete directory.
async function readBuild(){
 try{
  const id=(await fs.readFile(buildFile,'utf8')).trim();
  await Promise.all(['prerender-manifest.json','routes-manifest.json','required-server-files.json'].map(async name=>JSON.parse(await fs.readFile(path.join(root,'.next',name),'utf8'))));
  return id===(await fs.readFile(buildFile,'utf8')).trim()?id:null;
 }catch{return null;}
}
async function stop(){const current=child;child=null;if(!current||current.exitCode!==null)return;const exited=new Promise(resolve=>current.once('exit',resolve));current.kill();await exited;}
async function refresh(){
 if(busy||closing||Date.now()<retryAfter)return;busy=true;
 try{
  const nextBuild=await readBuild();
  if(!nextBuild){if(child){console.log('Build in progress; waiting for the completed build.');await stop();}return;}
  if(child&&nextBuild===build)return;
  await stop();build=nextBuild;
  const next=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port',String(port)],{cwd:root,stdio:'inherit',windowsHide:true});
  child=next;console.log(`Racer preview: ${url} (build ${build})`);
  next.once('error',error=>{console.error(error.message);if(child===next)child=null;});
  next.once('exit',code=>{if(child===next){child=null;if(code&&!closing){console.error(`Preview stopped (${code}); waiting for a complete build before retrying. Port: ${port}.`);retryAfter=Date.now()+5000;}}});
 }finally{busy=false;}
}
async function shutdown(){closing=true;clearInterval(timer);await stop();}
process.once('SIGINT',()=>void shutdown());process.once('SIGTERM',()=>void shutdown());
const timer=setInterval(()=>void refresh(),2000);
if(!await readBuild()){console.error('No completed app build. Run npm run build, then npm run preview:racer.');clearInterval(timer);process.exitCode=1;}else await refresh();
