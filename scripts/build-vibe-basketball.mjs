import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {engineExternals,engineModulePrelude} from './build-game-engine.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(root,'src/features/games/vibe-basketball/source');
const feature=path.join(root,'src/features/games/vibe-basketball');
export async function verifyVibeSource(){
 const manifest=JSON.parse(await fs.readFile(path.join(source,'SOURCE.json'),'utf8'));
 if(manifest.commit!=='184a5b27ee259869744f0b32de9954ab7983c1bb')throw Error('Unexpected Vibe Basketball revision');
 for(const [name,hash] of Object.entries(manifest.files)){
  if(path.isAbsolute(name)||name.split(/[\\/]/).includes('..'))throw Error('Invalid baseline path');
  const bytes=await fs.readFile(path.join(source,name));
  if(createHash('sha256').update(bytes).digest('hex')!==hash)throw Error('Vibe Basketball baseline changed: '+name);
 }
 return manifest;
}
export async function verifyVibeArt(){
 const directory=path.join(root,'public/games/vibe-basketball/art');
 const manifest=JSON.parse(await fs.readFile(path.join(directory,'PROVENANCE.json'),'utf8'));
 for(const [name,hash] of Object.entries(manifest.files)){
  if(path.isAbsolute(name)||name.includes('..'))throw Error('Invalid Vibe art path');
  const bytes=await fs.readFile(path.join(directory,name));
  if(createHash('sha256').update(bytes).digest('hex')!==hash)throw Error('Vibe art hash changed: '+name);
 }
 return directory;
}
export async function buildVibeBasketball(){
 await verifyVibeSource();
 const art=await verifyVibeArt();
 const pkg=JSON.parse(await fs.readFile(path.join(source,'node_modules/three/package.json'),'utf8').catch(()=>{throw Error('Run npm ci --prefix src/features/games/vibe-basketball/source before building Vibe Basketball');}));
 if(pkg.version!=='0.170.0')throw Error('Vibe Basketball requires Three.js 0.170.0');
 const out=path.join(root,'public/embedded-games/vibe-basketball');
 await fs.mkdir(out,{recursive:true});
 const replace=(text,from,to)=>{if(!text.includes(from))throw Error('Upstream integration anchor changed: '+from);return text.replace(from,to);};
 await build({entryPoints:[path.join(source,'src/main.js')],outfile:path.join(out,'game.js'),bundle:true,format:'esm',external:[...engineExternals,'./adapter.js'],target:'es2022',minify:true,keepNames:true,alias:{three:path.join(source,'node_modules/three')},legalComments:'eof',plugins:[{name:'vibe-host',setup(b){
  b.onLoad({filter:/[\\/]src[\\/]main\.js$/},async args=>{
   let text=(await fs.readFile(args.path,'utf8')).replaceAll('\r\n','\n');
   text="import {renderProfile,prepareMobileScene,createPerformanceController} from "+JSON.stringify(path.join(feature,'performance.js'))+";\n"+text;
   text="import {preloadAthletes} from "+JSON.stringify(path.join(feature,'athlete-assets.js'))+";\nimport {createLobby} from "+JSON.stringify(path.join(feature,'lobby.js'))+";\n"+text;
   text=replace(text,'// ---------------------------------------------------------------- renderer','await preloadAthletes();\n// ---------------------------------------------------------------- renderer');
   text=replace(text,'const hud = new HUD();','const hud = new HUD(); const lobby = START_MODE ? null : createLobby(renderer);');
   text=replace(text,"if (params.has('clean')) hud.toggleHelp();","if (!params.has('help')) hud.toggleHelp();");
   text=text.replaceAll('game?.update(dt);','game?.update(dt); if(!game)lobby?.update(dt);');
   text=replace(text,'  manualFrames += steps;','  if(!game)lobby?.update(ms/1000);\n  manualFrames += steps;');
   text=text.replaceAll('if (LITE) renderer.render(scene, camera);','if (!game && lobby) lobby.render(); else if (LITE) renderer.render(scene, camera);');
   text=replace(text,"const LITE = params.has('lite');","const LITE = !renderProfile.bloom;");
   text=replace(text,"antialias: true, powerPreference: 'high-performance'","antialias: renderProfile.antialias, powerPreference: 'high-performance'");
   text=replace(text,'renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));','renderer.setPixelRatio(renderProfile.maxDpr);');
   text=replace(text,'const court = buildCourt(scene);','const environmentNodes = new Set(); scene.traverse(node=>{if(node.isMesh)environmentNodes.add(node);}); const court = buildCourt(scene); const batched = prepareMobileScene(scene,env,environmentNodes);');
   const postStart=text.indexOf('const composer = new EffectComposer(renderer);'),postEnd=text.indexOf('// ---------------------------------------------------------------- game',postStart);
   if(postStart<0||postEnd<0)throw Error('Post-processing anchor changed');
   text=text.slice(0,postStart)+'const composer = LITE ? null : (() => {\n'+text.slice(postStart,postEnd)+'return composer;})();\n'+text.slice(postEnd);
   text=replace(text,'  composer.setSize(w, h);','  composer?.setSize(w, h); performanceController.resize();');
   text=replace(text,'  const now = performance.now();','  const now = performance.now(); performanceController.frame(now);');
   text=replace(text,'if (frameCount <= 12)','if (hud.debugOn && frameCount <= 12)');
   text=replace(text,"if (game?.mode === '1v1' && dbgT > 0.25)","if (hud.debugOn && game?.mode === '1v1' && dbgT > 0.25)");
   text=replace(text,'hud.doneLoading();','const performanceController = createPerformanceController(renderer,scene,batched); hud.doneLoading();');
   text=replace(text,'if (manualTime) return;', 'if (window.__VIBE_HOST__.paused) { clock.getDelta(); lastNow = performance.now(); return; } if (manualTime) return;');
   text=replace(text,'manualTime = true;', 'if (window.__VIBE_HOST__.paused) return; manualTime = true;');
   text=text.replaceAll('window.innerWidth',"document.getElementById('app').clientWidth").replaceAll('window.innerHeight',"document.getElementById('app').clientHeight");
   text=replace(text,'hud.doneLoading();','hud.doneLoading(); window.__VIBE_HOST__.ready();');
   text=replace(text,'location.href = location.pathname;', "location.href = (()=>{const url=new URL(location.href);url.searchParams.delete('mode');url.searchParams.delete('attract');return url.href;})();");
   text="import './adapter.js';\nimport {createGameLoop} from '@statoz/game-engine';\n"+text;
   text=replace(text,'const clock = new THREE.Clock();','const clock = { elapsedTime: 0, getDelta: () => 0 };');
   text=replace(text,'function frame() {\n  requestAnimationFrame(frame);','function frame(sharedDelta) {');
   text=replace(text,'  let dt = clock.getDelta();','  let dt = sharedDelta; clock.elapsedTime += sharedDelta;');
   text=replace(text,'  if (dt <= 1e-6) dt = Math.min((now - lastNow) / 1000, 1 / 15);','');
   text=replace(text,'frame();',"const engineLoop=createGameLoop({id:'vibe-basketball',frame:delta=>frame(delta),maxDelta:1/15,onPause:()=>window.__VIBE_HOST__.pause(),onResume:()=>window.__VIBE_HOST__.resume(),inspect:()=>({mode:game?.mode||'menu',calls:renderer.info.render.calls,triangles:renderer.info.render.triangles})});window.__VIBE_HOST__.onDispose(()=>engineLoop.dispose());");
   return {contents:text,loader:'js'};
  });
  b.onLoad({filter:/[\\/]cameraRig\.js$/},async args=>{
   let text=await fs.readFile(args.path,'utf8');
   text="import {portraitContestCamera} from "+JSON.stringify(path.join(feature,'mobile-camera.js'))+";\n"+text;
   text=replace(text,'  updateContest(dt, world) {','  updateContest(dt, world) { if(portraitContestCamera(this,dt,world,COURT))return;');
   return {contents:text,loader:'js'};
  });
  b.onLoad({filter:/[\\/]contestRacks\.js$/},async args=>({contents:replace(await fs.readFile(args.path,'utf8'),"'/models/contest/vibe-contest-props.glb'","new URL('./models/contest/vibe-contest-props.glb', location.href).href"),loader:'js'}));
  b.onLoad({filter:/[\\/]courtSfx\.js$/},async args=>({contents:"import {gameAudioBus} from '@statoz/game-engine/audio';\n"+replace(await fs.readFile(args.path,'utf8'),'unlock() {','unlock() { if (window.__VIBE_HOST__?.paused) return;').replaceAll('c.destination','gameAudioBus(c)'),loader:'js'}));
  b.onLoad({filter:/[\\/]rig\.js$/},async args=>{
   let text=(await fs.readFile(args.path,'utf8')).replaceAll('\r\n','\n');
   text="import { characterConfig, buildCharacterHead, addCharacterKit, makeJerseyMark } from "+JSON.stringify(path.join(feature,'character-design.js'))+";\n"+text;
   text="import {applyAthlete} from "+JSON.stringify(path.join(feature,'athlete-assets.js'))+";\n"+text;
   text=replace(text,'    this._ringT = Math.random() * 6;','    this._ringT = Math.random() * 6; applyAthlete(this);');
   text=replace(text,'    this.config = config;','    config = characterConfig(config); this.config = config;');
   // athlete-assets.js swaps the source shorts for one fitted garment. The source waistband
   // trim is wider than the jersey hem and shows through its sides, so it is not built.
   text=replace(text,'    put(trim, torus([0, 1.076, 0.004], 0.184, 0.013, [1, 0.55, 0.69]), ALLOW.seat);\n','');
   // The source's round pectoral overlays poke through its jersey; the torso loft already supplies the chest.
   text=text.replace(/    put\(skin, ellipsoid\(\[[-\d.]+, 1\.352, 0\.104\][^\n]+\n/g,'');
   text=replace(text,'normalScale: new THREE.Vector2(0.22, 0.22)','normalScale: new THREE.Vector2(0.10, 0.10)');
   text=replace(text,'normalScale: new THREE.Vector2(0.28, 0.28)','normalScale: new THREE.Vector2(0.12, 0.12)');
   text=replace(text,'normalScale: new THREE.Vector2(0.26, 0.26)','normalScale: new THREE.Vector2(0.12, 0.12)');
   text="import {renderProfile} from "+JSON.stringify(path.join(feature,'performance.js'))+";\n"+text;
   text=replace(text,'function ellipsoid(c, r, seg = 14) {','function ellipsoid(c, r, seg = 14) { if(renderProfile.fast)seg=Math.min(seg,10);');
   text=replace(text,'{ N = 16, round = true, open = false } = {}) {','{ N = renderProfile.fast?10:16, round = true, open = false } = {}) {');
   const start=text.indexOf('  buildHead(put, skin, hair, trim) {');
   const end=text.indexOf('  /** reset all bones to bind */',start);
   if(start<0||end<0)throw Error('Upstream head method changed');
   text=text.slice(0,start)+"  buildHead(put, skin, hair, trim) { this.characterDesign = buildCharacterHead(this.config,put,skin,hair,trim,{ringLoft,ellipsoid,limbTube,torus,allow:ALLOW.head}); }\n\n"+text.slice(end);
   text=replace(text,'    // ---------------------------------------------------------- skeleton',"    addCharacterKit(config,this.characterDesign,put,{ringLoft,limbTube,ellipsoid,torus,allow:ALLOW,J});\n    // ---------------------------------------------------------- skeleton");
   text=replace(text,'    // jersey number (front + back), skinned to chest',"    this.meshFaceLight=mk(this.characterDesign.light,new THREE.MeshStandardMaterial({color:0xf6eee0,roughness:.78}));\n    this.meshFaceInk=mk(this.characterDesign.ink,new THREE.MeshStandardMaterial({color:0x24232a,roughness:.85}));\n    this.meshKitAccent=mk(this.characterDesign.accent,new THREE.MeshStandardMaterial({color:config.shoes??0xf4ac61,roughness:.75}));\n    this.group.userData.characterDesign={version:2,name:this.characterDesign.name,hair:this.characterDesign.style};\n    // jersey number (front + back), skinned to chest");
   text=replace(text,'makeNumberTexture(cfg.number, cfg.numberColor)','makeJerseyMark(cfg.number, cfg.numberColor, config.name)');
   text=replace(text,'        g.translate(0, 1.335, z);\n        if (back) g.rotateY(Math.PI);','        if (back) g.rotateY(Math.PI);\n        g.translate(0, 1.335, z);');
   return {contents:text,loader:'js'};
  });
  b.onLoad({filter:/[\\/]animator\.js$/},async args=>{
   let text=(await fs.readFile(args.path,'utf8')).replaceAll('\r\n','\n');
   text="import {basketballGait,basketballPose,plantBasketballFeet,basketballFingers,basketballLook} from "+JSON.stringify(path.join(feature,'basketball-motion.js'))+";\n"+text;
   text=replace(text,"    if (style === 'run') {","    if (basketballGait(this,dt,ctx)) { /* Basketball-specific gait owns the base pose. */ } else if (style === 'run') {");
   text=replace(text,'  applyPose(pose, ctx) {','  applyPose(pose, ctx) { if(basketballPose(this,pose,ctx))return;');
   text=replace(text,'    // ---------------- arm IK to ball / explicit targets ----------------','    plantBasketballFeet(this,ctx);\n    // ---------------- arm IK to ball / explicit targets ----------------');
   text=replace(text,'    // ---------------- head look ----------------','    basketballFingers(this,dt,ctx);\n    // ---------------- head look ----------------');
   text=replace(text,'  applyLook(target, dt, weight) {','  applyLook(target, dt, weight) { return basketballLook(this,target,dt,weight);');
   return {contents:text,loader:'js'};
  });
  b.onLoad({filter:/[\\/]entities[\\/]player\.js$/},async args=>{
   let text=(await fs.readFile(args.path,'utf8')).replaceAll('\r\n','\n');
   text="import {characterConfig} from "+JSON.stringify(path.join(feature,'character-design.js'))+";\n"+text;
   text=replace(text,'  constructor(scene, config) {','  constructor(scene, config) { config=characterConfig(config);');
   text=text.replaceAll('0x42e7ff','0xeea164').replaceAll("'#42e7ff'","'#eea164'");
   text=replace(text,'    const ctx = {','    const ctx = { shotRelease: this.action?.perfectT ?? .68,');
   return {contents:text,loader:'js'};
  });
  b.onLoad({filter:/[\\/]hud\.js$/},async args=>{
   let text=await fs.readFile(args.path,'utf8');
   text=replace(text,"    if (!data || this.mode !== 'three-point') return;", "    if (!data || this.mode !== 'three-point') return; const displayKey=JSON.stringify([data.stage,data.state,data.entrant,Math.ceil(data.clock),data.clock<10.5,data.score,data.station,data.attempt,data.canSkipCpu,data.attempts.map(a=>[a.kind,a.resolved,a.made]),data.roadmap]);if(this._displayKey===displayKey)return;this._displayKey=displayKey;");
   text=replace(text,'  setScore(a, b) {','  setScore(a, b) { if(this._scoreA===a&&this._scoreB===b)return;this._scoreA=a;this._scoreB=b;');
   text=replace(text,'  setPossession(teamIdx) {','  setPossession(teamIdx) { if(this._possession===teamIdx)return;this._possession=teamIdx;');
   text=replace(text,'    const v = Math.max(0, Math.ceil(s));','    const v = Math.max(0, Math.ceil(s)); const key=v+":"+(s<5.5);if(this._shotClockKey===key)return;this._shotClockKey=key;');
   return {contents:text,loader:'js'};
  });
  b.onLoad({filter:/[\\/]input\.js$/},async args=>({contents:replace(await fs.readFile(args.path,'utf8'),'let mag = Math.hypot(ix, iz);','if (window.__VIBE_HOST__?.move) { ix = window.__VIBE_HOST__.move.x; iz = window.__VIBE_HOST__.move.z; } let mag = Math.hypot(ix, iz);'),loader:'js'}));
 }}]});
 let html=await fs.readFile(path.join(source,'index.html'),'utf8');
 const menuStart=html.indexOf('    <section id="mode-menu"'),menuEnd=html.indexOf('    <section id="how-to-play"',menuStart);
 if(menuStart<0||menuEnd<0)throw Error('Vibe lobby integration anchor changed');
 html=html.slice(0,menuStart)+await fs.readFile(path.join(feature,'lobby.html'),'utf8')+'\n\n'+html.slice(menuEnd);
 for(const [symbol,number] of [['ϟ','01'],['✦','02'],['◆','03'],['➤','04']])html=html.replace('<i>'+symbol+'</i>','<i>'+number+'</i>');
 for(const [oldLabel,label] of [['ORANGE','BONE / FOREST'],['MAGENTA','PLUM / INK'],['GREEN','SAGE / FOREST'],['RED','CLAY / INK']])html=html.replace('<small>'+oldLabel+'</small>','<small>'+label+'</small>');
 html=replace(html,'href="/src/style.css"','href="./original.css"');
 html=replace(html,'<script type="module" src="/src/main.js"></script>',(await engineModulePrelude(['core','audio']))+'<script type="module" src="./game.js"></script>');
 html=html.replace('<html','<html data-game="vibe-basketball"');
 html=replace(html,'</head>','<link rel="stylesheet" href="./mobile.css"><link rel="stylesheet" href="./presentation.css"><link rel="preload" href="./fonts/barlow-condensed-800.woff2" as="font" type="font/woff2" crossorigin></head>');
 html=html.replace('width=device-width, initial-scale=1.0','width=device-width, initial-scale=1.0, viewport-fit=cover');
 await fs.writeFile(path.join(out,'index.html'),html);
 await fs.copyFile(path.join(source,'src/style.css'),path.join(out,'original.css'));
 for(const name of ['adapter.js','mobile.css','presentation.css'])await fs.copyFile(path.join(feature,name),path.join(out,name));
 await fs.cp(art,path.join(out,'models/athletes'),{recursive:true});
 await fs.mkdir(path.join(out,'fonts'),{recursive:true});
 await fs.copyFile(path.join(feature,'assets/fonts/barlow-condensed-800.woff2'),path.join(out,'fonts/barlow-condensed-800.woff2'));
 await fs.mkdir(path.join(out,'models/contest'),{recursive:true});
 await fs.copyFile(path.join(source,'public/models/contest/vibe-contest-props.glb'),path.join(out,'models/contest/vibe-contest-props.glb'));
 const notices=await Promise.all(['LICENSE','THIRD_PARTY_NOTICES.md','node_modules/three/LICENSE'].map(async name=>name+'\n\n'+await fs.readFile(path.join(source,name),'utf8')));
 notices.push(await fs.readFile(path.join(art,'CREDITS.txt'),'utf8'),await fs.readFile(path.join(art,'QUATERNIUS-LICENSE.txt'),'utf8'),await fs.readFile(path.join(feature,'assets/fonts/OFL-barlow-condensed.txt'),'utf8'));
 await fs.writeFile(path.join(out,'LICENSES.txt'),notices.join('\n\n---\n\n'));
 console.log('Vibe Basketball: pinned Three.js 0.170.0, verified local CC0 athletes, warmup lobby, responsive touch adapter');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await buildVibeBasketball();
