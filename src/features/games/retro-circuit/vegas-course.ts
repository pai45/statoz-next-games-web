/** Original smooth three-left course study. Source map/turn order observed;
 * control coordinates and distance mapping inferred, not recovered game data. */
type Point={x:number;y:number;s:number};
type Span={from:number;to:number;a:readonly number[];b:readonly number[];control?:readonly number[]};
const start=[.32,.95],firstIn=[.80,.95],firstOut=[.92,.76],secondIn=[.20,.12],secondOut=[.04,.23],thirdIn=[.10,.77],thirdOut=[.28,.95];
const control=(a:readonly number[],b:readonly number[],incoming:readonly number[],outgoing:readonly number[])=>{const cross=(a:readonly number[],b:readonly number[])=>a[0]*b[1]-a[1]*b[0],t=cross([b[0]-a[0],b[1]-a[1]],outgoing)/cross(incoming,outgoing);return[a[0]+t*incoming[0],a[1]+t*incoming[1]];};
const diagonal=[secondIn[0]-firstOut[0],secondIn[1]-firstOut[1]],down=[thirdIn[0]-secondOut[0],thirdIn[1]-secondOut[1]];
const spans:readonly Span[]=[
 {from:0,to:.23,a:start,b:firstIn},{from:.23,to:.37,a:firstIn,control:control(firstIn,firstOut,[1,0],diagonal),b:firstOut},
 {from:.37,to:.64,a:firstOut,b:secondIn},{from:.64,to:.79,a:secondIn,control:control(secondIn,secondOut,diagonal,down),b:secondOut},
 {from:.79,to:.90,a:secondOut,b:thirdIn},{from:.90,to:.98,a:thirdIn,control:control(thirdIn,thirdOut,down,[1,0]),b:thirdOut},{from:.98,to:1,a:thirdOut,b:start}];
export function vegasCourse(length:number){const points:Point[]=Array.from({length:901},(_,i)=>{const f=i/900,span=spans.find(s=>f>=s.from&&f<=s.to)??spans[spans.length-1],t=(f-span.from)/(span.to-span.from),c=span.control;const at=(k:number)=>c?(1-t)**2*span.a[k]+2*(1-t)*t*c[k]+t*t*span.b[k]:span.a[k]+(span.b[k]-span.a[k])*t;return{x:at(0),y:at(1),s:f*length};});
 const curves=points.slice(0,-1).map((p,i,a)=>{const prev=a[(i+895)%900],next=a[(i+5)%900],ax=p.x-prev.x,ay=p.y-prev.y,bx=next.x-p.x,by=next.y-p.y,turn=Math.atan2(ax*by-ay*bx,ax*bx+ay*by)*5,f=i/900;const envelope=Math.max(0,...[[.23,.37],[.64,.79],[.90,.98]].map(([a,b])=>f>a&&f<b?Math.sqrt(Math.sin(Math.PI*(f-a)/(b-a)))*.4:0));return Math.max(-.85,Math.min(-envelope,turn,0));});return{points,curves};}
