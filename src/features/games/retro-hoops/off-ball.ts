import type {Actor, Match, Team} from "./simulation";

/** Original, deterministic team decisions. Not recovered Street Hoop algorithms. */
export type OffBallRole = "outlet" | "cut" | "mark" | "pressure" | "chase" | "rebound" | "box-out" | "safety" | "receive" | "help";
export type OffBallIntent = {role:OffBallRole;x:number;y:number;mark?:number};
const gap=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
const dir=(team:Team)=>team===0?1:-1;
const goal=(role:OffBallRole,x:number,y:number,mark?:number):OffBallIntent=>({role,x:clamp(x,76,824),y:clamp(y,180,314),...(mark===undefined?{}:{mark})});
const permutations=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
function assignMarks(defenders:Actor[],attackers:Actor[],ballHandler:number|null,selected:number|null){
  let best=permutations[0],cost=Infinity;
  for(const order of permutations){
    const next=defenders.reduce((sum,a,i)=>sum+gap(a,attackers[order[i]])+(a.intent?.mark!==undefined&&a.intent.mark!==attackers[order[i]].id?22:0)+(a.id===selected&&attackers[order[i]].id!==ballHandler?10000:0),0);
    if(next<cost){cost=next;best=order;}
  }
  return defenders.map((a,i)=>({actor:a,mark:attackers[best[i]]}));
}
function laneGap(p:Actor,a:Actor,b:{x:number;y:number}){
  const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
}
/** One immutable decision snapshot per tick avoids actor-loop order dependence. */
export function planOffBall(s:Match):Record<number,OffBallIntent>{
  const plans:Record<number,OffBallIntent>={},b=s.ball;
  const owner=b.owner===null?null:s.actors.find(a=>a.id===b.owner);
  const passer=s.actors.find(a=>a.id===b.from);
  const attacking=owner?.team??(b.kind==="pass"?passer?.team:undefined);
  for(const team of [0,1] as const){
    const mates=s.actors.filter(a=>a.team===team).sort((a,b)=>a.id-b.id),opponents=s.actors.filter(a=>a.team!==team).sort((a,b)=>a.id-b.id),d=dir(team);
    if(attacking===team){
      const pivot=owner??passer!;
      const off=mates.filter(a=>a.id!==pivot.id);
      // One cutter and one trailing outlet, independent of which athlete owns the ball.
      for(let i=0;i<off.length;i++){
        const a=off[i];
        if(b.kind==="pass"&&b.to===a.id){plans[a.id]=goal("receive",b.tx,b.ty);continue;}
        const role=i===0?"cut":"outlet",baseX=Math.round(pivot.x/24)*24+d*(i===0?110:-65),baseY=i===0?188:306;
        const candidates=[0,-36,36].map(dx=>goal(role,clamp(baseX+d*dx,120,780),baseY));
        // Prefer an open passing corridor; movement cost keeps the choice stable.
        candidates.sort((p,q)=>{
          const score=(p:OffBallIntent)=>Math.min(...opponents.map(o=>laneGap(o,pivot,p)),80)*1.5+Math.min(...opponents.map(o=>gap(o,p)),100)-gap(a,p)*.15;
          return score(q)-score(p);
        });
        plans[a.id]=candidates[0];
      }
    }else if(attacking!==undefined){
      const handler=owner?.id??b.to;
      const selected=!s.auto&&team===0?s.selected:null;
      for(const {actor:a,mark} of assignMarks(mates,opponents,handler,selected)){
        const onBall=mark.id===handler,forward=dir(mark.team);
        const penetrates=owner&&Math.abs((owner.team===0?815:85)-owner.x)<135;
        const helping=!onBall&&penetrates&&Math.abs(mark.y-owner!.y)>70&&gap(a,owner!)<160;
        if(helping){plans[a.id]=goal("help",owner!.x+forward*35,owner!.y+(mark.y>owner!.y?24:-24),mark.id);continue;}
        plans[a.id]=goal(onBall?"pressure":"mark",mark.x+forward*(onBall?30:38),mark.y,mark.id);
      }
    }else{
      // Read only the visible trajectory, never the seeded made/miss outcome.
      const time=b.kind==="shot"?0:clamp((b.vz+Math.sqrt(b.vz*b.vz+1200*Math.max(0,b.z-6)))/600,0,.8);
      const landing={x:b.kind==="shot"?b.tx:b.x+b.vx*time,y:b.kind==="shot"?b.ty:b.y+b.vy*time};
      const available=mates.filter(a=>a.action==="idle"&&a.z===0).sort((a,c)=>gap(a,landing)-gap(c,landing)||a.id-c.id);
      const chaser=(b.kind==="loose"&&b.to>=0?s.actors.find(a=>a.id===b.to&&a.team===team):undefined)??available[0]??mates[0];
      const rest=mates.filter(a=>a.id!==chaser.id);
      plans[chaser.id]=goal(b.kind==="shot"?"rebound":"chase",landing.x,landing.y);
      const threat=[...opponents].sort((a,c)=>gap(a,landing)-gap(c,landing)||a.id-c.id)[0];
      plans[rest[0].id]=goal("box-out",landing.x-d*44,clamp(threat.y,206,288),threat.id);
      plans[rest[1].id]=goal("safety",landing.x-d*135,landing.y<247?292:202);
    }
  }
  return plans;
}
/** Arrive without oscillation. Separation acts only on free movement, not contacts. */
export function offBallSteering(a:Actor,intent:OffBallIntent,actors:Actor[]){
  let x=intent.x-a.x,y=intent.y-a.y;
  const length=Math.hypot(x,y);
  if(length<6)return {x:0,y:0,speed:0};
  const ux=x/length,uy=y/length;
  for(const mate of actors){
    if(mate.id===a.id||mate.team!==a.team)continue;
    const dx=a.x-mate.x,dy=a.y-mate.y,d=Math.hypot(dx,dy);
    if(d>0&&d<46&&dx*ux+dy*uy<0){x+=dx/d*(46-d)*1.4;y+=dy/d*(46-d)*1.4;}
  }
  return {x,y,speed:Math.min(intent.role==="pressure"?104:100,length*60)};
}
