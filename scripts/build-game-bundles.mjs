import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { buildStadiumCricket } from './build-stadium-cricket.mjs';
import { buildOpenGolf } from './build-open-golf.mjs';
import { buildPitchRush } from './build-pitch-rush.mjs';
import { buildFinalThird } from './build-final-third.mjs';
import { buildPenaltyCup } from './build-penalty-cup.mjs';
import {verifyCricketerCharacters} from './verify-cricketer-characters.mjs';
import {buildHoldover} from './build-holdover.mjs';
import {buildHoopLegacy} from './build-hoop-legacy.mjs';
import {buildPortfolioFormula} from './build-portfolio-formula.mjs';
import {engineExternals,engineModulePrelude} from './build-game-engine.mjs';

const root=process.cwd();
const output=path.join(root,'public','embedded-games');
const removedGames=JSON.parse(await fs.readFile(path.join(root,'src/domain/removed-games.json'),'utf8'));
const ids=['hoop-legacy','holdover','cricketer','yorker','penalty-cup','open-golf','pitch-rush','final-third','retro-hoops','retro-football-2','stick-cricket','football-shooting','f1-racing','portfolio-formula','archery-test','longbow','rim-rush','tennis-bits','soccer-real','penalty-shooters-2','retro-circuit','retro-football','retro-innings','stadium-cricket'].filter(id=>!removedGames.includes(id));
const customRoot=path.join(root,'public/assets/games/designer');
for(const entry of await fs.readdir(customRoot,{withFileTypes:true}).catch(()=>[])) if(entry.isDirectory()&&/^[a-f0-9-]{36}$/.test(entry.name)) ids.push('designer-'+entry.name);
const selected=process.argv.find(arg=>arg.startsWith('--game='))?.slice(7);
const engineNativeIds=new Set(['cricketer','yorker','longbow','rim-rush','f1-racing']);
if(selected&&!ids.includes(selected))throw Error('Unknown game selection');
const digest=b=>createHash('sha256').update(b).digest('hex');
async function walk(dir){const out=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){if(e.isSymbolicLink())throw Error('Linked game asset');const p=path.join(dir,e.name);if(e.isDirectory())out.push(...await walk(p));else out.push(p);}return out;}
const boot=String.raw`
(() => {
 if(!window.__STATOZ_BOOT__&&parent!==window){try{const session=new URLSearchParams(location.search).get('session');const raw=parent.__STATOZ_BUNDLE_BOOT__?.(session,window);if(raw)window.__STATOZ_BOOT__=JSON.parse(raw);}catch{}}
 const boot=window.__STATOZ_BOOT__||{}, gameId=document.documentElement.dataset.game, sessionId=boot.sessionId||crypto.randomUUID();
 let disposed=false,stores=boot.stores&&typeof boot.stores==='object'?{...boot.stores}:{},resultIds=Array.isArray(boot.resultIds)?boot.resultIds:[];
 const emit=(type,payload={})=>{if(disposed)return;const message={protocolVersion:1,gameId,sessionId,type,payload};if(window.StatozGame?.postMessage)window.StatozGame.postMessage(JSON.stringify(message));else if(parent!==window)parent.postMessage(message,boot.origin||location.origin);};
 const save=()=>emit('save',{schemaVersion:1,stores,resultIds});
 const storage={getItem:key=>Object.hasOwn(stores,key)?stores[key]:null,setItem(key,value){const next={...stores,[key]:String(value)};if(JSON.stringify(next).length>524288)throw new DOMException('Save limit exceeded','QuotaExceededError');stores=next;save();},removeItem(key){delete stores[key];save();},clear(){stores={};save();},key:index=>Object.keys(stores)[index]??null,get length(){return Object.keys(stores).length;}};
 Object.defineProperty(window,'localStorage',{value:storage,configurable:false});
 window.__STATOZ_MESSAGE_ORIGIN__=parent===window?location.origin:(boot.origin||location.origin);
 const originalPost=window.postMessage.bind(window);if(!['penalty-cup','retro-circuit','retro-hoops','retro-football-2','stick-cricket','football-shooting','f1-racing','archery-test','tennis-bits','soccer-real','penalty-shooters-2'].includes(gameId))window.postMessage=(message,target,transfer)=>originalPost(message,target==='null'?'*':target,transfer);
 const api={emit,save,sessionId,presentation:boot.presentation,command:null,result(payload){const id=String(payload?.id||payload?.sessionId||'');if(!id||resultIds.includes(id))return;resultIds=[...resultIds,id].slice(-1000);let records=[];try{records=JSON.parse(stores['statoz.bundle.results']||'[]');}catch{}stores['statoz.bundle.results']=JSON.stringify([...records,payload].slice(-20));save();emit('result',payload);}};
 window.__STATOZ_HOST__=api;
 if((gameId.startsWith('retro-')||gameId==='stick-cricket'))document.documentElement.dataset.retroLayout=boot.presentation?.layout==='handheld'?'handheld':'onscreen';
 if(gameId==='retro-football'){
  window.RetroFootballHost={postMessage(raw){if(typeof raw!=='string'||raw.length>600000)return;let message;try{message=JSON.parse(raw);}catch{return;}if(message.gameId!==gameId||message.protocolVersion!==1)return;if(message.type==='ready'){const engineSession=message.sessionId;api.command=type=>window.retroFootballHostV1?.receive({protocolVersion:1,gameId,sessionId:engineSession,type,payload:{}});window.retroFootballHostV1?.receive({protocolVersion:1,gameId,sessionId:engineSession,type:'launch',payload:{music:0,sfx:.5}});}if(message.type==='result')api.result({id:message.payload?.resultId,...message.payload?.result});else emit(message.type,message.payload);}};
 }
 if(gameId==='retro-football'||gameId==='retro-innings')api.command=command=>{const buttons=[...document.querySelectorAll('button')],resume=buttons.find(button=>button.textContent.trim().toLowerCase().startsWith('resume'));if(command==='resume')resume?.click();else if((command==='pause'||command==='dispose')&&!resume)buttons.find(button=>button.textContent.trim().toLowerCase().startsWith('pause'))?.click();if(command==='dispose'&&gameId==='retro-innings')window.threeCricket?.dispose?.();};
 const apply=command=>{if(command==='dispose'){api.command?.('dispose');disposed=true;}else api.command?.(command);};
 window.__STATOZ_COMMAND__=message=>{if(!message||message.protocolVersion!==1||message.gameId!==gameId||message.sessionId!==sessionId||!['pause','resume','dispose'].includes(message.type))return;apply(message.type);};
 addEventListener('message',event=>{
  if(event.source===parent&&parent!==window&&event.origin===boot.origin)window.__STATOZ_COMMAND__(event.data);
  if(event.source!==window)return;
  const value=event.data;
  if(value?.gameId==='retro-football'&&value.sessionId===sessionId){if(value.type==='ready'){originalPost({...value,type:'launch',payload:{music:0,sfx:.5}},'*');emit('ready');}else if(value.type==='result')api.result({id:value.payload?.resultId,...value.payload?.result});else if(value.type==='exit')emit('exit');}
  if(value?.type==='statoz.games.web.retro-innings:ready'){emit('ready');}
 });
 addEventListener('visibilitychange',()=>{if(document.hidden)apply('pause');});
 addEventListener('error',()=>emit('error',{message:'The demo game could not continue.'}));
})();`;
if(ids.includes('retro-circuit')&&(!selected||selected==='retro-circuit'))execFileSync(process.execPath,['scripts/build-retro-circuit-assets.mjs'],{cwd:root,stdio:'inherit'});
const fontStyle=`@font-face{font-family:'Space Grotesk';src:url(data:font/ttf;base64,${(await fs.readFile(path.join(root,'src/app/fonts/space-grotesk-variable.ttf'))).toString('base64')}) format('truetype');font-weight:300 700;font-display:swap}@font-face{font-family:Orbitron;src:url(data:font/woff2;base64,${(await fs.readFile(path.join(root,'src/app/fonts/orbitron-latin-variable.woff2'))).toString('base64')}) format('woff2');font-weight:400 900;font-display:swap}:root{--font-space-grotesk:'Space Grotesk';--font-orbitron:Orbitron}body,button,input{font-family:'Space Grotesk',sans-serif}`;
const prelude=gameId=>`${['holdover','portfolio-formula','cricketer','yorker','penalty-cup','pitch-rush','final-third','retro-football','retro-football-2','stick-cricket','football-shooting','archery-test','longbow','rim-rush','retro-innings','stadium-cricket','open-golf'].includes(gameId)?'':'<style>'+fontStyle+'</style>'}<script>/*__STATOZ_BOOT__*/</script><script>${boot.replaceAll('</script','<\\/script')}</script>`;
const style='html,body,#root{margin:0;width:100%;height:100%;background:#0d111a;color:white;overflow:hidden}*{box-sizing:border-box}button{touch-action:manipulation}canvas{image-rendering:pixelated}';
const nativeShellEntry=(id,component)=>`import React from 'react';import{createRoot}from'react-dom/client';import{${component} as Game}from'./src/features/games/${id}/game';const host=window.__STATOZ_HOST__;let commandId=0,disposed=false;const root=createRoot(document.getElementById('root'));const render=command=>root.render(<Game onExit={()=>host.emit('exit')} hostCommand={command?{id:++commandId,type:command}:undefined} onEvent={event=>{if(event.type==='result')host.result(event.payload);else host.emit(event.type,event.payload);}}/>);host.command=command=>{if(disposed)return;if(command==='dispose'){disposed=true;root.unmount();}else render(command);};render();`;
const entries={
 'cricketer':nativeShellEntry('cricketer','CricketerGame'),
 'longbow':nativeShellEntry('longbow','LongbowGame'),
 'rim-rush':nativeShellEntry('rim-rush','RimRushGame'),
 'yorker':nativeShellEntry('yorker','YorkerGame'),
 'penalty-shooters-2':nativeShellEntry('penalty-shooters-2','PenaltyShooters2Game'),
 'tennis-bits':nativeShellEntry('tennis-bits','TennisBitsGame'),
 'soccer-real':nativeShellEntry('soccer-real','SoccerRealGame'),
 'retro-hoops':`import React from 'react';import{createRoot}from'react-dom/client';import{StreetHoopGame as HoopsGame}from'./src/features/games/retro-hoops/street-hoop-game';const host=window.__STATOZ_HOST__;let commandId=0,unmounted=false;const render=command=>createRootOnce.render(<HoopsGame assetBase="assets" onExit={()=>host.emit('exit')} hostCommand={command?{id:++commandId,type:command}:undefined} onEvent={event=>{if(event.type==='result')host.result(event.payload);else host.emit(event.type,event.payload);}}/>);const createRootOnce=createRoot(document.getElementById('root'));host.command=command=>{if(unmounted)return;if(command==='dispose'){unmounted=true;createRootOnce.unmount();}else render(command);};render();`,
 'retro-football-2':`import React from 'react';import{createRoot}from'react-dom/client';import{RetroFootball2Game as HoopsGame}from'./src/features/games/retro-football-2/game';const host=window.__STATOZ_HOST__;let commandId=0,unmounted=false;const render=command=>createRootOnce.render(<HoopsGame onExit={()=>host.emit('exit')} hostCommand={command?{id:++commandId,type:command}:undefined} onEvent={event=>{if(event.type==='result')host.result(event.payload);else host.emit(event.type,event.payload);}}/>);const createRootOnce=createRoot(document.getElementById('root'));host.command=command=>{if(unmounted)return;if(command==='dispose'){unmounted=true;createRootOnce.unmount();}else render(command);};render();`,
 'stick-cricket':`import React from 'react';import{createRoot}from'react-dom/client';import{StickCricketGame as HoopsGame}from'./src/features/games/stick-cricket/game';const host=window.__STATOZ_HOST__;let commandId=0,unmounted=false;const render=command=>createRootOnce.render(<HoopsGame onExit={()=>host.emit('exit')} hostCommand={command?{id:++commandId,type:command}:undefined} onEvent={event=>{if(event.type==='result')host.result(event.payload);else host.emit(event.type,event.payload);}}/>);const createRootOnce=createRoot(document.getElementById('root'));host.command=command=>{if(unmounted)return;if(command==='dispose'){unmounted=true;createRootOnce.unmount();}else render(command);};render();`,
 'football-shooting':`import React from 'react';import{createRoot}from'react-dom/client';import{FootballShootingGame as HoopsGame}from'./src/features/games/football-shooting/game';const host=window.__STATOZ_HOST__;let commandId=0,unmounted=false;const render=command=>createRootOnce.render(<HoopsGame onExit={()=>host.emit('exit')} hostCommand={command?{id:++commandId,type:command}:undefined} onEvent={event=>{if(event.type==='result')host.result(event.payload);else host.emit(event.type,event.payload);}}/>);const createRootOnce=createRoot(document.getElementById('root'));host.command=command=>{if(unmounted)return;if(command==='dispose'){unmounted=true;createRootOnce.unmount();}else render(command);};render();`,
 'f1-racing':nativeShellEntry('racer','RacerGame'),
 'archery-test':`import React from 'react';import{createRoot}from'react-dom/client';import{ArcheryTestGame as HoopsGame}from'./src/features/games/archery-test/game';const host=window.__STATOZ_HOST__;let commandId=0,unmounted=false;const render=command=>createRootOnce.render(<HoopsGame onExit={()=>host.emit('exit')} hostCommand={command?{id:++commandId,type:command}:undefined} onEvent={event=>{if(event.type==='result')host.result(event.payload);else host.emit(event.type,event.payload);}}/>);const createRootOnce=createRoot(document.getElementById('root'));host.command=command=>{if(unmounted)return;if(command==='dispose'){unmounted=true;createRootOnce.unmount();}else render(command);};render();`,
 'retro-circuit':`import{mountCircuit}from'./src/features/games/retro-circuit/mount';import'./src/features/games/retro-circuit/circuit.css';const host=window.__STATOZ_HOST__;let session,disposed=false;host.command=command=>{if(command==='dispose'){disposed=true;session?.dispose();}else if(command==='pause'){session?.pause();}else if(command==='resume'){session?.resume();}};try{if(!disposed){session=mountCircuit(document.getElementById('root'),{onExit:()=>host.emit('exit'),onResult:result=>host.result(result)});host.emit('ready');}}catch{host.emit('error',{message:'Retro Circuit could not start'});}`,
};
async function assetShim(directory){
 const engineCatalog=await fs.readFile(path.join(directory,'engine-assets/catalog.json'),'utf8').then(JSON.parse).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
 const map={};const hoopsAtlases=path.basename(directory)==='retro-hoops'?new Set(JSON.parse(await fs.readFile(path.join(directory,'authored-v28/manifest.json'),'utf8')).atlases):null;
 for(const file of await walk(directory).catch(error=>{if(error.code==='ENOENT')return [];throw error;})){
  if(path.relative(directory,file).split(path.sep).includes('dissection'))continue;
  if(path.relative(directory,file).split(path.sep)[0]==='engine-assets')continue;
  // Yorker's hub cover is used by the host app only; keep it out of the offline game.
  if(path.basename(directory)==='yorker'&&path.basename(file)==='cover.png')continue;
  if(!/\.(?:png|webp|jpg|jpeg|svg|json|wav|mp3|ogg|woff2?|ttf|glb)$/.test(file)||/provenance/i.test(file))continue;
  if(hoopsAtlases&&file.includes(path.sep+'authored-v28'+path.sep)&&file.endsWith('.png')&&!hoopsAtlases.has(path.basename(file)))continue;
  if(path.basename(directory)==='retro-hoops'&&/\.(png|webp|jpe?g)$/.test(file)&&!file.includes(path.sep+'authored-v28'+path.sep))continue;
  if(path.basename(directory)==='retro-hoops'&&/(?:authored-v(?:[1-9]|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27)|player-look-v1|locomotion-v[0-9]+|assets)[\\/]/.test(path.relative(directory,file)))continue;
  const ext=path.extname(file).toLowerCase(),mime={'.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json','.wav':'audio/wav','.mp3':'audio/mpeg','.ogg':'audio/ogg','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.glb':'model/gltf-binary'}[ext];
  map[path.relative(directory,file).replaceAll('\\','/')]=`data:${mime};base64,${(await fs.readFile(file)).toString('base64')}`;
 }
 return `<script>(()=>{const assets=${JSON.stringify(map)},resolve=value=>{let text=String(value);if(text.startsWith('data:')||text.startsWith('blob:'))return text;text=text.split(/[?#]/)[0];const key=Object.keys(assets).find(key=>text===key||text.endsWith('/'+key));return key?assets[key]:null;};const fetchOriginal=fetch.bind(window),gameId=document.documentElement.dataset.game,boot=window.__STATOZ_BOOT__||{},base=new URL(boot.assetRoot||('/games/'+gameId+'/'),(boot.origin||location.origin)+'/'),enginePrefix=new URL('engine-assets/',base).href;window.__STATOZ_ENGINE_CATALOGS__=window.__STATOZ_ENGINE_CATALOGS__||{};if(${JSON.stringify(engineCatalog).replaceAll('<', '\\u003c')})window.__STATOZ_ENGINE_CATALOGS__[gameId]=${JSON.stringify(engineCatalog).replaceAll('<', '\\u003c')};const engineAsset=value=>{try{return new URL(value,base).href.startsWith(enginePrefix);}catch{return false;}};window.fetch=(value,options)=>{const request=typeof value==='string'?value:value instanceof URL?value.href:value.url;const url=resolve(request);return url?fetchOriginal(url,options):engineAsset(request)?fetchOriginal(new URL(request,base),options):Promise.reject(Error('Remote resource blocked in offline game: '+String(request)));};for(const proto of [HTMLImageElement.prototype,HTMLMediaElement.prototype]){const descriptor=Object.getOwnPropertyDescriptor(proto,'src');if(descriptor?.set)Object.defineProperty(proto,'src',{...descriptor,set(value){descriptor.set.call(this,resolve(value)||value);}});}})();</script>`;
}
await fs.mkdir(output,{recursive:true});
// Preserve retired build bytes outside public so stale direct URLs are not shipped.
for(const id of removedGames){
 const source=path.join(output,id),archive=path.join(root,'.cache/removed-games',String(Date.now()),id);
 if(await fs.stat(source).catch(()=>null)){await fs.mkdir(path.dirname(archive),{recursive:true});await fs.rename(source,archive);}
}
const previous=selected?JSON.parse(await fs.readFile(path.join(output,'manifest.json'),'utf8').catch(error=>{if(error.code==='ENOENT')return '{"games":[]}';throw error;})):null;
const manifest={schemaVersion:1,protocolVersion:1,sourceSha:'uncommitted',games:previous?previous.games.filter(game=>game.id!==selected&&!removedGames.includes(game.id)):[]};
try{manifest.sourceSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{}
for(const gameId of selected?[selected]:ids){
 if(gameId==='cricketer')await verifyCricketerCharacters(root);
 if(['tennis-bits','soccer-real'].includes(gameId))execFileSync(process.execPath,[`scripts/build-${gameId}-assets.mjs`],{cwd:root,stdio:'inherit'});
 if(gameId==='retro-innings')execFileSync(process.execPath,['scripts/build-retro-innings.mjs'],{cwd:root,stdio:'inherit'});
 if(gameId==='archery-test')execFileSync(process.execPath,['scripts/install-archery-test-assets.mjs','--verify'],{cwd:root,stdio:'inherit'});
 const dir=path.join(output,gameId);await fs.mkdir(dir,{recursive:true});let html;
 if(gameId==='hoop-legacy'){
  html=await buildHoopLegacy({prelude:prelude(gameId)});
 }else if(gameId==='holdover'){
  html=await buildHoldover({prelude:prelude(gameId)});
 }else if(gameId==='portfolio-formula'){
  html=await buildPortfolioFormula({prelude:prelude(gameId)});
 }else if(gameId==='penalty-cup'){
  html=await buildPenaltyCup({prelude:prelude(gameId)});
 }else if(gameId==='open-golf'){
  html=await buildOpenGolf({prelude:prelude(gameId)});
 }else if(gameId==='final-third'){
  html=await buildFinalThird({prelude:prelude(gameId)});
 }else if(gameId==='pitch-rush'){
  html=await buildPitchRush({prelude:prelude(gameId)});
 }else if(gameId==='stadium-cricket'){
  html=await buildStadiumCricket({prelude:prelude(gameId)});
 }else if(entries[gameId]){
  const result=await build({stdin:{contents:(['cricketer','yorker','football-shooting','longbow','rim-rush'].includes(gameId)?'':"import './src/design-system/styles/tokens.css';import './src/design-system/styles/typography.css';")+entries[gameId],resolveDir:root,loader:'tsx'},bundle:true,write:false,outdir:'bundle',format:engineNativeIds.has(gameId)?'esm':'iife',external:engineNativeIds.has(gameId)?engineExternals:[],platform:'browser',target:'es2020',minify:true,jsx:'automatic',loader:{'.png':'dataurl','.svg':'dataurl','.woff2':'dataurl','.ttf':'dataurl'},tsconfig:path.join(root,'tsconfig.json')});
  const js=result.outputFiles.find(f=>f.path.endsWith('.js')).text,css=result.outputFiles.find(f=>f.path.endsWith('.css'))?.text||'';
  html=`<!doctype html><html lang="en" data-game="${gameId}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${gameId}</title><style>${style}\n${css}</style></head><body><div id="root"></div>${prelude(gameId)}${['retro-hoops','retro-football-2','stick-cricket','football-shooting','f1-racing','archery-test','penalty-shooters-2','tennis-bits','soccer-real'].includes(gameId)?'':await assetShim(path.join(root,'public','games',gameId))}${engineNativeIds.has(gameId)?await engineModulePrelude(['core','audio']):''}<script${engineNativeIds.has(gameId)?' type="module"':''}>${js.replaceAll('</script','<\\/script')}</script></body></html>`;
 }else{
  const sourceRoot=gameId.startsWith('designer-')?path.join(customRoot,gameId.slice(9)):path.join(root,'public','games',gameId);html=await fs.readFile(path.join(sourceRoot,'index.html'),'utf8');
  html=html.replace('<html','<html data-game="'+gameId+'"');
  const external=[...html.matchAll(/<script\b([^>]*?)src=["']([^"']+)["']([^>]*)><\/script>/g)];
  for(const match of external){const local=path.resolve(sourceRoot,match[2]);if(!local.startsWith(sourceRoot+path.sep))throw Error('External game script');const js=(await fs.readFile(local,'utf8')).replaceAll('import.meta.url',JSON.stringify(`https://statoz-demo.invalid/${gameId}/bundle.js`));html=html.replace(match[0],()=>'<script'+match[1]+match[3]+'>'+js.replaceAll('</script','<\\/script')+'</script>');}
  html=html.replace(/new URLSearchParams\((?:window\.)?location.search\)/g,`new URLSearchParams('host=web&session='+window.__STATOZ_HOST__.sessionId)`);
  // srcdoc has an opaque location.origin even though its inherited message
  // origin is the host's origin. Keep the legacy engines' same-origin bridge.
  html=html.replace(/(?:window\.)?location\.origin\b/g,'window.__STATOZ_MESSAGE_ORIGIN__');
  if(gameId==='retro-innings')html=html.replaceAll('window.parent.postMessage(', 'window.postMessage(');
  const start=html.indexOf('<script');const injection=prelude(gameId)+await assetShim(sourceRoot);html=html.slice(0,start)+injection+html.slice(start);
  if(gameId.startsWith('designer-'))html+='<script>window.__STATOZ_HOST__.emit("ready");</script>';
 }
 // Inline parser-created identity images too: prototype src shims cannot intercept innerHTML.
 for(const id of ['retro-football','retro-hoops','retro-circuit','retro-innings']){
  const relative='../../assets/games/identity/'+id+'.svg';
  if(html.includes(relative))html=html.replaceAll(relative,'data:image/svg+xml;base64,'+(await fs.readFile(path.join(root,'public/assets/games/identity',id+'.svg'))).toString('base64'));
 }
 const file=path.join(dir,'index.html');await fs.writeFile(file,html);manifest.games.push({id:gameId,title:({'retro-hoops':'STREET HOOP','stick-cricket':'STICK CRICKET CHASE','archery-test':'ARCHERY MASTER','longbow':'LONGBOW','yorker':'YORKER','rim-rush':'RIM RUSH','portfolio-formula':'FORMULA','f1-racing':'RACER','retro-innings':'CREASEFIRE SIX'})[gameId]||gameId.replaceAll('-',' ').toUpperCase().slice(0,120),sport:({'hoop-legacy':'basketball','holdover':'archery','cricketer':'cricket','yorker':'cricket','penalty-cup':'football','open-golf':'golf','pitch-rush':'football','final-third':'football','retro-hoops':'basketball','retro-football-2':'football','stick-cricket':'cricket','portfolio-formula':'motorsport','f1-racing':'motorsport','football-shooting':'football','archery-test':'archery','longbow':'archery','rim-rush':'basketball','penalty-shooters-2':'football','soccer-real':'football','tennis-bits':'tennis','retro-circuit':'motorsport','retro-football':'football','retro-innings':'cricket','stadium-cricket':'cricket'})[gameId],path:`${gameId}/index.html`,sha256:digest(html),bytes:Buffer.byteLength(html),orientation:gameId==='penalty-cup'?'landscape':gameId==='archery-test'?'portrait':gameId==='football-shooting'?'adaptive':'landscape',saveSchemaVersion:1});
 console.log(`${gameId}: ${(Buffer.byteLength(html)/1048576).toFixed(1)} MiB ${['retro-hoops','retro-football-2','stick-cricket','football-shooting','f1-racing','archery-test','penalty-shooters-2','tennis-bits','soccer-real'].includes(gameId)?'web bundle + local arcade assets':'offline bundle'}`);
}
await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const notices=[];notices.push('Hoop Legacy\n\n'+await fs.readFile(path.join(root,'public/embedded-games/hoop-legacy/LICENSES.txt'),'utf8').catch(error=>{if(error.code==='ENOENT')return 'See src/features/games/hoop-legacy/source/NOTICE.md';throw error;}));for(const file of ['src/features/games/holdover/source/NOTICE.md','src/features/games/holdover/source/src/fonts/OFL-barlow.txt','src/features/games/holdover/source/src/fonts/OFL-barlow-condensed.txt','src/features/games/holdover/source/src/fonts/JetBrainsMono-OFL.txt','public/games/cricketer/PLAYER-LICENSE.txt','public/games/cricketer/CREDITS.md','public/games/longbow/CREDITS.md','public/games/yorker/CREDITS.md','public/games/yorker/PLAYER-LICENSE.txt','public/games/f1-racing/kenney/License.txt','public/games/longbow/OFL-barlow-condensed.txt','src/features/games/rim-rush/fonts/OFL-lilita-one.txt','public/games/rim-rush/CREDITS.md','src/features/games/open-golf/source/LICENSE','src/features/games/open-golf/fonts/OFL-rubik.txt','src/features/games/open-golf/source/THIRD-PARTY-NOTICES.txt','src/features/games/open-golf/source/THIRD-PARTY-NOTICES.txt','src/features/games/open-golf/source/THIRD-PARTY-NOTICES.txt','src/features/games/pitch-rush/source/LICENSE','vendor/final-third/ASSETS.md','vendor/final-third/OFL-barlow-condensed.txt','src/features/games/portfolio-formula/source/NOTICE.md','src/features/games/portfolio-formula/source/THIRD-PARTY-NOTICES.txt','src/features/games/portfolio-formula/source/src/assets/fonts/Archivo-OFL.txt','src/features/games/portfolio-formula/source/src/assets/fonts/JetBrainsMono-OFL.txt','node_modules/react/LICENSE','node_modules/react-dom/LICENSE','node_modules/three/LICENSE','src/app/fonts/space-grotesk-OFL.txt','public/games/retro-football/THIRD-PARTY-LICENSES.txt','public/games/retro-circuit/reference/NOTICE.txt','vendor/cricketv2/CREDITS.md','vendor/cricketv2/assets/THREE-LICENSE.txt'])notices.push(file+'\n\n'+await fs.readFile(path.join(root,file),'utf8'));
notices.push('Pitch Rush artwork — Kenney Sports Pack\n\n'+await fs.readFile(path.join(root,'public/games/pitch-rush/KENNEY-LICENSE.txt'),'utf8'));
await fs.writeFile(path.join(output,'LICENSES.txt'),notices.join('\n\n---\n\n'));
