import type { Point, World, ShotView, Pose } from './contracts';
import {GOAL_VIEW} from './close-view';
export { sweep } from './sweep';
export const DT = 1 / 60, HALF_TICKS = 90 * 60;
export const GOAL_HEIGHT=75;
/** Calibrated from recording landmarks, not recovered hardware constants. Source atlas stays intact. */
export const PITCH={x:48,y:80,scaleX:23,scaleY:4.5,length:105,width:68,centreRadius:9.15,goalTop:27.5,goalBottom:40.5} as const;
export const PITCH_EXTENT={width:PITCH.x*2+PITCH.length*PITCH.scaleX,bottom:PITCH.y+PITCH.width*PITCH.scaleY};
export const PITCH_ACTOR_SCALE=.8;
export const CONTACT={receive:6,boot:5,body:7,upper:5,punt:4} as const;
const pitchPoses=new WeakMap<Pose,Pose>();
/** Uniform nearest-neighbour pitch representation; original atlas stays intact. */
export function pitchPose(source:Pose):Pose{
    const cached=pitchPoses.get(source);if(cached)return cached;
    const width=Math.round(source.width*PITCH_ACTOR_SCALE),height=Math.round(source.height*PITCH_ACTOR_SCALE),anchors=Object.fromEntries(Object.entries(source.anchors).map(([name,[x,y]])=>[name,[Math.round((x+.5)*width/source.width-.5),Math.round((y+.5)*height/source.height-.5)] as [number,number]]));
    const result:Pose={...source,width,height,anchors};pitchPoses.set(source,result);return result;
}
export const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
export const project = (p: Point): Point => ({ x: PITCH.x + p.x * PITCH.scaleX, y: PITCH.y + p.y * PITCH.scaleY });
export const root = (p: Point): Point => { const q = project(p); return { x: Math.round(q.x), y: Math.round(q.y) }; };
export const space = (p: World): World => ({ x: p.x * PITCH.scaleX, y: p.y * PITCH.scaleY, z: p.z });
export const fromSpace = (p: World): World => ({ x: p.x / PITCH.scaleX, y: p.y / PITCH.scaleY, z: p.z });
export const length = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
// Original front-goal projection; the same live world ball is retained.
export const goalSpace = (p: World, v: ShotView): World => ({ x: GOAL_VIEW.centreX + (p.y - 34) * GOAL_VIEW.lateralScale, y: v.planeY + (v.direction === -1 ? p.x : 105 - p.x) * v.depthScale, z: p.z });
export const goalProject = (p: World, v: ShotView): Point => { const q = goalSpace(p, v); return { x: q.x, y: q.y - q.z }; };
export const fromGoalSpace = (p: World, v: ShotView): World => ({ x: v.direction === 1 ? 105 - (p.y - v.planeY) / v.depthScale : (p.y - v.planeY) / v.depthScale, y: 34 + (p.x - GOAL_VIEW.centreX) / GOAL_VIEW.lateralScale, z: p.z });
