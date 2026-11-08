"use client";
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {FootballEngine,gestureShot,parseProgress,recordProgress,type Mode,type Point,type Shot} from './engine';
import {createStadium} from './stadium';
import {KitCustomization} from './kit-customization';
import styles from './screen.module.css';
type Props={onExit:()=>void;onEvent?:(event:{type:string;payload:Record<string,unknown>})=>void;hostCommand?:{id:number;type:'pause'|'resume'|'dispose'}};
const SAVE='football-shooting.progress.v1';
const LEVELS=['PARK LEAGUE','CITY CUP','COASTAL CUP','NATIONAL CUP','CHAMPIONS CUP','WORLD FINAL'];
function stored(key:string,fallback:string){try{return typeof window==='undefined'?fallback:localStorage.getItem(key)??fallback}catch{return fallback}}
function save(key:string,value:string){try{localStorage.setItem(key,value)}catch{/* Storage may be unavailable; the match remains playable. */}}
export function FootballShootingGame({onExit,onEvent,hostCommand}:Props){
  const [engine]=useState(()=>new FootballEngine()),[,update]=useState(0);
  const [progress,setProgress]=useState(()=>parseProgress(stored(SAVE,'')));
  const [mode,setMode]=useState<Mode>('shootout'),[level,setLevel]=useState(1),[settings,setSettings]=useState(false),[error,setError]=useState('');
  const [sensitivity,setSensitivity]=useState(()=>Math.max(.7,Math.min(1.3,Number(stored('football-shooting.sensitivity','1'))||1)));
  const [sound,setSound]=useState(()=>stored('football-shooting.sound','on')==='on');
  const [layout,setLayout]=useState(()=>stored('football-shooting.layout','handheld'));
  const [stroke,setStroke]=useState<Point[]>([]),[aim,setAim]=useState<Shot>({x:0,y:1.2,power:.7,curve:0});
  const surface=useRef<HTMLDivElement>(null),points=useRef<Point[]>([]),pointer=useRef<number|null>(null),events=useRef(onEvent),soundEnabled=useRef(sound),audio=useRef<AudioContext|null>(null);
  useLayoutEffect(()=>{events.current=onEvent;soundEnabled.current=sound},[onEvent,sound]);
  function unlockAudio(){if(!sound)return;try{audio.current??=new AudioContext();void audio.current.resume()}catch{}}
  useEffect(()=>{
    let scene:ReturnType<typeof createStadium>|undefined,finished='';
    const unsubscribe=engine.subscribe(()=>{
      update(n=>n+1);
      if(engine.phase==='verdict'&&soundEnabled.current&&audio.current){const context=audio.current,osc=context.createOscillator(),gain=context.createGain();osc.type='sine';osc.frequency.setValueAtTime(engine.lastOutcome==='goal'||engine.lastOutcome==='target'?660:230,context.currentTime);osc.frequency.exponentialRampToValueAtTime(110,context.currentTime+.22);gain.gain.setValueAtTime(.075,context.currentTime);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+.24);osc.connect(gain).connect(context.destination);osc.start();osc.stop(context.currentTime+.25)}
      if(engine.phase==='finished'&&finished!==engine.resultId){
        finished=engine.resultId;const next=recordProgress(parseProgress(stored(SAVE,'')),engine);
        save(SAVE,JSON.stringify(next));setProgress(next);
        events.current?.({type:'result',payload:{id:engine.resultId,gameId:'football-shooting',mode:engine.mode,level:engine.level,score:engine.goals,opponentScore:engine.opponent,saves:engine.saves,targets:engine.hits,outcome:engine.won?'win':engine.goals===engine.opponent?'draw':'loss'}});
      }
    });
    const timer=setTimeout(()=>{try{if(surface.current){scene=createStadium(surface.current,engine);events.current?.({type:'ready',payload:{gameId:'football-shooting'}})}}catch{setError('Your browser could not start 3D graphics. Enable WebGL and reload to play.');events.current?.({type:'error',payload:{message:'WebGL could not start'}})}},0);
    const interrupt=()=>{points.current=[];pointer.current=null;setStroke([]);if(engine.phase!=='menu'&&engine.phase!=='finished')engine.setPaused(true)};
    const visibility=()=>{if(document.hidden)interrupt()};
    document.addEventListener('visibilitychange',visibility);window.addEventListener('blur',interrupt);
    return()=>{clearTimeout(timer);unsubscribe();scene?.dispose();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('blur',interrupt);void audio.current?.close();audio.current=null};
  },[engine]);
  useEffect(()=>{if(!hostCommand)return;const timer=setTimeout(()=>{points.current=[];pointer.current=null;setStroke([]);engine.setPaused(hostCommand.type!=='resume')},0);return()=>clearTimeout(timer)},[hostCommand,engine]);
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{if(event.target instanceof HTMLInputElement||event.target instanceof HTMLSelectElement||event.target instanceof HTMLButtonElement)return;
      if(event.code==='Escape'||event.code==='KeyP'){event.preventDefault();points.current=[];pointer.current=null;setStroke([]);engine.setPaused(!engine.paused)}
      if(engine.paused||settings)return;
      if(event.code==='Space'){event.preventDefault();if(engine.phase==='verdict')engine.advance();else if(engine.attacking)engine.shoot(aim);else engine.defend(0,1.2)}
      if(!engine.attacking&&['ArrowLeft','ArrowRight','ArrowUp'].includes(event.code)){event.preventDefault();engine.defend(event.code==='ArrowLeft'?-2.5:event.code==='ArrowRight'?2.5:0,1.5)}
    };window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[engine,aim,settings]);
  useEffect(()=>{if(!settings)return;const dialog=document.querySelector<HTMLElement>('[aria-label="Football Shooting settings"]'),previous=document.activeElement;dialog?.querySelector<HTMLElement>('button,input')?.focus();const trap=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();setSettings(false)}if(e.key==='Tab'&&dialog){const controls=[...dialog.querySelectorAll<HTMLElement>('button,input')],first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}};document.addEventListener('keydown',trap);return()=>{document.removeEventListener('keydown',trap);if(previous instanceof HTMLElement)previous.focus()}},[settings]);
  const clearStroke=()=>{points.current=[];pointer.current=null;setStroke([])};
  const pause=()=>{clearStroke();engine.setPaused(!engine.paused)};
  const start=()=>{unlockAudio();clearStroke();engine.start(mode,level)};
  const menu=()=>{clearStroke();engine.clubhouse()};
  const active=engine.phase==='aim'||engine.phase==='flight';
  const overlay=engine.phase==='menu'||engine.phase==='finished'||engine.paused||!!error;
  const controlsDisabled=!active||engine.paused;
  return <section className={styles.root} data-football-shooting data-layout={layout} data-phase={engine.phase} data-turn={engine.attacking?'shoot':'save'} data-paused={engine.paused} data-goals={engine.goals} data-saves={engine.saves} data-hits={engine.hits} data-round={engine.round}>
    <header className={styles.header}><button onClick={()=>{engine.setPaused(true);onExit()}} aria-label="Exit Football Shooting">‹ Exit</button><span>FOOTBALL <b>SHOOTING</b></span><div><button disabled={engine.phase==='menu'||engine.phase==='finished'} onClick={pause}>{engine.paused?'Resume':'Pause'}</button><button aria-label="Open settings" onClick={()=>{clearStroke();if(engine.phase!=='menu')engine.setPaused(true);setSettings(true)}}>⚙</button></div></header>
    <main className={styles.viewport}>
      <div ref={surface} className={styles.pitch}/>
      {!overlay&&<><div className={styles.scoreboard}><span>{engine.mode==='training'?'TARGET PRACTICE':LEVELS[engine.level-1]}<small>{engine.mode==='training'?`SHOT ${Math.min(5,engine.round)} / 5`:`ROUND ${Math.min(5,engine.round)} / 5`}</small></span><strong>{engine.mode==='training'?`${engine.hits} / 5`:<>{engine.goals}<i>:</i>{engine.opponent}</>}</strong><span>{engine.attacking?'YOUR SHOT':'YOUR SAVE'}<small>{engine.mode==='training'?'HIT THE GOLD RING':engine.attacking?'BEAT THE KEEPER':'WATCH THE GOLD MARKER'}</small></span></div>
      <div className={styles.instruction}>{engine.phase==='aim'?engine.attacking?'SWIPE UP · CURVE YOUR PATH':'SWIPE TO DIVE':engine.phase==='flight'?'':engine.message}</div></>}
      <div className={styles.touch} role="application" aria-label="Swipe football controls. Swipe upward to shoot, sideways to dive. Button controls are below." tabIndex={0}
        onPointerDown={event=>{if(overlay||!active||engine.phase==='flight'&&engine.attacking)return;unlockAudio();if(pointer.current!==null)return;const r=event.currentTarget.getBoundingClientRect();pointer.current=event.pointerId;points.current=[{x:event.clientX-r.left,y:event.clientY-r.top,t:performance.now()}];setStroke([...points.current]);event.currentTarget.setPointerCapture(event.pointerId)}}
        onPointerMove={event=>{if(pointer.current!==event.pointerId)return;const r=event.currentTarget.getBoundingClientRect();points.current.push({x:event.clientX-r.left,y:event.clientY-r.top,t:performance.now()});if(points.current.length>180)points.current.splice(1,1);setStroke([...points.current])}}
        onPointerUp={event=>{if(pointer.current!==event.pointerId)return;const r=event.currentTarget.getBoundingClientRect();points.current.push({x:event.clientX-r.left,y:event.clientY-r.top,t:performance.now()});if(engine.attacking){const shot=gestureShot(points.current,r.width,r.height,sensitivity);if(shot)engine.shoot(shot)}else{const a=points.current[0],b=points.current.at(-1)!;if(Math.hypot(b.x-a.x,b.y-a.y)>18)engine.defend((b.x-a.x)/r.width*10,1+(a.y-b.y)/r.height*4)}clearStroke();event.currentTarget.releasePointerCapture(event.pointerId)}}
        onPointerCancel={clearStroke} onLostPointerCapture={clearStroke}>
        {stroke.length>1&&<svg className={styles.swipe} width="100%" height="100%"><polyline points={stroke.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="#ffe3a5" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      {engine.phase==='verdict'&&!engine.paused&&<div className={styles.verdict} role="status"><span>{engine.attacking?'YOUR SHOT':'YOUR SAVE'}</span><h2>{engine.message}</h2><button onClick={()=>{clearStroke();engine.advance()}}>{engine.turn===(engine.mode==='training'?4:9)?'See results':'Next turn'} →</button></div>}
      {overlay&&<div className={styles.overlay}>{error?<div className={styles.card} role="alert"><h2>3D UNAVAILABLE</h2><p>{error}</p><button onClick={()=>location.reload()}>Reload game</button></div>:engine.paused?<div className={styles.card}><span className={styles.eyebrow}>TAKE A BREATHER</span><h2>PAUSED</h2><button onClick={()=>engine.setPaused(false)}>Resume game</button><button className={styles.secondary} onClick={menu}>Back to clubhouse</button></div>:engine.phase==='finished'?<div className={styles.card} role="status"><span className={styles.eyebrow}>{engine.mode==='training'?'PRACTICE COMPLETE':LEVELS[engine.level-1]}</span><h2>{engine.message}</h2><p>{engine.mode==='training'?`${engine.goals} goals. Best target score: ${progress.bestTraining} / 5.`:`You ${engine.goals} – ${engine.opponent} CPU · ${engine.saves} saves.`}</p>{engine.won&&engine.mode==='shootout'&&engine.level<6&&<p className={styles.unlock}>UNLOCKED · {LEVELS[engine.level]}</p>}<button onClick={start}>Play again</button><button className={styles.secondary} onClick={menu}>Back to clubhouse</button></div>:<div className={styles.card}>
        <span className={styles.eyebrow}>THE NEXT SHOT IS YOURS</span><h1>FOOTBALL<br/><em>SHOOTING</em></h1><p>Find the corner. Bend the ball.<br/>Then put on the gloves.</p>
        <div className={styles.tabs}><button aria-pressed={mode==='shootout'} onClick={()=>setMode('shootout')}>SHOOTOUT</button><button aria-pressed={mode==='training'} onClick={()=>setMode('training')}>PRACTICE</button></div>
        {mode==='shootout'?<label className={styles.level}>COMPETITION<select aria-label="Competition" value={level} onChange={event=>setLevel(Number(event.target.value))}>{LEVELS.map((name,i)=><option key={name} value={i+1} disabled={i+1>progress.unlocked}>{name}{i+1>progress.unlocked?' · LOCKED':''}</option>)}</select></label>:<p className={styles.detail}>Five balls. Hit three gold targets.<br/>Personal best: {progress.bestTraining} / 5</p>}
        <KitCustomization/>
        <button className={styles.play} onClick={start}>{mode==='shootout'?'Kick off':'Start practice'} <span>↗</span></button>
        <small>Original browser game · Play against the CPU<br/>Progress saves locally for this account.</small>
      </div>}</div>}
    </main>
    <footer className={styles.footer}>
      {engine.phase==='menu'||engine.phase==='finished'?<div className={styles.guide}><b>SWIPE TO STRIKE</b><span>Longer = higher · Faster = harder · Curved path = spin</span></div>:<><div className={styles.assists} aria-label={engine.attacking?'Shot aiming buttons':'Goalkeeper dive buttons'}>{engine.attacking?<>{([{x:-2.7,y:1.9,label:'Top left'},{x:0,y:.65,label:'Center'},{x:2.7,y:1.9,label:'Top right'}]).map(p=><button key={p.label} disabled={controlsDisabled||engine.phase!=='aim'} aria-label={`Aim ${p.label.toLowerCase()}`} aria-pressed={aim.x===p.x&&aim.y===p.y} onClick={()=>setAim({...aim,x:p.x,y:p.y})}>{p.label}</button>)}</>:<>{[-2.5,0,2.5].map((x,i)=><button key={x} disabled={controlsDisabled||!!engine.dive} onClick={()=>{unlockAudio();engine.defend(x,1.5)}}>{['↖ Left','↑ Center','Right ↗'][i]}</button>)}</>}</div>{engine.attacking?<button className={styles.strike} disabled={controlsDisabled||engine.phase!=='aim'} onClick={()=>{unlockAudio();engine.shoot(aim)}}>STRIKE ↗</button>:<span className={styles.diveLabel}>{engine.dive?'DIVE COMMITTED':'SWIPE OR TAP TO DIVE'}</span>}</>}
    </footer>
    {settings&&<div className={styles.settingsBackdrop}><section className={styles.card} role="dialog" aria-modal="true" aria-label="Football Shooting settings"><h2>MATCH SETTINGS</h2><label className={styles.setting}>Sound<button aria-pressed={sound} onClick={()=>{const next=!sound;setSound(next);save('football-shooting.sound',next?'on':'off')}}>{sound?'On':'Off'}</button></label><label className={styles.setting}>Swipe sensitivity <strong>{Math.round(sensitivity*100)}%</strong><input aria-label="Swipe sensitivity" type="range" min="0.7" max="1.3" step="0.05" value={sensitivity} onChange={e=>{const next=Number(e.target.value);setSensitivity(next);save('football-shooting.sensitivity',String(next))}}/></label><label className={styles.setting}>Screen style<button onClick={()=>{const next=layout==='handheld'?'onscreen':'handheld';setLayout(next);save('football-shooting.layout',next)}}>{layout==='handheld'?'Handheld':'Full screen'}</button></label><p className={styles.detail}>Swipe upward from anywhere on the pitch. Longer swipes lift the ball, faster swipes add power, and bending your path adds curve. On save turns, wait for the gold marker, then swipe toward it.</p><p className={styles.detail}>Button assists work on touch and mouse. Keyboard: Space to strike / continue; arrows to dive; P to pause. Five rounds per shootout. Win to unlock the next competition.</p><button onClick={()=>setSettings(false)}>Done</button></section></div>}
  </section>;
}
