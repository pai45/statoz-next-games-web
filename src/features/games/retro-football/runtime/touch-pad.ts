import type {Direction} from './contracts';
/** Eight-way arcade stick zones; neutral centre and hysteresis prevent thumb jitter. */
export function padDirections(x:number,y:number,previous:readonly Direction[]=[]):Direction[]{
    const magnitude=Math.hypot(x,y),dead=previous.length ? .19 : .27;
    if(magnitude<dead)return [];
    const ax=Math.abs(x),ay=Math.abs(y),ratio=Math.tan(Math.PI/8);
    const horizontal=ax>ay*ratio,vertical=ay>ax*ratio,result:Direction[]=[];
    if(horizontal)result.push(x<0?'left':'right');
    if(vertical)result.push(y<0?'up':'down');
    return result;
}
