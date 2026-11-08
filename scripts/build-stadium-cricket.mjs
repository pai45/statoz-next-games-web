import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const sourceCommit='cb19e595d5a00a2764a6a5cb4b20fc48a2a733bc';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(root,'vendor/cricketv2');
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function verifySource(){
 const manifest=JSON.parse(await fs.readFile(path.join(source,'SOURCE.json'),'utf8'));
 if(manifest.commit!==sourceCommit)throw Error('Unexpected CricketV2 source version');
 for(const [file,hash] of Object.entries(manifest.files)){
  if(path.isAbsolute(file)||file.split(/[\\/]/).includes('..'))throw Error('Invalid source path');
  if(sha256(await fs.readFile(path.join(source,file)))!==hash)throw Error('CricketV2 baseline changed: '+file);
 }
 return manifest;
}
export async function buildStadiumCricket({prelude='' }={}){
 await verifySource();
 const publicRoot=path.join(root,'public/games/stadium-cricket');
 await fs.mkdir(publicRoot,{recursive:true});
 await fs.copyFile(path.join(source,'CREDITS.md'),path.join(publicRoot,'CREDITS.md'));
 let html=await fs.readFile(path.join(source,'index.html'),'utf8');
 const css=await fs.readFile(path.join(source,'css/style.css'),'utf8');
 const responsiveCss=await fs.readFile(path.join(root,'src/features/games/stadium-cricket/mobile.css'),'utf8');
 html=html.replace('</head>',()=>'<style data-stadium-responsive>'+responsiveCss+'</style></head>');
 html=html.replace('<html','<html data-game="stadium-cricket"').replace('<link rel="stylesheet" href="css/style.css">',()=>'<style>'+css+'</style>');
 const bridge=await fs.readFile(path.join(root,'src/features/games/stadium-cricket/host-adapter.js'),'utf8');
 html=html.replace('<script defer',()=>prelude+'<script>'+bridge.replaceAll('</script','<\\/script')+'</script><script defer');
 for(const match of [...html.matchAll(/<script defer src="([^"]+)"><\/script>/g)]){
  const file=path.resolve(source,match[1]);
  if(!file.startsWith(source+path.sep))throw Error('External source script');
  const js=await fs.readFile(file,'utf8');
  html=html.replace(match[0],()=>'<script defer>'+js.replaceAll('</script','<\\/script')+'</script>');
 }
 // Inline scripts execute immediately; the source expects deferred scripts after DOM creation.
 const scripts=[...html.matchAll(/<script defer>([\s\S]*?)<\/script>/g)];
 for(const match of scripts)html=html.replace(match[0],'');
 html=html.replace('</body>',()=>scripts.map(match=>'<script>'+match[1]+'</script>').join('')+'</body>');
 return html;
}
