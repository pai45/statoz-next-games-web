/* eslint-disable @next/next/no-img-element -- Local identity SVGs also render in offline game bundles. */
"use client";
import {BUILD_VERSION,ASSET_VERSION,REFERENCE_PROFILE} from "./reference-profile";
import {mountRetroPresentation} from "../shared/retro/runtime";
import {RetroPresentationSettings} from "../shared/retro/settings";
import {useCallback,useEffect,useRef,useState} from "react";
import {createMatch,HZ,step,type Match,type TeamStats} from "./simulation";
import {loadPictures} from "./presentation";
import {createRenderer} from "./renderer";
import {VIEW} from "./view";
import {HoopsJoystick} from "./joystick";
import {HoopsInput,type Control} from "./input";
import {HoopsAudio} from "./audio";
import {addResult,readArchive,writeArchive,type Archive,type Settings} from "./persistence";
import styles from "./screen.module.css";

type View={score:[number,number];time:number;shot:number;charge:number;phase:string;paused:boolean;started:boolean;callout?:string;period:number;stats?:[TeamStats,TeamStats];opponentCharge?:number};
const initial:View={score:[0,0],time:120,shot:24,charge:0,phase:"playing",paused:false,started:false,period:1};
export type HoopsHostEvent={type:"ready"|"settings"|"result"|"error"|"exit";payload:unknown};
export type HoopsGameProps={assetBase:string;onExit:()=>void;onEvent?:(event:HoopsHostEvent)=>void;hostSettings?:Settings;hostCommand?:{id:number;type:"pause"|"resume"}};
export function HoopsGame({assetBase,onExit,onEvent,hostSettings,hostCommand}:HoopsGameProps){
  const shell=useRef<HTMLElement>(null),canvas=useRef<HTMLCanvasElement>(null),session=useRef<{start:()=>void;pause:(force?:boolean)=>void;input:HoopsInput;settings:(s:Settings)=>void}|null>(null);
  const [attempt,setAttempt]=useState(0),[error,setError]=useState(""),[loaded,setLoaded]=useState(false),[view,setView]=useState(initial),[settings,setSettings]=useState<Settings>({sfx:true,music:false});
  const [options,setOptions]=useState(false);
  const joystickInput=useCallback(()=>session.current?.input??null,[]);
  const eventHandler=useRef(onEvent);
  useEffect(()=>mountRetroPresentation(shell.current!,()=>session.current?.pause(true)),[]);
  useEffect(()=>{eventHandler.current=onEvent;},[onEvent]);
  useEffect(()=>{
    const onEvent=(event:HoopsHostEvent)=>eventHandler.current?.(event);
    const abort=new AbortController(),input=new HoopsInput(),audio=new HoopsAudio();let render:ReturnType<typeof createRenderer>|null=null,resizeObserver:ResizeObserver|null=null,raf=0,dead=false,paused=false,started=false,last=0,acc=0;
    let storage:Storage|null=null;try{storage=localStorage;}catch{}
    let archive:Archive=readArchive(storage),match:Match=createMatch(crypto.getRandomValues(new Uint32Array(1))[0],false,{...archive.settings,opening:true}),resultSaved=false,matchNumber=0;
    const id=crypto.randomUUID();setSettings(archive.settings);audio.configure(archive.settings);
    const update=()=>setView({score:[...match.score],time:Math.ceil(match.remaining/HZ),shot:Math.ceil(match.shotClock/HZ),charge:match.charge[0],phase:match.phase,stats:match.stats.map(s=>({...s})) as [TeamStats,TeamStats],opponentCharge:match.charge[1],period:match.period,paused,started,callout:match.lastScore&&match.tick-match.lastScore.tick<55?`${match.lastScore.team===0?"BLUE":"RED"} +${match.lastScore.value}`:""});
    const pause=()=>{paused=true;shell.current?.querySelectorAll("[data-held]").forEach(b=>b.removeAttribute("data-held"));input.clear();match.buffer=null;acc=0;last=0;audio.pause();update();};
    const start=()=>{if(!render||dead||shell.current?.inert)return;if(match.phase==="result"||!started){match=createMatch(crypto.getRandomValues(new Uint32Array(1))[0],false,{...archive.settings,opening:true});resultSaved=false;}started=true;paused=false;input.clear();last=0;acc=0;void audio.unlock().catch(()=>{});update();};
    session.current={start,pause:force=>force?pause():paused?start():pause(),input,settings:s=>{archive={...archive,settings:s};writeArchive(storage,archive);audio.configure(s);onEvent?.({type:"settings",payload:s});}};
    const editable=(target:EventTarget|null)=>target instanceof HTMLElement&&!!target.closest('input,textarea,select,[contenteditable="true"]');
    const key=(e:KeyboardEvent)=>{if(e.code==="Escape"&&e.type==="keydown"&&!e.repeat){if(started)session.current?.pause();return;}if(e.type==="keydown"&&editable(e.target))return;if(input.key(e.code,e.type==="keydown"))e.preventDefault();};
    const focusControl=(e:FocusEvent)=>{if(editable(e.target)){input.clear();match.buffer=null;}};
    const background=()=>{if(document.hidden&&started)pause();};
    const blur=()=>{if(started)pause();else input.clear();};
    const lost=(e:Event)=>{e.preventDefault();pause();setError("The court display stopped. Reload the game to continue.");};
    window.addEventListener("keydown",key);window.addEventListener("keyup",key);window.addEventListener("blur",blur);window.addEventListener("focusin",focusControl);document.addEventListener("visibilitychange",background);
    const element=canvas.current!;
    const resize=()=>{if(!render)return;const r=element.parentElement!.getBoundingClientRect();if(r.height>0)render.resize(VIEW.window*r.width/r.height);};
    window.addEventListener("resize",resize);
    element.addEventListener("webglcontextlost",lost);
    const loop=(now:number)=>{if(dead)return;raf=requestAnimationFrame(loop);if(!render)return;
      if(started&&!paused&&match.phase!=="result"){
        if(last)acc+=Math.min(.1,(now-last)/1000);last=now;
        while(acc>=1/HZ){step(match,input.read());audio.events(match.events);acc-=1/HZ;}
        if(match.tick%6===0||String(match.phase)==="result")update();
      }else{last=0;acc=0;}
      render.draw(match);
      if(match.phase==="result"&&!resultSaved){resultSaved=true;audio.pause();const result={id:id+":"+(++matchNumber),seed:match.seed,score:[...match.score] as [number,number],completedAt:new Date().toISOString(),rulesVersion:match.version,buildVersion:BUILD_VERSION,assetVersion:ASSET_VERSION,referenceProfileVersion:REFERENCE_PROFILE.version,stats:match.stats.map(s=>({...s}))};archive=addResult(archive,result);writeArchive(storage,archive);onEvent?.({type:"result",payload:result});update();}
    };
    void loadPictures(assetBase,abort.signal).then(p=>{if(dead)return;render=createRenderer(element,p);resize();resizeObserver=new ResizeObserver(resize);resizeObserver.observe(element.parentElement!);setLoaded(true);onEvent?.({type:"ready",payload:{gameId:"retro-hoops",rulesVersion:match.version}});update();raf=requestAnimationFrame(loop);}).catch(e=>{if(!dead){const message=e instanceof Error?e.message:"The court could not load.";setError(message);onEvent?.({type:"error",payload:{message}});}});
    return()=>{dead=true;abort.abort();cancelAnimationFrame(raf);session.current=null;input.clear();resizeObserver?.disconnect();window.removeEventListener("resize",resize);render?.dispose();void audio.dispose();window.removeEventListener("keydown",key);window.removeEventListener("keyup",key);window.removeEventListener("blur",blur);window.removeEventListener("focusin",focusControl);document.removeEventListener("visibilitychange",background);element.removeEventListener("webglcontextlost",lost);};
  },[attempt,assetBase]);
  useEffect(()=>{if(hostSettings){setSettings(hostSettings);session.current?.settings(hostSettings);}},[hostSettings]);
  useEffect(()=>{if(hostCommand?.type==="pause")session.current?.pause(true);else if(hostCommand?.type==="resume")session.current?.start();},[hostCommand]);
  useEffect(()=>{if(!options)return;const previous=document.activeElement;const dialog=shell.current?.querySelector('[role="dialog"]');const key=(e:KeyboardEvent)=>{if(e.code==="Escape"){e.preventDefault();e.stopImmediatePropagation();setOptions(false);}else if(e.code==="Tab"&&dialog){const controls=Array.from(dialog.querySelectorAll<HTMLElement>('button,input,select'));const first=controls[0],last=controls[controls.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};document.addEventListener("keydown",key,true);return()=>{document.removeEventListener("keydown",key,true);if(previous instanceof HTMLElement)previous.focus();};},[options]);
  const change=(s:Settings)=>{setSettings(s);session.current?.settings(s);};
  const controlsActive=loaded&&!error&&view.started&&!view.paused&&view.phase!=="result"&&!options;
  const button=(control:Control,label:string,face:string)=> <button disabled={!controlsActive} type="button" className={styles[control]} data-control={control} aria-label={label} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.dataset.held="true";session.current?.input.down("p"+e.pointerId,control);}} onPointerUp={e=>{delete e.currentTarget.dataset.held;session.current?.input.up("p"+e.pointerId);}} onPointerCancel={e=>{delete e.currentTarget.dataset.held;session.current?.input.up("p"+e.pointerId);}} onLostPointerCapture={e=>{delete e.currentTarget.dataset.held;session.current?.input.up("p"+e.pointerId);}}><span>{face}</span></button>;
  return <section ref={shell} data-retro-frame data-hoops-layout="onscreen" data-controls-active={controlsActive} data-left-handed={settings.leftHanded===true} data-scanlines={settings.scanlines===true} style={{"--control-scale":settings.controlScale??1} as React.CSSProperties} className={styles.root} aria-label="Rimforge 3 fullscreen basketball">
    <header className={styles.header}><button onClick={()=>{onEvent?.({type:"exit",payload:{}});onExit();}}>Exit</button><h1><img src="../../assets/games/identity/retro-hoops.svg" alt="" width="42" height="31" style={{display:"inline-block",verticalAlign:"middle",marginRight:8}}/>RIMFORGE 3 <small>POCKET ARCADE / 3V3</small></h1><div className={styles.utility}><button disabled={!loaded||!view.started||view.phase==="result"} onClick={()=>session.current?.pause()}>{view.paused?"Resume":"Pause"}</button><button aria-label="Settings" onClick={()=>{session.current?.pause(true);setOptions(true);}}>Settings</button></div></header>
    <div className={styles.console}>
      <aside className={styles.leftGrip} aria-label="Movement controls"><HoopsJoystick input={joystickInput} disabled={!controlsActive}/></aside>
      <main className={styles.display}>
        <div className={styles.score} aria-live="off"><span>BLUE <strong>{String(view.score[0]).padStart(2,"0")}</strong></span><span><b>{Math.floor(view.time/60)}:{String(view.time%60).padStart(2,"0")}</b><small>{view.phase==="opening"?"TIP OFF":view.phase==="interval"?"INTERVAL":`PERIOD ${view.period}`}</small></span><span><strong>{String(view.score[1]).padStart(2,"0")}</strong> RED</span></div>
        <div className={styles.court}><canvas ref={canvas} width={360} height={252} aria-label="Full-court three versus three basketball" />
          {(view.phase==="opening"||view.phase==="interval")&&view.started&&!view.paused&&<div className={styles.transition} role="status">{view.phase==="opening"?"TIP OFF":"HALF TIME"}<small>{view.phase==="opening"?"GET READY":"NEXT PERIOD"}</small></div>}
          {view.callout&&<div className={styles.callout} aria-live="polite">{view.callout}<small>BUCKET!</small></div>}
          {(error||!loaded||!view.started||view.paused||view.phase==="result")&&<div className={styles.overlay} role={error?"alert":"status"}>
            <img src="../../assets/games/identity/retro-hoops.svg" alt="Rimforge 3" width="116" height="86" style={{objectFit:"contain",maxHeight:"22vh"}}/><span data-retro-decoration className={styles.hardwareLabel}>RIMFORGE 3 / ARCADE</span><h2>{error?"COURT UNAVAILABLE":!loaded?"LOADING COURT":view.phase==="result"?(view.score[0]===view.score[1]?"DRAW":view.score[0]>view.score[1]?"BLUE WINS":"RED WINS"):view.paused&&view.started?"PAUSED":"TAKE THE COURT"}</h2>
            {error?<><p>{error}</p><button onClick={()=>{setError("");setLoaded(false);setView(initial);setAttempt(n=>n+1);}}>Retry loading</button></>:loaded&&<><p>Drag the joystick or use WASD / arrows. A (J) shoots or blocks; B (K) passes or steals. Tap A again during a dunk to fake; B passes out.</p>{view.phase==="result"&&view.stats&&<table className={styles.results}><caption>SCORE BOARD</caption><thead><tr><th>BLUE</th><th>STAT</th><th>RED</th></tr></thead><tbody>{([['DUNKS','dunks'],['3-PTS','threes'],['REBOUNDS','rebounds'],['BLOCKS','blocks'],['TURNOVERS','turnovers']] as const).map(([label,key])=><tr key={key}><td>{view.stats![0][key]}</td><th>{label}</th><td>{view.stats![1][key]}</td></tr>)}<tr><td>{Math.round(view.stats[0].made/Math.max(1,view.stats[0].shots)*100)}%</td><th>SHOOTING</th><td>{Math.round(view.stats[1].made/Math.max(1,view.stats[1].shots)*100)}%</td></tr></tbody></table>}
            <button onClick={()=>session.current?.start()}>{view.phase==="result"?"Rematch":view.paused&&view.started?"Resume match":"Start match"}</button></>}
          </div>}
        </div>
        <div className={styles.displayFooter}><span>SUPER</span><meter min="0" max="100" value={view.charge} aria-label="Super shot charge"/><span>{view.charge===100?"READY":view.charge+"%"}</span><span className={styles.statusLamp} data-live={view.started&&!view.paused}/> <span>RIVALS</span><meter min="0" max="100" value={view.opponentCharge??0} aria-label="Opponent super shot charge"/></div>
      </main>
      <aside className={styles.rightGrip} aria-label="Action controls"><div className={styles.actions}><div>{button("shoot","Shoot or block","A")}<span>SHOOT / BLOCK <kbd>J</kbd></span></div><div>{button("pass","Pass or steal","B")}<span>PASS / STEAL <kbd>K</kbd></span></div></div></aside>
    </div>
    {options&&<div className={styles.settingsBackdrop}><section className={styles.settings} role="dialog" aria-modal="true" aria-label="Settings"><h2>SETTINGS</h2><RetroPresentationSettings/><p>Fullscreen court with an on-screen joystick and action buttons.</p><label>Touch size<input aria-label="Touch size" type="range" min="0.85" max="1.2" step="0.05" value={settings.controlScale??1} onChange={e=>change({...settings,controlScale:Number(e.target.value)})}/></label><label>Left-handed controls<input type="checkbox" checked={settings.leftHanded===true} onChange={e=>change({...settings,leftHanded:e.target.checked})}/></label><label>Scanline effect<input type="checkbox" checked={settings.scanlines===true} onChange={e=>change({...settings,scanlines:e.target.checked})}/></label><label>Period time<select aria-label="Period time" disabled={view.started&&view.phase!=="result"} value={settings.gameSeconds??120} onChange={e=>change({...settings,gameSeconds:Number(e.target.value)})}>{Array.from({length:13},(_,i)=>60+i*15).map(v=><option key={v} value={v}>{Math.floor(v/60)}:{String(v%60).padStart(2,"0")}</option>)}</select></label><label>Period format<select aria-label="Period format" disabled={view.started&&view.phase!=="result"} value={settings.periods??2} onChange={e=>change({...settings,periods:Number(e.target.value)===2?2:1})}><option value="1">One period (C-type)</option><option value="2">Two periods (A-type)</option></select></label><label><input type="checkbox" checked={settings.sfx} onChange={e=>change({...settings,sfx:e.target.checked})}/> Sound effects</label><label>Sound volume<input aria-label="Sound volume" type="range" min="0" max="1" step="0.05" value={settings.sfxVolume??.7} onChange={e=>change({...settings,sfxVolume:Number(e.target.value)})}/></label><label><input type="checkbox" checked={settings.music} onChange={e=>change({...settings,music:e.target.checked})}/> Music</label><label>Music volume<input aria-label="Music volume" type="range" min="0" max="1" step="0.05" value={settings.musicVolume??.4} onChange={e=>change({...settings,musicVolume:Number(e.target.value)})}/></label><p>Original synthesized music and sound effects.</p><button autoFocus onClick={()=>setOptions(false)}>Back to game</button><small>Resume the match when you are ready.</small></section></div>}
  </section>;
}
