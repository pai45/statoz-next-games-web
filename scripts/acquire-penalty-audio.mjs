// Retrieve only exact static audio names declared by the preserved native project.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const base = path.resolve('public/games/penalty-shooters-2');
const origin = 'https://5dd28e51-015f-11ea-ad56-9cb6d0d995f7.gdn.poki.com/47a81ce0-7223-495d-be4a-41778fafb74f/';
const data = await fs.readFile(path.join(base,'native/data.json'),'utf8');
const names = [...new Set([...data.matchAll(/"(media\/[a-zA-Z0-9_() .-]+\.webm)"/g)].map(m=>m[1]))];
if (names.length !== 7) throw Error('Declared native audio set changed');
const hash = b => createHash('sha256').update(b).digest('hex');
const records = [];
for (const name of names) {
  const target = path.join(base,'originals',name);
  let bytes = await fs.readFile(target).catch(()=>null);
  if (!bytes) {
    const response = await fetch(new URL(name,origin),{signal:AbortSignal.timeout(30000)});
    if (!response.ok) throw Error(`Audio ${name}: HTTP ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length>16*1024*1024 || bytes.subarray(0,4).toString('hex')!=='1a45dfa3') throw Error('Unexpected WebM '+name);
    await fs.mkdir(path.dirname(target),{recursive:true});
    await fs.writeFile(target,bytes,{flag:'wx'});
  }
  records.push({path:name,bytes:bytes.length,sha256:hash(bytes),url:new URL(name,origin).href});
}
await fs.writeFile(path.join(base,'supplemental-manifest.json'),JSON.stringify({method:'Exact audio filenames in original native data.json; normal static HTTP retrieval, no provider identity or origin spoofing.',files:records},null,2));
console.log(`Preserved ${records.length} declared original WebM files.`);
