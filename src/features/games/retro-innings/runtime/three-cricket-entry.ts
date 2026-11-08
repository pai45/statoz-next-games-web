/* eslint-disable @typescript-eslint/no-explicit-any -- The preserved legacy match bridge is validated by state-parity checks. */
import{CricketPresentation}from'./three-cricket-renderer';
import { installCricketConsole } from './cricket-console';
declare global {interface Window{matchReady:Promise<void>;presentationBridge:any;render:()=>void;threeCricket?:any;gameState:unknown;matchLab:any;}}
void window.matchReady.then(async()=>{
 await document.fonts.ready;const b=window.presentationBridge,reference=b.canvas as HTMLCanvasElement,canvas=document.createElement('canvas');
 try{const renderer=new CricketPresentation(b.images,canvas);reference.id='referenceGame';reference.setAttribute('aria-hidden','true');reference.style.display='none';canvas.id='game';canvas.setAttribute('aria-label','Retro Innings Three.js cricket field');reference.parentElement!.appendChild(canvas);
 const pocket=installCricketConsole();const original=window.render;let lost=false;window.render=()=>{original();if(lost)return;renderer.render(window.gameState,b.data,b.view());pocket.sync();};
 const lose=()=>{lost=true;const s=window.gameState as {status:string;paused:boolean};if(s.status==='playing'&&!s.paused)document.querySelector<HTMLButtonElement>('#pause')!.click();document.querySelector('#fatal')!.textContent='Graphics interrupted. Play is paused; reload if graphics cannot recover.';};const restore=()=>{lost=false;document.querySelector('#fatal')!.textContent='Graphics restored. Resume when ready.';window.render();};window.addEventListener('retro-graphics-lost',lose);window.addEventListener('retro-graphics-restored',restore);
 const resized=()=>pocket.fit();window.addEventListener('resize',resized);
 let disposed=false;const dispose=()=>{if(disposed)return;disposed=true;pocket.dispose();window.removeEventListener('resize',resized);window.removeEventListener('retro-graphics-lost',lose);window.removeEventListener('retro-graphics-restored',restore);window.render=original;renderer.dispose();};window.addEventListener('pagehide',dispose,{once:true});window.threeCricket={renderer:'Three.js native atlas quads; Canvas only for turf/HUD texture generation',diagnostics:()=>renderer.diagnostics(),dispose};window.render();
 }catch(e){reference.style.display='block';document.querySelector('#fatal')!.textContent='WebGL unavailable; Canvas preview retained. '+String(e);window.threeCricket={error:String(e),fallback:true};}
 window.parent.postMessage({type:'statoz.next.games-web.retro-innings:ready',version:1},window.location.origin);
});
