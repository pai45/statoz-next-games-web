"use client";
import {useState,useSyncExternalStore} from 'react';
import {Button} from '@statoz/design-system/games';
import {cricketSaveKey,isCricketSave} from './save';
import styles from './stadium-cricket.module.css';

export type CricketLaunch={match:{role:string;team:string;opponent:string;difficulty:string;overs:number;target:number};quality:string;sound:boolean;camera:number};
export const defaultLaunch:CricketLaunch={match:{role:'batter',team:'Masters XI',opponent:'Royals XI',difficulty:'club',overs:2,target:24},quality:'high',sound:true,camera:0};
export function normalizeLaunch(value:Partial<CricketLaunch>):CricketLaunch{
 const m={...defaultLaunch.match,...value.match};
 return {match:{role:['batter','bowler','keeper','fielder'].includes(m.role)?m.role:'batter',team:String(m.team||'Masters XI').trim().slice(0,24)||'Masters XI',opponent:String(m.opponent||'Royals XI').trim().slice(0,24)||'Royals XI',difficulty:['rookie','club','pro','legend'].includes(m.difficulty)?m.difficulty:'club',overs:[2,5,10,20].includes(Number(m.overs))?Number(m.overs):2,target:Math.max(1,Math.min(600,Math.round(Number(m.target)||24)))},quality:['low','balanced','high','ultra','cinematic'].includes(value.quality||'')?value.quality!:'high',sound:value.sound!==false,camera:[0,1,2].includes(value.camera??0)?value.camera??0:0};
}
function subscribe(change:()=>void){window.addEventListener('storage',change);return()=>window.removeEventListener('storage',change);}
function read(account:string){try{return localStorage.getItem(cricketSaveKey(account))||'';}catch{return '';}}
export function CricketSetup({account,onPlay}:{account:string;onPlay:(launch:CricketLaunch)=>void}){
 const raw=useSyncExternalStore(subscribe,()=>read(account),()=> '');
 let launch=defaultLaunch,bests:[string,string][]=[];
 try{const save=JSON.parse(raw||'null');if(isCricketSave(save)){const options=JSON.parse(save.stores['cm-options']||'{}');launch=normalizeLaunch({match:JSON.parse(save.stores['cm-match']||'{}'),quality:save.stores['cm-quality'],sound:options?.sound,camera:options?.camera});bests=Object.entries(save.stores).filter(([key])=>key.startsWith('cm-best-'));}}catch{}
 return <SetupForm key={account+raw} initial={launch} bests={bests} onPlay={onPlay}/>;
}
function SetupForm({initial,bests,onPlay}:{initial:CricketLaunch;bests:[string,string][];onPlay:(launch:CricketLaunch)=>void}){
 const [value,setValue]=useState(initial);
 const match=(key:string,next:string|number)=>setValue(v=>({...v,match:{...v.match,[key]:next}}));
 const best=bests.find(([key])=>key===`cm-best-${value.match.difficulty}-${value.match.overs}-${value.match.target}`)?.[1];
 return <form className={styles.setupForm} onSubmit={event=>{event.preventDefault();onPlay(normalizeLaunch(value));}}>
  <details className={styles.disclosure}><summary>MATCH SETUP</summary>
  <p className={styles.setupHint}>{value.match.role.toUpperCase()} · {value.match.difficulty.toUpperCase()} · {value.match.overs*6} BALLS · TARGET {value.match.target}</p>
  <div className={styles.setupGrid}>
   <label>Play as<select name="role" value={value.match.role} onChange={e=>match('role',e.target.value)}><option value="batter">Batter — chase</option><option value="bowler">Bowler — defend</option><option value="keeper">Keeper — catching challenge</option><option value="fielder">Fielder — catching challenge</option></select></label>
   <label>CPU difficulty<select name="difficulty" value={value.match.difficulty} onChange={e=>match('difficulty',e.target.value)}><option value="rookie">Rookie</option><option value="club">Club</option><option value="pro">Professional</option><option value="legend">Legend</option></select></label>
   <label>Your team<input name="team" required maxLength={24} value={value.match.team} onChange={e=>match('team',e.target.value)}/></label>
   <label>CPU team<input name="opponent" required maxLength={24} value={value.match.opponent} onChange={e=>match('opponent',e.target.value)}/></label>
   <label>Innings length<select name="overs" value={value.match.overs} onChange={e=>{const overs=Number(e.target.value);setValue(v=>({...v,match:{...v.match,overs,target:overs*12}}));}}>{[2,5,10,20].map(n=><option key={n} value={n}>{n} overs</option>)}</select></label>
   <label>Target to win<input name="target" type="number" min={1} max={600} required value={value.match.target} onChange={e=>match('target',e.target.value)}/></label>
  </div>
  <p className={styles.inputHint}>GRAPHICS, CAMERA &amp; SOUND</p><div className={styles.setupGrid}>
   <label>Graphics quality<select name="quality" value={value.quality} onChange={e=>setValue(v=>({...v,quality:e.target.value}))}>{['low','balanced','high','ultra','cinematic'].map(q=><option key={q} value={q}>{q[0].toUpperCase()+q.slice(1)}</option>)}</select></label>
   <label>Camera<select name="camera" value={value.camera} onChange={e=>setValue(v=>({...v,camera:Number(e.target.value)}))}><option value={0}>Crease</option><option value={1}>Broadcast</option><option value={2}>Batter</option></select></label>
   <label className={styles.soundChoice}><input name="sound" type="checkbox" checked={value.sound} onChange={e=>setValue(v=>({...v,sound:e.target.checked}))}/> Stadium sound</label>
  </div>
  </details>
  <p className={styles.setupHint}>{value.match.role==='batter'?'Chase the target. Choose ground or lofted and time your shot.':value.match.role==='bowler'?'Defend the target with a timed release.':'Defend the target in a timing-based catching challenge.'} {value.match.difficulty==='legend'?'Legend hides timing and advance delivery hints.':''}</p>
  <Button type="submit" size="lg" fullWidth glow>Play Cricket</Button>
  <p className={styles.setupHint}>{best?`Personal best for this difficulty, length and target: ${best} runs. Shared across roles.`:'Your selected challenge starts immediately.'}</p>
 </form>;
}
