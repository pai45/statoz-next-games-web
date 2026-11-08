/** Original, deterministic arcade rules. No native Football Strike code or formulas. */
export type Point = {x:number;y:number;t:number};
export type Shot = {x:number;y:number;power:number;curve:number};
export type Mode = 'shootout'|'training';
export type Phase = 'menu'|'aim'|'flight'|'verdict'|'finished';
export const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export function gestureShot(points:Point[],width:number,height:number,sensitivity=1):Shot|null {
  if(points.length<2||width<=0||height<=0)return null;
  const first=points[0],last=points[points.length-1],dx=last.x-first.x,dy=first.y-last.y;
  if(dy<height*.065)return null;
  const elapsed=Math.max(80,last.t-first.t),distance=Math.hypot(dx/width,dy/height);
  let bend=0;
  for(let i=1;i<points.length-1;i++){
    const p=points[i],fraction=clamp((first.y-p.y)/dy,0,1),deviation=(p.x-first.x-dx*fraction)/width;
    if(Math.abs(deviation)>Math.abs(bend))bend=deviation;
  }
  return {x:clamp(dx/width*10*sensitivity,-4.6,4.6),y:clamp(dy/height*6.5*sensitivity-.2,.15,3.6),power:clamp(distance*1000/elapsed,.2,1),curve:clamp(bend*7,-1.4,1.4)};
}
export function ballAt(shot:Shot,t:number){
  const p=clamp(t,0,1);
  return {x:shot.x*p+shot.curve*Math.sin(p*Math.PI),y:.22+(shot.y-.22)*p+Math.sin(p*Math.PI)*(.4+shot.power*.35),z:-14*p};
}
export function inGoal(shot:Shot){return Math.abs(shot.x)<3.55&&shot.y>.1&&shot.y<2.33;}
export function catches(shot:Shot,keeper:{x:number;y:number},reach=.8){return Math.hypot(shot.x-keeper.x,(shot.y-keeper.y)*.85)<reach;}
export type Progress={version:1;unlocked:number;wins:number;bestTraining:number};
export function parseProgress(value:string|null):Progress {
  try{const p=JSON.parse(value||'{}');return {version:1,unlocked:clamp(Math.floor(Number(p.unlocked)||1),1,6),wins:clamp(Math.floor(Number(p.wins)||0),0,99999),bestTraining:clamp(Math.floor(Number(p.bestTraining)||0),0,5)}}catch{return {version:1,unlocked:1,wins:0,bestTraining:0}}
}
export function recordProgress(previous:Progress,match:{won:boolean;mode:Mode;level:number;hits:number}):Progress {
  return {...previous,unlocked:match.won&&match.mode==='shootout'?Math.max(previous.unlocked,Math.min(6,match.level+1)):previous.unlocked,wins:previous.wins+(match.won&&match.mode==='shootout'?1:0),bestTraining:Math.max(previous.bestTraining,match.mode==='training'?match.hits:0)};
}
export class FootballEngine {
  phase:Phase='menu';mode:Mode='shootout';level=1;turn=0;goals=0;opponent=0;saves=0;hits=0;
  paused=false;clock=0;elapsed=0;message='';shot:Shot={x:0,y:1,power:.6,curve:0};
  keeper={x:0,y:1};dive:{x:number;y:number;at:number}|null=null;
  target={x:2.3,y:1.7};lastOutcome='';resultId='';private seed=1;private listeners=new Set<()=>void>();
  subscribe(fn:()=>void){this.listeners.add(fn);return ()=>{this.listeners.delete(fn)}}
  notify(){this.listeners.forEach(fn=>fn())}
  get attacking(){return this.mode==='training'||this.turn%2===0}
  get round(){return this.mode==='training'?this.turn+1:Math.floor(this.turn/2)+1}
  get won(){return this.mode==='training'?this.hits>=3:this.goals>this.opponent}
  random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296}
  start(mode:Mode,level:number,seed=Date.now()){
    this.mode=mode;this.level=clamp(level,1,6);this.seed=seed>>>0;this.turn=0;this.goals=0;this.opponent=0;this.saves=0;this.hits=0;this.paused=false;
    this.resultId=globalThis.crypto?.randomUUID?.()??String(seed);this.nextAim();
  }
  private nextAim(){
    this.phase='aim';this.elapsed=0;this.dive=null;this.keeper={x:0,y:1};this.target={x:(this.random()>.5?1:-1)*(1.4+this.random()*1.3),y:.6+this.random()*1.25};
    this.shot=this.attacking?{x:0,y:1,power:.65,curve:0}:{x:(this.random()-.5)*6.4,y:.35+this.random()*1.7,power:.58+this.level*.045,curve:(this.random()-.5)*1.5};
    this.message=this.attacking?'Swipe up to shoot':'Watch the marker. Swipe to dive.';this.notify();
  }
  shoot(shot:Shot){if(this.phase!=='aim'||!this.attacking||this.paused)return;this.shot={x:clamp(shot.x,-4.6,4.6),y:clamp(shot.y,.15,3.6),power:clamp(shot.power,.2,1),curve:clamp(shot.curve,-1.4,1.4)};this.launch();}
  private launch(){
    this.phase='flight';this.elapsed=0;
    if(this.attacking&&this.mode!=='training'){
      const error=1.5-this.level*.12;
      this.dive={x:clamp(this.shot.x+(this.random()-.5)*error*2-this.shot.curve*.4,-3.2,3.2),y:clamp(this.shot.y+(this.random()-.5)*error,.5,2.1),at:.18};
    }
    this.notify();
  }
  defend(x:number,y=1){if(this.attacking||this.paused||!['aim','flight'].includes(this.phase)||this.dive)return;this.dive={x:clamp(x,-3.2,3.2),y:clamp(y,.45,2.1),at:this.phase==='aim'?-this.elapsed: this.elapsed};this.notify();}
  setPaused(value:boolean){this.paused=value;this.notify()}
  clubhouse(){this.phase='menu';this.paused=false;this.notify()}
  step(dt:number){
    if(this.paused||this.phase==='menu'||this.phase==='finished')return;
    dt=clamp(dt,0,.05);this.clock+=dt;this.elapsed+=dt;
    if(this.phase==='aim'&&!this.attacking&&this.elapsed>=2.4)this.launch();
    if(this.phase==='flight'){
      const duration=1.12-this.shot.power*.33;
      if(this.mode==='training')this.keeper={x:5,y:1};
      else if(this.dive){const p=clamp((this.elapsed-Math.max(0,this.dive.at))/.48,0,1),ease=1-(1-p)**3;this.keeper={x:this.dive.x*ease,y:1+(this.dive.y-1)*ease}}
      if(this.elapsed>=duration)this.resolve();
    }
  }
  get flightProgress(){return this.phase==='flight'?clamp(this.elapsed/(1.12-this.shot.power*.33),0,1):this.phase==='verdict'||this.phase==='finished'?1:0}
  get cueVisible(){return !this.attacking&&(this.phase==='aim'&&this.elapsed>1.05||this.phase==='flight'&&this.elapsed<.25)}
  private resolve(){
    const inside=inGoal(this.shot),saved=this.mode!=='training'&&inside&&catches(this.shot,this.keeper,.76+this.level*.015);
    if(this.mode==='training'){
      const hit=inside&&Math.hypot(this.shot.x-this.target.x,this.shot.y-this.target.y)<.7;
      if(inside)this.goals++;if(hit)this.hits++;
      this.message=hit?'TARGET HIT':inside?'GOAL · FIND THE TARGET':'OFF TARGET';this.lastOutcome=hit?'target':inside?'goal':'miss';
    }else if(this.attacking){if(inside&&!saved)this.goals++;this.message=!inside?'OFF TARGET':saved?'KEEPER SAVES':'GOAL!';this.lastOutcome=!inside?'miss':saved?'save':'goal';}
    else{if(saved)this.saves++;if(inside&&!saved)this.opponent++;this.message=!inside?'THEY MISS':saved?'WHAT A SAVE!':'THEY SCORE';this.lastOutcome=saved?'save':inside?'conceded':'miss';}
    this.phase='verdict';this.elapsed=0;this.notify();
  }
  advance(){
    if(this.phase!=='verdict')return;
    this.turn++;
    if(this.turn>=(this.mode==='training'?5:10)){this.phase='finished';this.message=this.mode==='training'?`${this.hits} / 5 TARGETS`:this.goals===this.opponent?'MATCH DRAWN':this.won?'MATCH WON':'MATCH LOST';this.notify()}
    else this.nextAim();
  }
}
