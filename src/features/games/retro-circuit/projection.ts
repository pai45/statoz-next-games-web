import {displayFor} from './fidelity';
import { modulo, sampleTrack,courseFor,physicalSeparation,terrainHeight } from "./data";
import type { RaceSnapshot, TrackDefinition } from "./types";
export type RoadPoint={x:number;y:number;half:number;scale:number;distance:number;nearClip:number;curve:number;pit:boolean;stripe:boolean};
export const CAMERA_TRAIL=22;
export const cameraDistance=(world:number,player:number,length=5400)=>physicalSeparation(world,player,length)+CAMERA_TRAIL;
/** Designed opening-camera adaptation. Keeps staged traffic readable on the
 * inferred start terrain; travel-coupled and fully restored after140units.
 * It changes neither track height/grade nor the authoritative car positions. */
export function openingRoadBlend(state:RaceSnapshot,track:TrackDefinition){
 if(track.profile!=='reference')return 1;
 const t=Math.max(0,Math.min(1,(state.player.distance-35)/105));return t*t*(3-2*t);
}
/** Original visual elevation, periodic at the lap seam; simulation stays on track distance. */
export const roadElevation=terrainHeight;
export type ProjectionCalibration={horizonOffset:number;roadWidth:number;curveGain:number};
export function roadProjection(state: RaceSnapshot,track: TrackDefinition,calibration:Partial<ProjectionCalibration>={}): RoadPoint[]{
  const result:RoadPoint[]=[];let offset=0,heading=0,nearClip=Infinity;const display=displayFor(track),opening=openingRoadBlend(state,track);
  const egoScale=1+(125/149-1)*CAMERA_TRAIL/24;
  const roadWidth=calibration.roadWidth??370;
  const cameraShift=state.player.x*roadWidth*egoScale-(track.profile==='reference'?0:Math.max(-160,Math.min(160,state.player.x*130)));
  for(let i=0;i<=80;i++){
    const distance=i*24,world=state.player.distance-CAMERA_TRAIL+distance,road=sampleTrack(track,world),scale=125/(125+distance);
    heading+=road.curve*(calibration.curveGain??.0035);offset+=heading;
    // The local road carries the camera. Ease into distant height displacement so
    // a steep crest cannot fold the camera-to-player strip over the player.
    // This is a presentation calibration, not a change to physical terrain.
    const near=Math.max(0,Math.min(1,(distance-CAMERA_TRAIL)/64)),follow=near*near*(3-2*near);
    const far=Math.max(0,Math.min(1,(distance-300)/240)),distant=1-far*far*(3-2*far);
    const elevation=(roadElevation(track,world)-roadElevation(track,state.player.distance))*(track.profile==='reference'?(track.id==='vegas'?16:['harbour','night'].includes(track.id)?8:3.2)*follow*distant*opening:3.2);
    result.push({nearClip,x:240+offset*330*scale-cameraShift-roadSteeringYaw(state,distance),y:display.horizon+(calibration.horizonOffset??0)+(display.roadHeight-elevation)*scale,half:roadWidth*scale,scale,distance,curve:road.curve,pit:road.s>=track.pit.start&&road.s<=track.pit.end,stripe:Math.floor(world/display.stripe)%2===0});
    nearClip=Math.min(nearClip,result[result.length-1].y);
  }return result;
}
export function projectedCar(distance:number,x:number,points:RoadPoint[]){
  const i=Math.floor(distance/24);if(i<0||i>=points.length-1)return null;
  const t=distance/24-i,a=points[i],b=points[i+1];
  const center=a.x+(b.x-a.x)*t,scale=a.scale+(b.scale-a.scale)*t;
  const y=a.y+(b.y-a.y)*t,occlusion=Math.min(a.nearClip,a.y);
  return {x:center+x*(a.half+(b.half-a.half)*t),y,scale,occlusion,visible:y<=occlusion+3};
}
/** Compact distance diagram, derived from the canonical sectors. Non-metric: the
 * positive radial envelope keeps the closed course legible without false crossings.
 * Car markers and pit position still use the same ordered track distance as racing.
 */
export function mapPoints(track:TrackDefinition){const courseSamples=courseFor(track).points,minX=Math.min(...courseSamples.map(p=>p.x)),minY=Math.min(...courseSamples.map(p=>p.y)),w=Math.max(...courseSamples.map(p=>p.x))-minX,h=Math.max(...courseSamples.map(p=>p.y))-minY;return courseSamples.map(p=>({x:8+(p.x-minX)/w*84,y:8+(p.y-minY)/h*52}));}

export const localDistance=(world:number,track:TrackDefinition)=>modulo(world,track.length);

/** Designed camera yaw: pivot behind the ego anchor, with speed-dependent far-road sweep.
 * Every world object uses these same points; simulation and contact coordinates stay continuous. */
export function roadSteeringYaw(state:RaceSnapshot,distance:number){
 const speed=Math.max(0,Math.min(1,state.player.speed/35));
 const depth=Math.max(0,distance-24);
 return state.phase==='finished'||state.phase==='dnf'?0:state.player.steering*speed*68*depth/(depth+180);
}
