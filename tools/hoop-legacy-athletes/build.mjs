import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const root=process.cwd(),cache=path.resolve('.cache/hoop-legacy-athletes'),build=path.join(cache,'build');
const blender=process.env.HOOP_LEGACY_BLENDER||(process.platform==='win32'?'C:/Program Files/Blender Foundation/Blender 4.5/blender.exe':'blender');
const run=(program,args)=>execFileSync(program,args,{cwd:root,stdio:'inherit',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});
await fs.mkdir(build,{recursive:true});
run(process.execPath,['tools/hoop-legacy-athletes/export-rig.mjs']);
run(process.env.PYTHON||'python',['tools/hoop-legacy-athletes/extract-system.py']);
const scripts=await fs.readdir('tools/hoop-legacy-athletes/blender');
const stamp=createHash('sha256');
for(const file of scripts.filter(f=>f.endsWith('.py')).sort())stamp.update(file).update(await fs.readFile('tools/hoop-legacy-athletes/blender/'+file));
stamp.update(await fs.readFile(path.join(build,'rig.json'))).update(await fs.readFile('tools/hoop-legacy-athletes/sources.lock.json'));
const hash=stamp.digest('hex');
const old=await fs.readFile(path.join(build,'.complete'),'utf8').catch(()=>null);
if(old!==hash||process.argv.includes('--force')||process.argv.includes('--outfit-only')) {
  for(const stage of process.argv.includes('--outfit-only')?['outfit']:['base_body','skin_bake','outfit']) {
    console.log('Authoring',stage);
    run(blender,['--background','--factory-startup','--python-exit-code','1','--python',path.resolve(`tools/hoop-legacy-athletes/blender/${stage}.py`),'--','--rig',path.join(build,'rig.json'),'--build',build,'--cache',cache]);
  }
  if(!process.argv.includes('--outfit-only'))await fs.writeFile(path.join(build,'.complete'),hash);
}else console.log('Verified local stage inputs unchanged; reusing authored output');
run(process.execPath,['tools/hoop-legacy-athletes/pack.mjs']);
run(process.execPath,['tools/hoop-legacy-athletes/check.mjs']);
