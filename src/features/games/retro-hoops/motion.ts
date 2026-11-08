/** Authored motion tuning, not measured native Street Hoop timing. */
export const DRIBBLE_TICKS=18;
export function dribbleSample(tick:number){
  const phase=((tick%DRIBBLE_TICKS)+DRIBBLE_TICKS)%DRIBBLE_TICKS;
  const index=Math.floor(phase/6),t=(phase%6)/6,ease=t*t*(3-2*t),offsets=[14,22,10,14]; // V26: in front of the lead leg, as in the reference (was behind the body)
  return {frame:index,x:offsets[index]+(offsets[index+1]-offsets[index])*ease,z:6+30*Math.abs(1-phase/9),contact:phase===9};
}
export const RUN_FRAMES=12;
export const RUN_DISTANCE=56;
export function gaitFrame(distance:number){return Math.floor(Math.max(0,distance)/(RUN_DISTANCE/RUN_FRAMES))%RUN_FRAMES;}
export function bodyBob(distance:number){return Math.round(-2*Math.sin(gaitFrame(distance)/RUN_FRAMES*4*Math.PI));}
export function defenseFrame(distance:number){return Math.floor(Math.max(0,distance)/3.5)%8;}
export const LOCOMOTION_CLIPS={run:12,"dribble-body":12,defend:8,brake:4,"dribble-arm":18,backpedal:8,pivot:4,"dribble-switch":72} as const;


export function movementHeading(x:number,y:number){if(Math.hypot(x,y)<1e-6)return "still";return ["E","SE","S","SW","W","NW","N","NE"][(Math.round(Math.atan2(y,x)/(Math.PI/4))+8)%8];}
