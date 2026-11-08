import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=process.cwd(),base='src/design-system/components/data-display/discovery-card';
const files=["discovery-card.tsx","discovery-card.module.css","presentation.ts","index.ts","README.md"];
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file,'utf8').replaceAll('\r\n','\n')).digest('hex');
const manifest=path.join(root,base,'manifest.json');
if(process.argv.includes('--check')){
 const expected=JSON.parse(fs.readFileSync(manifest,'utf8'));
 for(const file of files)if(hash(path.join(root,base,file))!==expected.files[file])throw Error('Discovery library changed without sync: '+file);
 console.log('Discovery library is current.');
}else{
 if(JSON.parse(fs.readFileSync('package.json','utf8')).name==='statoz-designer')throw Error('Sync from statoz_web with --designer-root.');
 const data=JSON.stringify({version:1,source:'statoz_web/src/design-system/components/data-display/discovery-card',files:Object.fromEntries(files.map(file=>[file,hash(path.join(root,base,file))]))},null,2)+'\n';
 fs.writeFileSync(manifest,data);
 const index=process.argv.indexOf('--designer-root');
 if(index>=0){const dest=path.resolve(process.argv[index+1]);for(const file of [...files,'manifest.json']){const target=path.join(dest,base,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,base,file),target);}}
 console.log('Discovery library synced.');
}
