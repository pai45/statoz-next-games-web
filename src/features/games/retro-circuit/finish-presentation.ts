import {displayFor} from './fidelity';
import {CAMERA_TRAIL,projectedCar,roadProjection,type ProjectionCalibration} from './projection';
import type {RaceSnapshot,TrackDefinition} from './types';

/** Inferred from held upper-player finish frames; not recovered console values.
 * The mobile sequence ends sooner than the source waits for classification. */
const framing={vegas:{x:240,y:45},harbour:{x:225,y:-60},night:{x:240,y:16}} as const;
const measured={"vegas":{"edges":[[80,186,319],[120,122,410]],"ground":[[0,163.29],[0.1,113.71],[0.2,86.23],[0.3,68.44],[0.4,59.82],[0.5,51.74]],"top":[240,45]},"harbour":{"edges":[[120,25,329]],"ground":[[0,163.29],[0.1,115.33],[0.2,49.04]],"top":[225,-60]},"night":{"edges":[[80,144,305],[120,69,358]],"ground":[[0,163.29],[0.1,108.32],[0.2,76.53],[0.3,56.05],[0.4,41.5],[0.5,31.8]],"top":[240,16]}};
const sample=(rows:readonly (readonly number[])[],t:number,column:number)=>{let i=1;while(i<rows.length-1&&t>rows[i][0])i++;const a=rows[i-1],b=rows[i];return a[column]+(b[column]-a[column])*(t-a[0])/(b[0]-a[0]);};
const retreat:readonly (readonly [number,number])[]=[
  [0,1],[.1,.67],[.2,.48],[.3,.35],[.4,.24],[.5,.16],[.75,.06],[1,0],
];
export function finishScale(time:number){
  const t=Math.max(0,time);for(let i=1;i<retreat.length;i++){
    const [end,b]=retreat[i],[start,a]=retreat[i-1];
    if(t<=end)return a+(b-a)*(t-start)/(end-start);
  }return 0;
}

/** Stateless successful departure. Road geometry/stripe phase are held, while
 * the billboard retreats along that plane. Rendering cannot change race state.
 * DNF, ordinary racing and the original arcade profile keep their own views. */
export function finishPresentation(state:RaceSnapshot,track:TrackDefinition,calibration:Partial<ProjectionCalibration>={}){
  if(state.phase!=='finished'||track.profile!=='reference')return null;
  const base=roadProjection(state,track,calibration);
  const start=projectedCar(CAMERA_TRAIL,state.player.x,base)!;
  const vanishing=framing[track.id as keyof typeof framing];
  if(!vanishing)return null;
  const center=start.x-state.player.x*(calibration.roadWidth??370)*start.scale;
  const profile=measured[track.id as keyof typeof measured];
  let nearClip=Infinity;
  const points=base.map(p=>{
    const ratio=p.scale/start.scale;
    const point={...p,x:vanishing.x+(center-vanishing.x)*ratio,
      y:vanishing.y+(start.y-vanishing.y)*ratio,nearClip,curve:0,pit:false};
    // Measured inner asphalt edges include the source's course-specific lean.
    // Extrapolation outside the two observable rows remains an inference.
    const edges=[[profile.top[1],profile.top[0],profile.top[0]],...profile.edges]; const left=sample(edges,point.y,1),right=sample(edges,point.y,2);
    point.x=(left+right)/2;point.half=Math.max(0,(right-left)/2);
    nearClip=Math.min(nearClip,point.y);return point;
  });
  // The finite road samples end before the inferred vanishing point. Complete
  // that same plane rather than leaving a clipped strip of ground at its end.
  // This cap is presentation only; it adds no track distance or checkpoint.
  const far=points[points.length-1];
  points.push({...far,x:vanishing.x,y:vanishing.y,half:0,scale:0,
    distance:far.distance+24,nearClip:Math.min(nearClip,far.y)});
  const ratio=finishScale(state.sequenceTime);
  const x=vanishing.x+(start.x-vanishing.x)*ratio;
  const ground=profile.ground;
  const last=ground[ground.length-1];
  const contact=state.sequenceTime<=last[0]?sample(ground,Math.max(0,state.sequenceTime),1):last[1]+(vanishing.y-last[1])*Math.min(1,(state.sequenceTime-last[0])/(1-last[0]));
  // Preserve crossing contact while separating ground trajectory from body scale.
  const y=contact+(start.y-ground[0][1])*ratio;
  const scale=start.scale*ratio;
  return {points,ratio,vanishing,distant:ratio<=.24,
    // Once the silhouette is too small or above the held crest, it never returns.
    ego:{x,y,scale,occlusion:displayFor(track).height,visible:ratio>.02&&y>=-1},
    distance:ratio>0?125/scale-125:1e6};
}
