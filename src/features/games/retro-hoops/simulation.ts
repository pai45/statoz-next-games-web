import {matchOptions,type MatchOptions} from "./reference-profile";
import {REFERENCE_TUNING as T} from "./reference-tuning";
import {planOffBall,offBallSteering,type OffBallIntent} from "./off-ball";
import {dribbleSample,bodyBob} from "./motion";
/** Retro Hoops rules 2.1.0 (V26: dribble in front of the body, steal reach retuned). Documented format with separately labelled authored tuning.
 * No rendering, wall clock, platform storage or random global state belongs here. */
export const RULES_VERSION = "2.1.0";
/** V26 authored tuning: steal reach against a dribbled (in-front) ball, measured to keep steal success unchanged. */
export const STEAL_REACH_DRIBBLE = 16;
export const HZ = 60;
export const COURT = { left: 60, right: 840, top: 164, bottom: 330, rimY: 247, rimZ: 120 } as const;
export type Team = 0 | 1;
export type Action = "idle" | "pass" | "receive" | "shoot" | "dunk" | "block" | "steal" | "recoil" | "gather" | "fake";
export type Phase = "playing" | "restart" | "opening" | "interval" | "result";
export type Actor = { id: number; team: Team; x: number; y: number; z: number; vz: number; face: 1 | -1; action: Action; until: number; started: number; target: number; nextAI: number; moving?:boolean; travel?:number; dribbleTick?:number; lastMoved?:number; stepDistance?:number; intent?:OffBallIntent; moveX?:number; moveY?:number; turnedAt?:number; passGrip?:{x:number;z:number}; dribbleFacing?:number };
export type Ball = { x: number; y: number; z: number; owner: number | null; kind: "held" | "pass" | "shot" | "loose"; from: number; to: number; age: number; duration: number; sx: number; sy: number; sz: number; tx: number; ty: number; tz: number; vx: number; vy: number; vz: number; points: number; made: boolean; super: boolean; released: number };
export type GameEvent = { id: number; tick: number; type: string; team?: Team; actor?: number; value?: number };
export type Input = { x: number; y: number; shoot: boolean; pass: boolean };
export const NO_INPUT: Input = { x: 0, y: 0, shoot: false, pass: false };
export type TeamStats={shots:number;made:number;dunks:number;dunkAttempts:number;threes:number;threeAttempts:number;rebounds:number;blocks:number;turnovers:number};
const blankStats=():TeamStats=>({shots:0,made:0,dunks:0,dunkAttempts:0,threes:0,threeAttempts:0,rebounds:0,blocks:0,turnovers:0});
export type Match = { version: string; stats:[TeamStats,TeamStats]; config:ReturnType<typeof matchOptions>; period:number; transitionAt:number; seed: number; rng: number; tick: number; remaining: number; shotClock: number; phase: Phase; restartAt: number; restartTeam: Team; selected: number; possession: Team; score: [number, number]; charge: [number, number]; actors: Actor[]; ball: Ball; events: GameEvent[]; eventId: number; shotId: number; camera: number; buzzer: boolean; auto: boolean; lastScore?:{tick:number;team:Team;value:number}; buffer:{kind:"shoot"|"pass";expires:number;actor:number}|null };
export const other = (t: Team): Team => t === 0 ? 1 : 0;
export const direction = (t: Team) => t === 0 ? 1 : -1;
export const rimX = (t: Team) => t === 0 ? 815 : 85;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const distance = (a: {x:number;y:number}, b: {x:number;y:number}) => Math.hypot(a.x-b.x, a.y-b.y);
function random(s: Match) { s.rng = (Math.imul(s.rng, 1664525) + 1013904223) >>> 0; return s.rng / 4294967296; }
function emit(s: Match, type: string, actor?: number, team?: Team, value?: number) {
  if(team!==undefined){const stats=s.stats[team];
    if(type==="shoot"||type==="super"){stats.shots++;if(s.ball.points===3)stats.threeAttempts++;}
    if(type==="prepare-dunk")stats.dunkAttempts++;
    if(type==="score"){stats.made++;if(value===3)stats.threes++;}
    if(type==="dunk"||type==="super-dunk"){stats.dunks++;stats.shots++;}
    if(type==="block")stats.blocks++;
    if(type==="rebound")stats.rebounds++;
    if(type==="steal"||type==="intercept")s.stats[other(team)].turnovers++;
  }
 s.events.push({ id: ++s.eventId, tick: s.tick, type, actor, team, value });if(type==="score"&&team!==undefined)s.lastScore={tick:s.tick,team,value:value??2}; }
export function anchor(a: Actor, pose: "low" | "front" | "release" | "overhead" | "pass-gather" | "pass-release" = "front") {
  const p = pose === "low" ? [-14,36] : pose === "release" ? [27,104] : pose === "overhead" ? [5,104] : pose === "pass-gather" ? [-26,61] : pose === "pass-release" ? [-32,72] : [0,39];
  return { x: a.x + p[0] * a.face, y: a.y, z: a.z + p[1] };
}
export function createMatch(seed = 1, auto = false, options:MatchOptions={}): Match {
  const config=matchOptions(options);
  const actors = Array.from({ length: 6 }, (_, id): Actor => ({ id, team: id < 3 ? 0 : 1, x: id < 3 ? 230 + id*65 : 565+(id-3)*65, y: [245,185,310][id%3], z:0, vz:0, face:id<3?1:-1, action:"idle", until:0, started:0, target:-1, nextAI:0 }));
  const p = anchor(actors[0]);
  return { version:RULES_VERSION,stats:[blankStats(),blankStats()], config,period:1,transitionAt:config.opening?90:0,seed, rng:seed>>>0, tick:0, remaining:config.gameSeconds*HZ, shotClock:(config.possessionLimitSeconds??24)*HZ, phase:config.opening?"opening":"playing", restartAt:0, restartTeam:0, selected:0, possession:0, score:[0,0], charge:[0,0], actors, ball:{...p, owner:0,kind:"held",from:0,to:-1,age:0,duration:0,sx:0,sy:0,sz:0,tx:0,ty:0,tz:0,vx:0,vy:0,vz:0,points:2,made:false,super:false,released:0}, events:[],eventId:0,shotId:0,camera:0,buzzer:false,auto,buffer:null };
}
function act(s:Match,a:Actor,action:Action,duration:number,target=-1) { a.action=action;a.started=s.tick;a.until=s.tick+duration;a.target=target; }
function ready(s:Match,a:Actor) { return a.action==="idle" && a.until<=s.tick && a.z===0; }
function canCatchPass(s:Match,a:Actor) {return ready(s,a)||(a.id===s.ball.to&&a.action==="receive"&&a.target===s.ball.from&&a.z===0);}
function selectDefender(s:Match) {
  if(s.ball.owner!==null && s.actors[s.ball.owner].team===0) { s.selected=s.ball.owner;return; }
  const candidates=s.actors.filter(a=>a.team===0).sort((a,b)=>distance(a,s.ball)-distance(b,s.ball)||a.id-b.id),best=candidates[0],current=s.actors[s.selected];
  // Small hysteresis prevents repeated switches between almost equidistant athletes.
  if(!current||current.team!==0||distance(current,s.ball)>distance(best,s.ball)+10)s.selected=best.id;
}
function own(s:Match,a:Actor,kind="catch") {
  const changed=s.possession!==a.team;
  const recoverUntil=a.until,incoming={x:s.ball.x,y:s.ball.y,z:s.ball.z};
  a.dribbleFacing=a.face;s.ball.owner=a.id;s.ball.kind="held";s.ball.to=-1;s.ball.age=0;s.ball.vz=0;s.possession=a.team;
  if(changed)s.shotClock=(s.config.possessionLimitSeconds??24)*HZ;
  if(a.team===0)s.selected=a.id;else selectDefender(s);
  const p=anchor(a,a.z>0?"overhead":"front");
  Object.assign(s.ball,{sx:incoming.x,sy:incoming.y,sz:incoming.z});
  if(kind==="inbound")Object.assign(s.ball,p,{sx:p.x,sy:p.y,sz:p.z});
  act(s,a,"receive",8);a.until=Math.max(a.until,recoverUntil);emit(s,kind,a.id,a.team);
}
function finish(s:Match) { if(s.period<s.config.periods){s.phase="interval";s.transitionAt=s.tick+120;s.buffer=null;s.ball.owner=null;emit(s,"period-end");return;} if(s.phase==="result")return;s.phase="result";s.buffer=null;emit(s,"result",undefined,undefined); }
function restart(s:Match,team:Team,reason:string) {
  if(s.buzzer){finish(s);return;}
  s.phase="restart";s.buffer=null;s.restartAt=s.tick+60;s.restartTeam=team;s.ball.owner=null;s.ball.to=-1;s.ball.kind="loose";emit(s,reason,undefined,team);
}
function resume(s:Match) {
  const t=s.restartTeam, dir=direction(t);
  for(const a of s.actors) {
    a.x=a.team===t ? (dir===1?125:775)+dir*(a.id%3)*75 : (dir===1?420:480)+dir*(a.id%3)*65;
    a.turnedAt=undefined;a.moveX=0;a.moveY=0;a.dribbleTick=-1;
    a.y=[247,185,310][a.id%3];a.z=0;a.vz=0;a.face=direction(a.team);a.action="idle";a.until=s.tick;a.target=-1;
  }
  s.phase="playing";s.shotClock=(s.config.possessionLimitSeconds??24)*HZ;own(s,s.actors[t===0?0:3],"inbound");selectDefender(s);
}
function startPass(s:Match,a:Actor) {
  const mates=s.actors.filter(b=>b.team===a.team&&b.id!==a.id&&b.z===0&&b.action==="idle");
  if(!mates.length)return false;
  const lane=(b:Actor)=>s.actors.filter(d=>d.team!==a.team).reduce((min,d)=>Math.min(min,segmentDistance(d,a,b)),999);
  mates.sort((b,c)=>(Math.min(lane(c),80)+direction(a.team)*(c.x-a.x)*.6)-(Math.min(lane(b),80)+direction(a.team)*(b.x-a.x)*.6)||b.id-c.id);
  a.passGrip={x:s.ball.x-a.x,z:s.ball.z-a.z};
  act(s,a,"pass",T.passReleaseTicks,mates[0].id);a.face=mates[0].x<a.x?1:-1;emit(s,"prepare-pass",a.id,a.team);return true;
}
function segmentDistance(p:{x:number;y:number},a:{x:number;y:number},b:{x:number;y:number}) {
  const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
}
function releasePass(s:Match,a:Actor) {
  if(s.ball.owner!==a.id)return;
  const b=s.actors[a.target];
  if(!b||!ready(s,b)){act(s,a,"idle",0);emit(s,"pass-cancelled",a.id,a.team);return;}
  const p=anchor(a,"pass-release"),q=anchor(b,"front");
  Object.assign(s.ball,p,{owner:null,kind:"pass",from:a.id,to:b.id,age:0,duration:Math.max(T.passMinFlightTicks,Math.ceil(distance(a,b)/T.passWorldUnitsPerTick)),sx:p.x,sy:p.y,sz:p.z,tx:q.x,ty:q.y,tz:q.z});
  act(s,b,"receive",s.ball.duration+8,a.id);emit(s,"pass",a.id,a.team);a.until=s.tick+T.passRecoveryTicks;
}
export const THREE_POINT_ARC={xRadius:255,yRadius:100} as const;
export function pointsFor(a:Pick<Actor,"team"|"x"|"y">){const dx=(a.x-(a.team===0?COURT.right:COURT.left))/THREE_POINT_ARC.xRadius,dy=(a.y-COURT.rimY)/THREE_POINT_ARC.yRadius;return dx*dx+dy*dy>1?3:2;}
export function shotChance(a:Actor,actors:Actor[]){
  const dist=Math.hypot(rimX(a.team)-a.x,(COURT.rimY-a.y)*1.5);
  const contest=actors.filter(d=>d.team!==a.team&&direction(a.team)*(d.x-a.x)>-16&&(d.action==="idle"||d.action==="block")).reduce((sum,d)=>sum+Math.max(0,1-distance(d,a)/85)*(d.action==="block"?1.35:.8),0);
  return clamp(.83-dist/750-contest*.22,.15,.88);
}
function startShot(s:Match,a:Actor) {
  if(Math.hypot(rimX(a.team)-a.x,COURT.rimY-a.y)<60){act(s,a,"dunk",75);a.face=direction(a.team);emit(s,"prepare-dunk",a.id,a.team);return;}
  a.face=direction(a.team);act(s,a,"shoot",44);emit(s,"prepare-shot",a.id,a.team);
}
function releaseShot(s:Match,a:Actor) {
  if(s.ball.owner!==a.id)return;
  const special=s.charge[a.team]>=100;
  const made=special||random(s)<shotChance(a,s.actors);
  if(special)s.charge[a.team]=0;
  const p=anchor(a,"release");
  Object.assign(s.ball,p,{owner:null,kind:"shot",from:a.id,to:-1,age:0,duration:54,sx:p.x,sy:p.y,sz:p.z,tx:rimX(a.team),ty:COURT.rimY,tz:COURT.rimZ,points:pointsFor(a),made,super:special,released:s.tick});
  a.until=Math.max(a.until,s.tick+12);s.shotId++;emit(s,special?"super":"shoot",a.id,a.team);
}
function defensiveAction(s:Match,a:Actor,block:boolean) {
  act(s,a,block?"block":"steal",block?48:30);
  if(block){a.vz=200;a.z=.01;emit(s,"jump",a.id,a.team);}
  else {
    emit(s,"reach",a.id,a.team);
    // Resolve all reaches after movement, body contacts and held-ball anchoring.
    // Comparing here would mix this actor's new position with earlier actors'
    // positions and the previous tick's ball centre.
  }
}
function resolveSteals(s:Match) {
  const owner=s.ball.owner===null?null:s.actors[s.ball.owner];
  if(!owner||!ready(s,owner))return;
  const candidates=s.actors.filter(a=>a.action==="steal"&&a.started===s.tick&&a.team!==owner.team&&distance(a,owner)<38)
    .map(a=>({a,gap:Math.hypot(a.x+8*a.face-s.ball.x,a.y-s.ball.y,38+a.z-s.ball.z)}))
    .filter(c=>c.gap<((owner.dribbleTick??-1)>=0?STEAL_REACH_DRIBBLE:26)) // V26: dribble now bounces in front of the body; its reach is retuned so steal success is unchanged, carry reach unchanged.sort((a,b)=>a.gap-b.gap||a.a.id-b.a.id);
  if(!candidates.length)return;
  const a=candidates[0].a;
  Object.assign(s.ball,{owner:null,kind:"loose",to:-1,vx:direction(a.team)*90,vy:0,vz:130,from:a.id});
  act(s,owner,"recoil",24);emit(s,"steal",a.id,a.team);
}
function move(a:Actor,x:number,y:number,speed=108) {
  const len=Math.hypot(x,y);if(!len)return;
  const beforeX=a.x,beforeY=a.y;
  a.x=clamp(a.x+x/Math.max(1,len)*speed/HZ,COURT.left,COURT.right);
  a.y=clamp(a.y+y/Math.max(1,len)*speed/HZ,COURT.top,COURT.bottom);if(Math.abs(x)>.1)a.face=x>0?1:-1;
  a.moveX=a.x-beforeX;a.moveY=a.y-beforeY;
  const travelled=Math.hypot(a.moveX,a.moveY);a.moving=travelled>1e-6;a.travel=(a.travel??a.id*7)+travelled;a.stepDistance=(a.stepDistance??0)+travelled;
}
function ai(s:Match,a:Actor,plans:Record<number,OffBallIntent>,neighbors:Actor[]) {
  if(!ready(s,a))return;
  const b=s.ball,dir=direction(a.team),rim=rimX(a.team);
  if(b.owner===a.id) {
    a.face=dir;
    const dist=Math.hypot(a.x-rim,(a.y-COURT.rimY)*1.5);
    if(s.tick>=a.nextAI) {
      a.nextAI=s.tick+35+Math.floor(random(s)*35);
      if(s.shotClock<180) {startShot(s,a);return;}
      const marked=s.actors.some(d=>d.team!==a.team&&distance(d,a)<60);
      const forward=s.actors.some(b=>b.team===a.team&&b.id!==a.id&&dir*(b.x-a.x)>30&&ready(s,b));
      if(marked&&forward&&s.actors.some(b=>b.team===a.team&&b.id!==a.id&&ready(s,b)&&s.actors.filter(d=>d.team!==a.team).every(d=>segmentDistance(d,a,b)>28))&&random(s)<.65){startPass(s,a);return;}
      if(dist<310){startShot(s,a);return;}
    }
    const threatened=s.actors.some(d=>d.team!==a.team&&distance(d,a)<65);
    move(a,rim-a.x,(threatened?(a.id%2===0?180:310):COURT.rimY)-a.y);return;
  }
  const intent=plans[a.id];
  if(!intent)return;
  if(b.kind==="pass"&&b.to===a.id)return;
  const steering=offBallSteering(a,intent,neighbors);
  move(a,steering.x,steering.y,steering.speed);
  const owner=b.owner===null?null:s.actors[b.owner];
  if(owner&&owner.team!==a.team){
    if(distance(a,owner)<35&&s.tick>=a.nextAI){
      const age=s.tick-owner.started;
      defensiveAction(s,a,(owner.action==="shoot"&&age>=10&&age<30)||(owner.action==="dunk"&&owner.z>0));a.nextAI=s.tick+90;
    }
  }else if(b.owner===null&&b.kind!=="pass"){
    const defendShot=b.kind!=="shot"||s.actors[b.from].team!==a.team;
    if(defendShot&&b.z>70&&b.z<145&&distance(a,b)<36&&s.tick>=a.nextAI){defensiveAction(s,a,true);a.nextAI=s.tick+65;}
  }
}
function updateBall(s:Match,previousHands:{x:number;y:number;z:number}[]) {
  const b=s.ball;
  if(b.owner!==null) {
    const a=s.actors[b.owner],dribble=a.action==="idle"&&(!!a.moving||((a.dribbleTick??-1)>=0&&(a.dribbleTick??0)%18!==0));
    const p=anchor(a,a.z>0?"overhead":dribble?"low":"front");
    if(a.action==="shoot"){
      const age=s.tick-a.started;
      const release=clamp((age-18)/4,0,1);p.x=a.x+(age<10?18:10+17*release)*a.face;p.z=a.z+(age<10?62:95+9*release);
    }
    if(a.action==="fake"){
      const t=clamp((s.tick-a.started)/24,0,1),grip=a.passGrip??{x:0,z:39};p.x=a.x+grip.x*(1-t);p.z=a.z+grip.z+(39-grip.z)*t;
    }
    if(a.action==="dunk"){
      const age=s.tick-a.started;p.x=a.x+(age<15?45:28)*a.face;p.z=a.z+(age<15?27:69);
    }
    if(a.action==="pass"){const t=clamp((s.tick-a.started-T.passGatherTicks)/(T.passReleaseTicks-T.passGatherTicks),0,1),g=anchor(a,"pass-gather"),r=anchor(a,"pass-release");Object.assign(p,{x:g.x+(r.x-g.x)*t,y:a.y,z:g.z+(r.z-g.z)*t});if(a.passGrip&&s.tick-a.started<6){const blend=(s.tick-a.started)/6;p.x=a.x+a.passGrip.x+(p.x-a.x-a.passGrip.x)*blend;p.z=a.z+a.passGrip.z+(p.z-a.z-a.passGrip.z)*blend;}}
    // Ball travels from hand to ground and back; original body/arm overlays share the dribble contact clock.
    if(dribble){a.dribbleTick=(a.dribbleTick??-1)+1;const cycle=dribbleSample(a.dribbleTick);const side=a.dribbleFacing??a.face;a.dribbleFacing=side+clamp(a.face-side,-.5,.5);p.x=a.x+cycle.x*a.dribbleFacing;p.z=a.z+cycle.z-bodyBob(a.moving?(a.travel??0):0)*Math.max(0,Math.min(1,(cycle.z-20)/16));}else {a.dribbleTick=-1;a.dribbleFacing=a.face;}
    if(a.action==="receive"&&b.age<6){b.age++;const t=b.age/6;p.x=b.sx+(p.x-b.sx)*t;p.y=b.sy+(p.y-b.sy)*t;p.z=b.sz+(p.z-b.sz)*t;}
    Object.assign(b,p);if(dribble&&dribbleSample(a.dribbleTick??0).contact)emit(s,"dribble",a.id,a.team);
    if(a.action==="dunk"&&a.z>0){
      const opponents=s.actors.filter(d=>d.team!==a.team&&d.action==="block"&&d.z>0).map(d=>({d,gap:Math.hypot(anchor(d,"overhead").x-b.x,d.y-b.y,anchor(d,"overhead").z-b.z)})).filter(v=>v.gap<10).sort((l,r)=>l.gap-r.gap||l.d.id-r.d.id);
      if(opponents.length){own(s,opponents[0].d,"block");return;}
      if(s.tick-a.started>=15&&Math.hypot(b.x-rimX(a.team),b.y-COURT.rimY,b.z-COURT.rimZ)<10){
        const special=s.charge[a.team]>=100;if(special)s.charge[a.team]=0;
        s.score[a.team]+=2;s.charge[a.team]=Math.min(100,s.charge[a.team]+25);s.shotId++;
        b.super=special;b.points=2;b.from=a.id;b.released=s.tick;b.made=true;
        emit(s,special?"super-dunk":"dunk",a.id,a.team);emit(s,"score",a.id,a.team,2);restart(s,other(a.team),"score-restart");
      }
    }
    return;
  }
  if(b.kind==="pass"||b.kind==="shot") {
    const px=b.x,py=b.y,pz=b.z; b.age++;const t=Math.min(1,b.age/b.duration);
    b.x=b.sx+(b.tx-b.sx)*t;b.y=b.sy+(b.ty-b.sy)*t;
    b.z=b.sz+(b.tz-b.sz)*t+Math.sin(t*Math.PI)*(b.kind==="shot"?105:16);
    const throwing=s.actors[b.from];
    const contacts:{actor:Actor;t:number}[]=[];
    for(const a of s.actors) {
      if(a.id===b.from||a.action==="recoil")continue;
      if(b.kind==="shot"&&a.team===throwing.team)continue;
      if(b.kind==="pass"&&a.team===throwing.team&&a.id!==b.to)continue;
      if(b.kind==="pass"&&!canCatchPass(s,a))continue;
      const hand=anchor(a,a.z>0?"overhead":"front");
      // Swept 3D contact prevents flight tunnelling. A shot can only be blocked by a jump.
      const before=previousHands[a.id];
      const dx=b.x-px-(hand.x-before.x),dy=b.y-py-(hand.y-before.y),dz=b.z-pz-(hand.z-before.z);
      const fx=px-before.x,fy=py-before.y,fz=pz-before.z;
      const qa=dx*dx+dy*dy+dz*dz,qb=2*(fx*dx+fy*dy+fz*dz),qc=fx*fx+fy*fy+fz*fz-100,disc=qb*qb-4*qa*qc;
      const t=qc<=0?0:qa>0&&disc>=0?(-qb-Math.sqrt(disc))/(2*qa):Infinity;
      if(t>=0&&t<=1&&(b.kind==="pass"||(a.action==="block"&&a.z>0))) {
        if(b.kind==="shot"&&b.age>=b.duration&&t>=1)continue;
        contacts.push({actor:a,t});
      }
    }
    if(contacts.length){contacts.sort((a,c)=>a.t-c.t||a.actor.id-c.actor.id);const hit=contacts[0];b.x=px+(b.x-px)*hit.t;b.y=py+(b.y-py)*hit.t;b.z=pz+(b.z-pz)*hit.t;own(s,hit.actor,b.kind==="shot"?"block":hit.actor.team===throwing.team?"catch":"intercept");return;}
    if(t===1) {
      if(b.kind==="pass") {
        const target=s.actors[b.to],p=anchor(target);
        if(canCatchPass(s,target)&&Math.hypot(p.x-b.x,p.y-b.y,p.z-b.z)<12){own(s,target);return;}
        b.kind="loose";b.to=-1;b.vz=40;b.vx=0;b.vy=0;emit(s,"loose");
      } else if(b.made) {
        const team=throwing.team;s.score[team]+=b.points;s.charge[team]=Math.min(100,s.charge[team]+25);
        emit(s,"score",throwing.id,team,b.points);restart(s,other(team),"score-restart");
      } else {
        b.kind="loose";b.to=-1;b.vx=-direction(throwing.team)*115;b.vy=(random(s)-.5)*100;b.vz=165;s.shotClock=14*HZ;emit(s,"rim");
        if(s.buzzer)finish(s);
      }
    }
    return;
  }
  const gathering=b.to>=0?s.actors[b.to]:undefined;
  if(gathering){
    const t=clamp((s.tick-gathering.started)/12,0,1),p=anchor(gathering);
    b.x=b.sx+(p.x-b.sx)*t;b.y=b.sy+(p.y-b.sy)*t;b.z=b.sz+(p.z-b.sz)*t+Math.sin(t*Math.PI)*8;
    return;
  }
  b.vz-=600/HZ;b.x+=b.vx/HZ;b.y+=b.vy/HZ;b.z+=b.vz/HZ;
  if(b.z<5.5) {b.z=5.5;const impact=Math.abs(b.vz)>60;b.vz=impact?-b.vz*.45:0;b.vx*=.85;b.vy*=.85;if(impact)emit(s,"bounce");}
  if(b.x<COURT.left-15||b.x>COURT.right+15||b.y<COURT.top-18||b.y>COURT.bottom+18){restart(s,other(s.actors[b.from].team),"out");return;}
  const nearest=s.actors.filter(a=>ready(s,a)&&distance(a,b)<24&&b.z<40).sort((a,c)=>distance(a,b)-distance(c,b)||a.id-c.id)[0];
  if(nearest) {
    if(b.to===-1){act(s,nearest,"gather",12);nearest.target=-2;b.to=nearest.id;b.sx=b.x;b.sy=b.y;b.sz=b.z;}
  }
}
/** Advance exactly one 60 Hz tick. Inputs are edge actions plus persistent movement. */
export function step(s:Match,input:Input=NO_INPUT) {
  s.events=[];if(s.phase==="result")return;s.tick++;
  for(const a of s.actors){a.moving=false;a.stepDistance=0;a.moveX=0;a.moveY=0;}
  if(s.phase==="opening"||s.phase==="interval"){
    s.buffer=null;
    if(s.phase==="opening"){
      for(const id of [0,3]){const a=s.actors[id];a.x=450+(id===0?-16:16);a.y=247;a.action="block";a.started=30;a.until=90;a.z=Math.max(0,Math.sin(Math.max(0,Math.min(1,(s.tick-30)/60))*Math.PI)*42);}
      s.camera=210;
      Object.assign(s.ball,{owner:null,kind:"loose",x:450,y:247,z:95+Math.sin(s.tick/90*Math.PI)*55,vx:0,vy:0,vz:0});
    }
    if(s.tick>=s.transitionAt){const opening=s.phase==="opening";if(!opening){s.period++;s.remaining=s.config.gameSeconds*HZ;s.buzzer=false;}s.restartTeam=opening?(s.seed%2 as Team):other(s.possession);resume(s);emit(s,opening?"tip":"period-start");}
    return;
  }
  if(s.phase==="restart"){
    for(const a of s.actors){if(a.z>0||a.vz>0){a.vz-=600/HZ;a.z=Math.max(0,a.z+a.vz/HZ);if(a.z===0){a.vz=0;a.until=Math.max(a.until,s.tick+12);emit(s,"land",a.id,a.team);}}if(a.z===0&&a.until<=s.tick)a.action="idle";}
    s.ball.vz-=600/HZ;s.ball.z=Math.max(5.5,s.ball.z+s.ball.vz/HZ);if(s.ball.z===5.5)s.ball.vz=0;
    if(s.tick>=s.restartAt)resume(s);return;
  }
  selectDefender(s);
  const selected=s.actors[s.selected];
  const fake=input.shoot&&s.ball.owner===selected.id&&((selected.action==="dunk"&&s.tick-selected.started<25)||(selected.action==="shoot"&&s.tick-selected.started<T.shotTakeoffTick));
  if(fake){selected.passGrip={x:s.ball.x-selected.x,z:s.ball.z-selected.z};act(s,selected,"fake",24);s.buffer=null;emit(s,"fake",selected.id,selected.team);}
  if(!fake&&(input.shoot||input.pass))s.buffer={kind:input.shoot?"shoot":"pass",expires:s.tick+18,actor:s.selected};
  if(s.buffer&&(s.buffer.expires<s.tick||s.buffer.actor!==s.selected))s.buffer=null;
  if(s.remaining>0){s.remaining=Math.max(0,s.remaining-T.clockTicksPerStep);if(s.config.possessionLimitSeconds!==null)s.shotClock--;}
  if(s.remaining===0&&!s.buzzer){s.buzzer=true;emit(s,"buzzer");if(s.ball.kind!=="shot"){finish(s);return;}}
  // Expiry wins over a scheduled release on this tick. A shot already in
  // flight before expiry remains eligible to finish; preparation is not release.
  if(s.config.possessionLimitSeconds!==null&&s.shotClock<=0&&s.ball.kind!=="shot"){restart(s,other(s.possession),"shot-clock");return;}
  const facingBefore=s.actors.map(a=>a.face);
  const previousHands=s.actors.map(a=>anchor(a,a.z>0?"overhead":"front"));
  for(const a of s.actors) {
    if(a.z>0||a.vz>0){a.vz-=600/HZ;a.z=Math.max(0,a.z+a.vz/HZ);if(a.z===0){a.vz=0;a.until=Math.max(a.until,s.tick+12);emit(s,"land",a.id,a.team);}}
    if(a.action==="pass"&&s.tick-a.started===T.passReleaseTicks)releasePass(s,a);
    if(a.action==="shoot"&&s.tick-a.started===T.shotTakeoffTick){a.z=.01;a.vz=T.shotJumpVelocity;emit(s,"jump",a.id,a.team);}
    if(a.action==="dunk"&&s.buffer?.actor===a.id&&s.buffer.kind==="pass"&&s.ball.owner===a.id&&a.z>0&&s.tick-a.started<25){if(startPass(s,a))s.buffer=null;}
    if(a.action==="shoot"&&s.tick-a.started===T.shotReleaseTick)releaseShot(s,a);
    if(a.action==="dunk"&&s.ball.owner===a.id){
      const age=s.tick-a.started;
      if(age===6){a.z=.01;a.vz=250;emit(s,"jump",a.id,a.team);}
      if(age>=6&&a.z>0){const tx=rimX(a.team)-28*direction(a.team),dx=tx-a.x,dy=COURT.rimY-a.y;const len=Math.hypot(dx,dy);if(len>0)move(a,dx/Math.max(1,len),dy/Math.max(1,len),Math.min(108,len*HZ));a.face=direction(a.team);}
      if(age>6&&a.z===0&&a.vz===0){act(s,a,"receive",12);}
    }
    if(a.action==="gather"&&a.until<=s.tick) {
      if(s.ball.owner===null&&s.ball.kind==="loose"&&s.ball.to===a.id&&distance(a,s.ball)<30&&s.ball.z<45){Object.assign(s.ball,anchor(a));own(s,a,"rebound");}
      else {if(s.ball.kind==="loose"&&s.ball.to===a.id)s.ball.to=-1;a.action="idle";a.target=-1;}
    } else if(a.until<=s.tick&&a.z===0){a.action="idle";a.target=-1;}
  }
  const beforeMovement=s.actors.map(a=>({x:a.x,y:a.y}));
  const freshPlans=planOffBall(s),plans=Object.fromEntries(s.actors.map(a=>[a.id,(s.tick%12===a.id*2||!a.intent||s.events.some(e=>["pass","catch","intercept","block","steal","inbound"].includes(e.type)))?freshPlans[a.id]:a.intent])),neighbors=s.actors.map(a=>({...a}));
  for(const a of s.actors)a.intent=plans[a.id];
  if(!s.buzzer)for(const a of s.actors) {
    if(a.id===s.selected&&!s.auto) {
      if(ready(s,a)) {
        const has=s.ball.owner===a.id;
        const action=s.buffer?.actor===a.id?s.buffer.kind:null;
        if(action==="shoot"){s.buffer=null;if(has)startShot(s,a);else defensiveAction(s,a,true);}
        else if(action==="pass"){s.buffer=null;if(has)startPass(s,a);else defensiveAction(s,a,false);}
        else move(a,input.x,input.y);
      }
    } else ai(s,a,plans,neighbors);
  }
  // Acting/recovering bodies remain solid. Only free grounded movers yield;
  // locked actors keep their action/contact anchors. Vertical intervals overlap
  // until their feet differ by72units; high jumps can clear the body volume.
  for(let iteration=0;iteration<4;iteration++)for(let i=0;i<6;i++)for(let j=i+1;j<6;j++) {
    const a=s.actors[i],b=s.actors[j],d=distance(a,b);
    // AI can move and begin a reach within the same tick. That new action
    // must not make its just-applied movement bypass a stationary body.
    const yieldedThisTick=(actor:Actor)=>actor.z===0&&(ready(s,actor)||distance(actor,beforeMovement[actor.id])>1e-8);
    const movableA=yieldedThisTick(a),movableB=yieldedThisTick(b),weight=Number(movableA)+Number(movableB);
    if(d<26&&Math.abs(a.z-b.z)<72&&weight>0) {
      const k=(26-d)/weight,dx=d?(a.x-b.x)/d:1,dy=d?(a.y-b.y)/d:0;
      if(movableA){a.x=clamp(a.x+dx*k,COURT.left,COURT.right);a.y=clamp(a.y+dy*k,COURT.top,COURT.bottom);}
      if(movableB){b.x=clamp(b.x-dx*k,COURT.left,COURT.right);b.y=clamp(b.y-dy*k,COURT.top,COURT.bottom);}
    }
  }
  for(const a of s.actors)if(a.action==="idle"&&a.moving){const moved=Math.hypot(a.x-beforeMovement[a.id].x,a.y-beforeMovement[a.id].y);a.travel=(a.travel??a.id*7)-(a.stepDistance??0)+moved;a.moving=moved>1e-6;if(a.moving)a.lastMoved=s.tick;}
  for(const a of s.actors)if(a.action==="idle"&&s.ball.owner!==null&&s.actors[s.ball.owner].team!==a.team&&Math.hypot(a.x-s.ball.x,a.y-s.ball.y)<180&&Math.abs(s.ball.x-a.x)>4)a.face=s.ball.x>a.x?1:-1;
  for(const a of s.actors){const mark=a.intent?.mark===undefined?undefined:s.actors[a.intent.mark];if(a.action==="idle"&&mark&&(a.intent?.role==="mark"||a.intent?.role==="pressure")&&distance(a,mark)<120&&Math.abs(mark.x-a.x)>4)a.face=mark.x>a.x?1:-1;}
  for(const a of s.actors)if(a.action==="idle"&&a.face!==facingBefore[a.id])a.turnedAt=s.tick;
  updateBall(s,previousHands);
  resolveSteals(s);
  selectDefender(s);
  if(s.buzzer&&s.ball.kind!=="shot")finish(s);
  if(s.config.possessionLimitSeconds!==null&&s.shotClock<=0&&s.ball.kind!=="shot"&&s.phase==="playing")restart(s,other(s.possession),"shot-clock");
  // Bounded ball-following camera. Presentation may interpolate, but never changes simulation.
  s.camera+= (clamp(s.ball.x-240,0,420)-s.camera)*.06;
}
