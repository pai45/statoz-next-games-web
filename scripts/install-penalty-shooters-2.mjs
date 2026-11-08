import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd();
const source=path.resolve(process.argv.find(a=>a.startsWith('--from='))?.slice(7)||path.join(root,'../../StatOz Designer/output/research/full-game-rea-gap-pass-2026-10-29/browser-games/penalty-shooters-2/native-snapshot'));
const output=path.join(root,'public/games/penalty-shooters-2/native');
const digest=b=>createHash('sha256').update(b).digest('hex');
async function walk(dir){const files=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){if(e.isSymbolicLink())throw Error('Linked source asset');const p=path.join(dir,e.name);if(e.isDirectory())files.push(...await walk(p));else files.push(p);}return files;}
const localDom=`// Authored local platform implementation. Original SDK/network implementation replaced in this copy only.
{class PenaltyLocalPlatform extends self.DOMHandler {
 constructor(runtime){super(runtime,'skymen_pokiSDK');const no=()=>Promise.resolve(false),done=()=>Promise.resolve();this.AddRuntimeMessageHandlers([
 ['Init',()=>Promise.resolve({enabled:true,hasAds:false,hasInterstitialAds:false,hasRewardedAds:false,hasAccounts:false,hasToken:false,urlParams:{}})],
 ['LoadingEnd',done],['GameplayStart',()=>{window.__penaltyLocalDebug.gameplayStarted=true;}],['GameplayStop',done],['Interstitial',no],['Rewarded',no],['AnalyticsEvent',done],['MovePill',done],['OpenExternalLink',no],['SubmitScore',done],['Login',()=>Promise.resolve({ok:false})],['GetToken',()=>Promise.resolve(null)],['GetShareableURL',()=>Promise.resolve('')]
 ]);}
}self.RuntimeInterface.AddDOMHandlerClass(PenaltyLocalPlatform);}
`;
const files=[];
for(const file of await walk(source)){
 const relative=path.relative(source,file).split(path.sep).join('/');const raw=await fs.readFile(file);let bytes=raw;let transformation=null;
 if(relative==='index.html'){
  let text=raw.toString('utf8');text=text.replace(/\s*<script src="scripts\/(?:offlineclient|register-sw)\.js" type="module"><\/script>/g,'');
  text=text.replace('<head>',`<head><meta http-equiv="Content-Security-Policy" content="default-src 'self' blob: data:; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; connect-src 'self' blob: data:; worker-src 'self' blob:; frame-src 'self';">`);
  text=text.replace('<script src="scripts/modernjscheck.js">','<script src="local-platform.js"></script><script src="scripts/modernjscheck.js">');bytes=Buffer.from(text);transformation='Remove captured site service-worker registration; install authored local platform and same-origin content policy.';
 }
 if(relative==='scripts/main.js'){
  let text=raw.toString('utf8');const marker='// scripts/plugins/skymen_pokiSDK/c3runtime/domside.js',next='// scripts/plugins/Keyboard/dom/domSide.js';const a=text.indexOf(marker),b=text.indexOf(next,a);
  if(a<0||b<=a)throw Error('Pinned SDK section changed');text=text.slice(0,a)+localDom+'\n'+text.slice(b);
  if(!text.includes('// start-export.js'))throw Error('Missing native startup marker');text=text.replace('// start-export.js','window.installPenaltyLocalRuntime();\n// start-export.js');bytes=Buffer.from(text);transformation='Replace remote DOM SDK adapter with local no-ads/no-accounts adapter; register native runtime observer before startup. Native Construct engine, project/event data and physics unchanged.';
 }
 const target=path.join(output,relative);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes);files.push({path:'native/'+relative,bytes:bytes.length,sha256:digest(bytes),sourceSha256:digest(raw),transformation});
}
const supplemental=JSON.parse(await fs.readFile(path.join(output,'../supplemental-manifest.json'),'utf8'));
for(const entry of supplemental.files){const bytes=await fs.readFile(path.join(output,'../originals',entry.path));if(digest(bytes)!==entry.sha256)throw Error('Changed supplemental original '+entry.path);await fs.mkdir(path.dirname(path.join(output,entry.path)),{recursive:true});await fs.writeFile(path.join(output,entry.path),bytes);const record={path:'native/'+entry.path,bytes:bytes.length,sha256:entry.sha256,sourceSha256:entry.sha256,sourceUrl:entry.url,transformation:null};const i=files.findIndex(f=>f.path===record.path);if(i<0)files.push(record);else files[i]=record;}
const adapter=await fs.readFile(path.join(root,'src/features/games/penalty-shooters-2/local-platform.js'));await fs.writeFile(path.join(output,'local-platform.js'),adapter);files.push({path:'native/local-platform.js',bytes:adapter.length,sha256:digest(adapter),authored:true});
const manifest={schemaVersion:1,title:'Penalty Shooters 2',localOnly:true,source:'Normally captured original public game client; preserved research snapshot, 29 October 2026.',nativeEngine:'Original Construct client, original project/event sheets, atlases, teams and physics',files};
await fs.writeFile(path.dirname(output)+'/assets-manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(`Installed ${files.length} local Penalty Shooters 2 files.`);
