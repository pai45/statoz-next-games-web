import {sampleTrack,targetSpeed,vehicleFor,nearbyObstacles} from './data';import {neutralInput,type RaceInput} from './types';import type {RaceSimulation} from './simulation';
/** Review driver uses only public inputs; it never changes race state. */
export function drive(g:Pick<RaceSimulation,'cars'|'track'|'phase'|'elapsed'>):RaceInput{
 if(g.phase==='countdown')return neutralInput();
 const p=g.cars[0],ref=g.track.profile==='reference',r=sampleTrack(g.track,p.distance),v=vehicleFor(g.track,p.vehicle),pit=p.fuel<44&&r.s>Math.max(0,g.track.pit.start-(g.track.profile==='reference'?180:350))&&r.s<g.track.pit.end;
 let x=pit?1.2:-.36;
 if(!pit){const hazards=nearbyObstacles(g.track,p.distance,280).filter(o=>o.distance>0);if(hazards.some(o=>Math.abs(o.x-x)<o.radius+.23)){x=[-.70,0,.70].find(candidate=>hazards.every(o=>Math.abs(o.x-candidate)>o.radius+.22))??x;}
 if(ref){const rivals=g.cars.filter(c=>c.id!==0&&!c.inPit&&!c.dnf&&c.finishedAt===null).map(c=>({x:c.x,d:((c.distance-p.distance+g.track.length/2)%g.track.length+g.track.length)%g.track.length-g.track.length/2}));
 if(rivals.some(c=>c.d>0&&c.d<85&&Math.abs(c.x-x)<.28)){const lanes=[-.66,0,.66].map(candidate=>({candidate,gap:Math.min(130,...rivals.filter(c=>Math.abs(c.x-candidate)<.30).map(c=>Math.abs(c.d))),blocked:hazards.some(o=>Math.abs(o.x-candidate)<o.radius+.23)})).filter(l=>!l.blocked).sort((a,b)=>b.gap-a.gap);if(lanes[0]?.gap>20)x=lanes[0].candidate;}}
 }
 let wanted=pit?(r.s<g.track.pit.start||p.x<1.04?17:0):targetSpeed(g.track,p.distance,v)*.98;
 if(ref&&!pit){if(p.boost>0)wanted*=1.36;else if(p.speed>v.maxSpeed&&Math.abs(r.curve)<.45)wanted=Math.max(wanted,p.speed+.5);}
 const correction=(x-p.x)*7+r.curve*(p.speed/v.maxSpeed)**2*.95;
 return {left:correction<-.04,right:correction>.04,throttle:p.inPit?p.fuel>=93:p.speed<wanted,brake:p.inPit?p.fuel<93:p.speed>wanted+1,nitro:!pit&&p.nitro>0&&p.boost===0&&(ref?p.nitro>1&&g.elapsed>=28&&(g.elapsed-28)%15<.03:g.elapsed>15&&g.elapsed%45<.03)&&Math.abs(r.curve)<.2};
}
