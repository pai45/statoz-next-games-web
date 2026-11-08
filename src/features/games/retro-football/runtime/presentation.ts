/** Wider handheld presentation; world/contact geometry stays in the source-study grid. */
import {PITCH_EXTENT} from './geometry';
export const VIEW = {width:384,height:224,lookAhead:22} as const;
export function followingCamera(focus:{x:number;y:number},velocity:{x:number;y:number},previous:{x:number;y:number},width:number=VIEW.width){
    const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
    const target={x:clamp(focus.x-width/2+clamp(velocity.x*.48,-VIEW.lookAhead,VIEW.lookAhead),0,PITCH_EXTENT.width-width),y:clamp(focus.y-113+clamp(velocity.y*.16,-10,10),-26,PITCH_EXTENT.bottom+24-VIEW.height)};
    // An authored damped follow, not a measurement of native camera acceleration.
    return {x:Math.round(previous.x+(target.x-previous.x)*.22),y:Math.round(previous.y+(target.y-previous.y)*.22)};
}
