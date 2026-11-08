"use client";
import {useEffect,useRef,useState, type PointerEvent} from 'react';
import {draw,emptyInput,LAP,newRace,position,step,type Input} from './engine';
import styles from './screen.module.css';

const keyActions:Record<string,keyof Input>={ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowUp:'gas',w:'gas',ArrowDown:'brake',s:'brake'};
export function ApexMobileGame({onExit}:{onExit:()=>void}) {
 const canvas=useRef<HTMLCanvasElement>(null),root=useRef<HTMLElement>(null),race=useRef(newRace()),input=useRef(emptyInput()),held=useRef(new Map<number,keyof Input>()),keys=useRef(new Set<string>()),mode=useRef('ready');
 const [status,setStatus]=useState('ready'),[hud,setHud]=useState({speed:0,lap:1,pos:6,time:0,count:3}),[active,setActive]=useState<Input>(emptyInput),[notice,setNotice]=useState('');
 const clear=()=>{held.current.clear();keys.current.clear();input.current=emptyInput();setActive(emptyInput());};
 const pause=()=>{if(mode.current!=='racing')return;mode.current='paused';setStatus('paused');clear();};
 useEffect(()=>{
  const el=canvas.current;if(!el)return;const ctx=el.getContext('2d',{alpha:false});if(!ctx)return;
  let width=1,height=1,request=0,last=0,acc=0,hudTime=0;
  const resize=()=>{const b=el.getBoundingClientRect();width=b.width;height=b.height;const dpr=Math.min(window.devicePixelRatio||1,1.5);el.width=Math.round(width*dpr);el.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);};
  const observer=new ResizeObserver(resize);observer.observe(el);resize();
  const tick=(now:number)=>{const dt=last?Math.min((now-last)/1000,.1):0;last=now;
   if(mode.current==='racing'){acc+=dt;while(acc>=1/60){step(race.current,input.current,1/60);acc-=1/60;}if(race.current.finished){mode.current='finished';setStatus('finished');}}
   else acc=0;
   draw(ctx,width,height,race.current);
   if(now-hudTime>80){const s=race.current;setHud({speed:Math.round(s.speed*3),lap:Math.min(3,1+Math.floor(s.distance/LAP)),pos:position(s),time:s.time,count:Math.ceil(s.countdown)});hudTime=now;}
   request=requestAnimationFrame(tick);
  };request=requestAnimationFrame(tick);
  const blur=()=>{if(mode.current==='racing'){mode.current='paused';setStatus('paused');}held.current.clear();keys.current.clear();input.current=emptyInput();setActive(emptyInput());};
  const hidden=()=>{if(document.hidden)blur();};window.addEventListener('blur',blur);document.addEventListener('visibilitychange',hidden);
  const mapping:Record<string,keyof Input>={ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowUp:'gas',w:'gas',ArrowDown:'brake',s:'brake'};
  const keyboard=(e:KeyboardEvent)=>{const key=e.key.length===1?e.key.toLowerCase():e.key;if(key==='Escape'&&e.type==='keydown'){blur();return;}if(!mapping[key])return;e.preventDefault();if(e.type==='keydown')keys.current.add(key);else keys.current.delete(key);const next=emptyInput();for(const k of keys.current)next[mapping[k]]=true;for(const k of held.current.values())next[k]=true;input.current=next;setActive({...next});};
  window.addEventListener('keydown',keyboard);window.addEventListener('keyup',keyboard);
  return()=>{cancelAnimationFrame(request);observer.disconnect();window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('keydown',keyboard);window.removeEventListener('keyup',keyboard);};
 },[]);
 const fullscreen=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await root.current?.requestFullscreen();}catch{setNotice('Fullscreen is unavailable here. Landscape play still fills the available screen.');}};
 const start=()=>{clear();race.current=newRace();mode.current='racing';setStatus('racing');};
 const pointer=(e:PointerEvent<HTMLButtonElement>,action:keyof Input,down:boolean)=>{e.preventDefault();if(down){e.currentTarget.setPointerCapture(e.pointerId);held.current.set(e.pointerId,action);}else held.current.delete(e.pointerId);const next={...input.current};for(const k of ['left','right','gas','brake'] as const)next[k]=[...held.current.values()].includes(k)||[...keys.current].some(key=>keyActions[key]===k);input.current=next;setActive(next);};
 const button=(action:keyof Input,label:string,text:string)=><button aria-label={label} aria-pressed={active[action]} className={styles[action]} onPointerDown={e=>pointer(e,action,true)} onPointerUp={e=>pointer(e,action,false)} onPointerCancel={e=>pointer(e,action,false)} onLostPointerCapture={e=>pointer(e,action,false)}>{text}</button>;
 const clock=(seconds:number)=>`${Math.floor(seconds/60)}:${(seconds%60).toFixed(1).padStart(4,'0')}`;
 return <section ref={root} className={styles.root} data-apex-mobile data-status={status}>
  <canvas ref={canvas} className={styles.canvas} aria-label="Apex Sprint race track"/>
  <header className={styles.header}><button onClick={()=>{clear();onExit();}}>Exit</button><div className={styles.brand}>APEX <b>SPRINT</b><small>MOBILE CIRCUIT</small></div><div className={styles.tools}><button onClick={fullscreen}>Fullscreen</button><button onClick={pause} disabled={status!=='racing'}>Pause</button></div></header>
  <div className={styles.hud}><span>POSITION <b>{hud.pos}<small> / 6</small></b></span><span>LAP <b>{hud.lap}<small> / 3</small></b></span><span>TIME <b>{clock(hud.time)}</b></span></div>
  <div className={styles.speed}><b>{hud.speed}</b><span>KM/H</span><div style={{width:`${hud.speed/3.24}%`}}/></div>
  {status==='racing'&&<><div className={styles.steering}>{button('left','Steer left','◀')}{button('right','Steer right','▶')}</div><div className={styles.pedals}>{button('brake','Brake','BRAKE')}{button('gas','Accelerate','GAS')}</div>{hud.count>0&&<div className={styles.countdown} role="status">{hud.count}</div>}</>}
  {status!=='racing'&&<div className={styles.overlay}><article className={styles.card}><small>ORIGINAL ARCADE RACING · TOUCH + KEYBOARD</small><h1>{status==='ready'?'APEX SPRINT':status==='paused'?'RACE PAUSED':'CHEQUERED FLAG'}</h1><p>{status==='ready'?'Three laps. Six cars. Find your racing line.':status==='paused'?'Take a breath. Your race is waiting.':`Position ${position(race.current)} / 6 · ${clock(race.current.time)} · ${race.current.hits} contacts`}</p>{status==='ready'&&<p>Left thumb steers · Right thumb controls gas and brake.<br/>Ease off for corners. Grass and contact cost speed.<br/>Keyboard: arrows / WASD · Esc pauses.</p>}{status==='paused'&&<button autoFocus onClick={()=>{clear();mode.current='racing';setStatus('racing');}}>Resume race</button>}<button autoFocus={status!=='paused'} onClick={start}>{status==='ready'?'Start race':'Race again'}</button><small>Landscape layout · No real teams or circuits</small></article></div>}
  {notice&&<button className={styles.notice} onClick={()=>setNotice('')}>{notice} Dismiss</button>}
 </section>;
}
