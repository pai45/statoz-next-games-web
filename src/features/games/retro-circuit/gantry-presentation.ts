import{cameraDistance,projectedCar,type RoadPoint}from'./projection';
import type{RaceSnapshot,TrackDefinition}from'./types';
/** Original decorative landmark. No collision surface, checkpoint or timing rule.
 * Foot placement follows projected road width; source-derived scale is reviewed
 * separately from the art's native pixels and collision-free clear span. */
export function gantryPresentation(state:RaceSnapshot,track:TrackDefinition,points:RoadPoint[]){
 if(track.profile!=='reference'||state.phase==='finished')return null;
 // The current simulation starts at the lap line; source grids start behind it.
 // A short initial approach bridges that difference without changing progress.
 // Its timing/virtual distance are designed presentation, not source metres.
 const launch=state.player.distance<track.length*.5;
 // Coupling the bridge to actual travel keeps the arch still while stopped.
 // The distance warp is designed against one recorded launch, not source metres.
 const approach:readonly (readonly[number,number])[]=[[0,1700],[2,1650],[8,1300],[30,500],[55,-30]];
 const travel=Math.max(0,state.player.distance);let virtual=-30;
 for(let i=1;i<approach.length;i++){const a=approach[i-1],b=approach[i];if(travel<=b[0]){virtual=a[1]+(b[1]-a[1])*(travel-a[0])/(b[0]-a[0]);break;}}
 const distance=launch?virtual:cameraDistance(0,state.player.distance,track.length);
 if(distance<0||distance>1800)return null;
 const center=projectedCar(distance,0,points),left=projectedCar(distance,-1.06,points),right=projectedCar(distance,1.06,points);
 if(!center||!left||!right)return null;
 const span=right.x-left.x,unit=span/216;
 // Initial presentation only: preserve original beam pixels/proportions and
 // keep feet grounded by extending the lattice below the beam when necessary.
 const limit=28-Math.max(0,travel-30)*4;
 const beamTop=launch?Math.min(center.y-87*unit,limit):center.y-87*unit;
 const top=beamTop-7*unit,headerHeight=32*unit;
 const legsTop=top+headerHeight,legsHeight=(center.y-legsTop)*64/62;
 return{distance,launch,x:center.x,y:top+(headerHeight+legsHeight)/2,width:256*unit,height:headerHeight+legsHeight,headerY:top+headerHeight/2,headerHeight,legsY:legsTop+legsHeight/2,legsHeight,beamTop,
   clip:center.occlusion,ground:center.y,unit,left:left.x,right:right.x,
   visible:beamTop<center.occlusion&&span>2};
}
