import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {GAMEPLAY_RATE,adaptSimulation,adaptKicks} from '../src/features/games/pitch-rush/gameplay.mjs';
import {engineExternals,engineModulePrelude} from './build-game-engine.mjs';

export async function buildPitchRush({prelude}) {
  const root=process.cwd(), source=path.join(root,'src/features/games/pitch-rush/source');
  const provenance=JSON.parse(await fs.readFile(path.join(source,'SOURCE.json'),'utf8'));
  for(const [name,hash] of Object.entries(provenance.files)) {
    if(createHash('sha256').update(await fs.readFile(path.join(source,name))).digest('hex')!==hash) throw Error('WebSoccer source changed: '+name);
  }
  const art=JSON.parse(await fs.readFile(path.join(root,'public/games/pitch-rush/sports-art.json'),'utf8'));
  for(const item of art.sources) {
    if(createHash('sha256').update(await fs.readFile(path.join(root,'vendor/kenney-sports-pack',item.path))).digest('hex')!==item.sha256)throw Error('Kenney source changed: '+item.path);
  }
  const atlas=await fs.readFile(path.join(root,'public/games/pitch-rush',art.atlas.file));
  if(createHash('sha256').update(atlas).digest('hex')!==art.atlas.sha256)throw Error('Pitch Rush sports atlas changed');
  const bridge=await fs.readFile(path.join(root,'src/features/games/pitch-rush/bridge.js'),'utf8');
  const result=await build({entryPoints:[path.join(source,'src/main.js')],bundle:true,write:false,format:'esm',external:engineExternals,target:'es2020',minify:true,plugins:[{name:'pitch-rush-adaptation',setup(b){
    b.onResolve({filter:/^pitch-rush-(?:art-runtime|renderer)$/},args=>({path:path.join(root,'src/features/games/pitch-rush',args.path.endsWith('renderer')?'renderer.js':'art.js')}));
    b.onResolve({filter:/^pitch-rush-journey$/},()=>({path:path.join(root,'src/features/games/pitch-rush/journey.js')}));
    b.onResolve({filter:/^pitch-rush-art$/},()=>({path:'pitch-rush-art',namespace:'sports-art'}));
    b.onLoad({filter:/.*/,namespace:'sports-art'},()=>({contents:`export const manifest=${JSON.stringify(art)};export const atlasUrl=${JSON.stringify('data:image/png;base64,'+atlas.toString('base64'))};`,loader:'js'}));
    b.onLoad({filter:/[\\/]config\.js$/},()=>({contents:"export const DEFAULT_RELAY=''; export const relayFor=()=>null; export const boardFor=()=>null;",loader:'js'}));
    b.onLoad({filter:/[\\/]game[\\/]sim\.js$/},async args=>({contents:adaptSimulation(await fs.readFile(args.path,'utf8')),loader:'js'}));
    b.onLoad({filter:/[\\/]game[\\/]kick\.js$/},async args=>({contents:adaptKicks(await fs.readFile(args.path,'utf8')),loader:'js'}));
    b.onLoad({filter:/[\\/]audio\.js$/},async args=>({contents:"import {createGameAudioContext,gameAudioBus} from '@statoz/game-engine/audio';\n"+(await fs.readFile(args.path,'utf8')).replace('new Ctx()', "createGameAudioContext('pitch-rush')").replace('this.ctx.destination','gameAudioBus(this.ctx)'),loader:'js'}));
    b.onLoad({filter:/[\\/]touch\.js$/},async args=>({contents:(await fs.readFile(args.path,'utf8')).replace('const MAX_THROW = 46;','const MAX_THROW = 28;').replace('    this.button(kick, BTN.FIRE);','    // Separate attack and defence bindings are supplied by the game adapter.'),loader:'js'}));
    b.onLoad({filter:/[\\/]main\.js$/},async args=>{
      let js=(await fs.readFile(args.path,'utf8')).replaceAll('\r\n','\n');
      js=js.replace("from './render/renderer.js'","from 'pitch-rush-renderer'").replace("from './render/titlescreen.js'","from 'pitch-rush-art-runtime'");
      if(!js.includes("const canvas = document.getElementById('game');"))throw Error('Pitch Rush bootstrap integration changed');
      js=js.replace("const canvas = document.getElementById('game');", "async function startPitchRush(){\n await prepareSportsArt();\n if(hostDisposed)return;\n const canvas = document.getElementById('game');");
      js=js.replace('import { FRAME_TIME, TICK_RATE }','import { BTN, FRAME_TIME, TICK_RATE }');
      js="import {createGameLoop} from '@statoz/game-engine';\nimport {prepareSportsArt} from 'pitch-rush-art-runtime';\nimport {mountJourney} from 'pitch-rush-journey';\nlet hostDisposed=false,engineLoop;\nwindow.__STATOZ_HOST__.command=type=>{if(type==='dispose')hostDisposed=true;};\n"+js.replaceAll('requestAnimationFrame(frame);', '');
      js=js.replace('function frame(now) {','function frame(now) {\n if(hostDisposed)return;\n hostUpdate();');
      js=js.replace('game.acc += elapsed;',`game.acc += elapsed * ${GAMEPLAY_RATE};`);
      js=js.replace('game.transport.sample(tick);','syncTouchAction(); game.transport.sample(tick);');
      js=js.replace('function beginMatch(state, transport) {','function beginMatch(state, transport) {\n journey?.beforeBeginMatch(state); releaseInputs();');
      js=js.replace('while (game.acc >= FRAME_TIME && guard < 8)', 'while (game.acc >= FRAME_TIME && guard < 8 && !game.paused)');
      js=js.replace('      step(game.state, game.transport.poll(tick));','      journey?.beforeStep();\n      step(game.state, pollHostInputs(tick));');
      js=js.replace('      game.transport.afterStep(game.state);','      game.transport.afterStep(game.state);\n      journey?.afterStep();');
      js=js.replace("if (game.state.phase === 'fulltime' && !game.transport.online)","if (game.state.phase === 'fulltime' && !game.transport.online && journey?.allowArcadeResults)");
      js=js.replace('  game.paused = on;',"  game.paused = on;\n  if(on){releaseInputs();cancelHumanCharges();journey?.capture();music.stop();audio.ctx?.suspend?.();}else if(soundOn){audio.wake();}");
      js=js.replace('function toMenu() {','function toMenu() {\n journey?.leavingMatch();game.paused=false; if(soundOn)audio.wake();');
      js=js.replace("  document.getElementById('host').disabled = false;\n}","  document.getElementById('host').disabled = false;\n journey?.returnedToMenu();\n}");
      const finish=bridge.replace("host.emit('ready');", "document.getElementById('artLoading').remove();document.getElementById('start').disabled=false;document.documentElement.dataset.artState='ready';host.emit('ready');");
      return {contents:js+'\n'+finish+`\nengineLoop=createGameLoop({id:'pitch-rush',frame:(_delta,now)=>frame(now),maxDelta:.1,onPause:()=>hostPause(),onResume:()=>{game.last=performance.now();game.acc=0;},inspect:()=>({paused:game.paused,renderer:'pixi-webgl'})});\n}
      function startWithArtwork(){startPitchRush().catch(error=>{
        console.error('Pitch Rush artwork could not load',error);
        document.documentElement.dataset.artState='error';
        const loading=document.getElementById('artLoading');
        loading.querySelector('[role="status"]').textContent='The football artwork could not load. Please try again.';
        loading.querySelector('#retryArt').hidden=false;
      });}
      document.getElementById('retryArt').addEventListener('click',()=>{
        document.getElementById('retryArt').hidden=true;
        document.querySelector('#artLoading [role="status"]').textContent='Preparing the pitch…';
        startWithArtwork();
      });
      document.getElementById('exitArt').addEventListener('click',()=>window.__STATOZ_HOST__.emit('exit'));
      startWithArtwork();`,loader:'js'};
    });
  }}]});
  let html=await fs.readFile(path.join(source,'index.html'),'utf8');
  const css=await fs.readFile(path.join(source,'styles.css'),'utf8');
  const skin=await fs.readFile(path.join(root,'src/features/games/pitch-rush/presentation.css'),'utf8');
  const cover='data:image/webp;base64,'+(await fs.readFile(path.join(root,'public/games/pitch-rush/cover.webp'))).toString('base64');
  html=html.replace('<html lang="en">','<html lang="en" data-game="pitch-rush">')
    .replaceAll('WebSoccer','Pitch Rush')
    .replace('<h1>WEB<span>SOCCER</span></h1>','<h1>PITCH<span>RUSH</span></h1>')
    .replace('HTML / JavaScript &middot; local &amp; online','ELEVEN A SIDE. ONE MORE MATCH.')
    .replace('<button data-mode="online">Online</button>','<button data-mode="online" hidden disabled>Online</button>')
    .replace('<button id="start"', '<button disabled id="start"')
    .replace('<link rel="stylesheet" href="styles.css">',()=>'<style>'+css+'\n'+skin+'</style>')
    .replace(/<link rel="(?:manifest|apple-touch-icon)"[^>]*>/g,'')
    .replace('<div id="menu" class="overlay">',()=>'<div id="menu" class="overlay" style="--cover:url('+cover+')">')
    .replace('<div class="panelFooter">','<p class="fineprint">Offline edition · CPU or two players on one device. Two-player mode uses keyboard or gamepads.</p><div class="panelFooter">')
    .replace('</body>','<footer id="gameCredits">WebSoccer by Mark Clausing · MIT / Art by Kenney · CC0</footer></body>')
    .replace('<div id="wrap">','<div id="wrap"><section id="artLoading" class="overlay" aria-label="Loading artwork"><div class="panel small"><h2>Pitch Rush</h2><p role="status">Preparing the pitch…</p><button id="retryArt" hidden type="button">Try again</button><button id="exitArt" type="button">Exit to football</button></div></section>')
    .replace('<script type="module" src="src/main.js"></script>',()=>prelude+'__ENGINE_MODULE_PRELUDE__<script type="module">'+result.outputFiles[0].text.replaceAll('</script','<\\/script')+'</script>');
  html=html.replace('__ENGINE_MODULE_PRELUDE__',await engineModulePrelude(['core','audio','render2d']));
  return html;
}
