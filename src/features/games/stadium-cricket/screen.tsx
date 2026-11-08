"use client";

import Image from 'next/image';
import {useGameReturn} from '../shared/hooks/use-game-return';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Button} from '@statoz/design-system/games';
import {useAuthSession} from '@/features/auth';
import {publicAsset} from '@/shared/config';
import {cricketMessage,cricketSaveKey,emptyCricketSave,isCricketSave} from './save';
import {CricketSetup,type CricketLaunch} from './setup';
import styles from './stadium-cricket.module.css';

export function StadiumCricket(){
 const account=useAuthSession().email;
 return <AccountCricket key={account||'guest'} account={account||''}/>;
}
function AccountCricket({account}:{account:string}){
 const leave=useGameReturn();
 const [launch,setLaunch]=useState<CricketLaunch|null>(null);
 const exit=useCallback(()=>setLaunch(null),[]);
 if(launch&&account)return <CricketFrame account={account} launch={launch} onExit={exit}/>;
 return <main className={styles.lobby}>
  <div className={styles.backdrop} aria-hidden="true"><Image src={publicAsset('/games/stadium-cricket/stadium-preview.jpg')} alt="" fill priority sizes="100vw" unoptimized style={{objectFit:'cover',objectPosition:'65% center'}}/></div>
  <div className={styles.shade} aria-hidden="true"/>
  <header className={styles.navigation}>
   <button type="button" onClick={leave} aria-label="Back to Games" className={styles.back}>‹</button>
   <div className={styles.brand}>STADIUM<small>CRICKET / STATOZ</small></div>
   <span className={styles.matchday}>MATCHDAY / 3D</span>
  </header>
  <section className={styles.lobbyContent} aria-labelledby="stadium-title">
   <div className={styles.lobbyHero}>
   <p className={styles.eyebrow}>MATCHDAY / CRICKET</p>
   <h1 id="stadium-title">STADIUM<br/><span>CRICKET</span></h1>
   <p className={styles.intro}>Read the delivery. Time your moment.<br/>Everything to play for.</p>
   <dl className={styles.stats}>
    <div><dt>PLAYER ROLES</dt><dd>4</dd></div>
    <div><dt>CPU LEVELS</dt><dd>4</dd></div>
    <div><dt>OVERS</dt><dd>2–20</dd></div>
   </dl>
   </div>
   <div className={styles.lobbyActions}>
   <CricketSetup account={account} onPlay={setLaunch}/>
   <div className={styles.roles} aria-label="Available roles"><span>BAT</span><span>BOWL</span><span>KEEP</span><span>FIELD</span></div>
   <div className={styles.links}>
    <details className={styles.disclosure}>
     <summary>HOW TO PLAY</summary>
     <div className={styles.detailsBody}><p><kbd>Space</kbd> or tap the action button to bat, release the ball or attempt a catch. <kbd>L</kbd> switches ground / lofted shots.</p><p><kbd>C</kbd> Camera · <kbd>P</kbd> / <kbd>Esc</kbd> Pause · <kbd>M</kbd> Sound</p><p>Shot direction and running are automatic. Keeper and fielder modes are timing challenges.</p><p>Rookie, Club, Professional and Legend. Set your role, teams, difficulty, overs and target here before playing.</p></div>
    </details>
    <details className={styles.disclosure}>
     <summary>SOURCE &amp; CREDITS</summary>
     <div className={styles.detailsBody}><p>Adapted with permission from Cricket Masters — Stadium Edition 2.1 by RealOmlit. Original interface, procedural models, animation and synthesized audio retained.</p><p>Three.js r160: MIT. ambientCG Grass 001, Poly Haven Mud Cracked Dry 03 and 3DAssets.dev rebound net: CC0.</p><a href={publicAsset('/games/stadium-cricket/CREDITS.md')} target="_blank" rel="noreferrer">Full asset credits</a></div>
    </details>
   </div>
   <p className={styles.inputHint}>TOUCH · KEYBOARD</p>
   <p className={styles.saveHint}>Settings and personal bests save on this device for your StatOz account when browser storage is available.</p>
   </div>
  </section>
  <aside className={styles.pitchLabel}><span>MASTERS OVAL</span><small>ORIGINAL GAME / IN-GAME CAPTURE</small></aside>
 </main>;
}
function CricketFrame({account,launch,onExit}:{account:string;launch:CricketLaunch;onExit:()=>void}){
 const frame=useRef<HTMLIFrameElement>(null),viewportRoot=useRef<HTMLElement>(null);
 useEffect(()=>{
  const viewport=window.visualViewport;
  if(!viewport)return;
  const sync=()=>{if(viewport.scale===1)viewportRoot.current?.style.setProperty('--stadium-viewport-height',`${viewport.height}px`);};
  sync();viewport.addEventListener('resize',sync);window.addEventListener('resize',sync);
  return()=>{viewport.removeEventListener('resize',sync);window.removeEventListener('resize',sync);};
 },[]);
 const [status,setStatus]=useState('Preparing the stadium…'),[error,setError]=useState(''),[warning,setWarning]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  const element=frame.current;if(!element)return;
  const sessionId=crypto.randomUUID(),key=cricketSaveKey(account),controller=new AbortController();let active=true,save=emptyCricketSave();
  const command=(type:string)=>element.contentWindow?.postMessage({protocolVersion:1,gameId:'stadium-cricket',sessionId,type},location.origin);
  const receive=(event:MessageEvent)=>{
   if(!active||event.source!==element.contentWindow||event.origin!==location.origin||!cricketMessage(event.data,sessionId))return;
   const message=event.data;
   if(message.type==='ready'){clearTimeout(timeout);setStatus('');if(document.hidden)command('pause');}
   else if(message.type==='error')setError('The 3D stadium could not start. Check WebGL support and retry.');
   else if(message.type==='exit')onExit();
   else if(message.type==='reload'){setStatus('Preparing the stadium…');setAttempt(value=>value+1);}
   else if(message.type==='save'&&isCricketSave(message.payload)){
    try{localStorage.setItem(key,JSON.stringify(message.payload));}catch{setWarning('Progress could not be saved on this device. You can keep playing.');}
   }
  };
  const background=()=>{if(document.hidden)command('pause');};
  const timeout=window.setTimeout(()=>{if(active)setStatus('Still preparing the stadium. You can retry or return to the lobby.');},45000);
  const load=async()=>{
   try{
    let raw:string|null=null;try{raw=localStorage.getItem(key);}catch{setWarning('Browser storage is unavailable. Settings and bests will last for this session only.');}
    if(raw!==null){let previous:unknown;try{previous=JSON.parse(raw);}catch{throw Error('save');}if(!isCricketSave(previous))throw Error('save');save=previous;}
    save={...save,stores:{...save.stores,'cm-match':JSON.stringify(launch.match),'cm-quality':launch.quality,'cm-options':JSON.stringify({sound:launch.sound,camera:launch.camera})}};
    try{localStorage.setItem(key,JSON.stringify(save));}catch{setWarning('Settings could not be saved on this device. You can keep playing.');}
    const response=await fetch(publicAsset('/embedded-games/stadium-cricket/index.html'),{signal:controller.signal});if(!response.ok)throw Error('bundle');
    const html=await response.text();if(!html.includes('/*__STATOZ_BOOT__*/'))throw Error('bundle');
    if(active)element.srcdoc=html.replace('/*__STATOZ_BOOT__*/',()=> 'window.__STATOZ_BOOT__='+JSON.stringify({...save,sessionId,origin:location.origin,autoStart:true,launch:{sound:launch.sound,camera:launch.camera}}).replaceAll('<','\\u003c')+';');
   }catch(cause){if(active&&!controller.signal.aborted)setError(cause instanceof Error&&cause.message==='save'?'Your saved game uses an unreadable format. It has been preserved.':'The local game bundle could not load. Retry or return to the lobby.');}
  };
  window.addEventListener('message',receive);document.addEventListener('visibilitychange',background);void load();
  return()=>{active=false;controller.abort();clearTimeout(timeout);command('dispose');window.removeEventListener('message',receive);document.removeEventListener('visibilitychange',background);element.removeAttribute('srcdoc');element.src='about:blank';};
 },[account,attempt,launch,onExit]);
 return <main ref={viewportRoot} className={styles.game}>
  <div className={styles.gamebar}><Button variant="surface" onClick={onExit}>← Lobby</Button><span>STADIUM CRICKET</span><Button variant="ghost" onClick={()=>{setError('');setStatus('Preparing the stadium…');setAttempt(value=>value+1);}}>RELOAD GAME</Button></div>
  <div className={styles.frameArea}><iframe ref={frame} title="Stadium Cricket — original Cricket Masters game" allow="autoplay; fullscreen" allowFullScreen className={styles.frame}/>{(status||error)&&<div className={styles.loading} role={error?'alert':'status'}><p>{error||status}</p><Button variant="surface" onClick={onExit}>Return to lobby</Button></div>}</div>
  {warning&&<p className={styles.warning} role="status">{warning}</p>}
 </main>;
}
