import {drawHoopsCrowd} from "./crowd";
import {THREE_POINT_ARC,COURT} from "./simulation";
import {courtPoint,BASKET_ART} from "./view";
/** Original reconstruction of the reference street venue: dark asphalt, white markings,
 * fence-side crowd and pole-mounted baskets. All scenery is code-drawn; proportions are
 * authored adaptations fitted to the unchanged legal court. */
export function drawParkCourt(c:CanvasRenderingContext2D,frame=0){
  c.imageSmoothingEnabled=false;
  const rect=(x:number,y:number,w:number,h:number,color:string)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);};
  rect(0,0,900,360,"#3e4043");drawHoopsCrowd(c,frame);
  // Asphalt with scuffs and grain.
  rect(0,164,900,196,"#404245");
  for(let i=0;i<9000;i++){const x=(Math.imul(i+13,15485863)>>>0)%900,y=165+(Math.imul(i+41,32452843)>>>0)%195;rect(x,y,i%11===0?2:1,1,i%3?"#4a4c4f":"#36383b");}
  for(let i=0;i<40;i++){const x=(Math.imul(i+7,2654435761)>>>0)%880,y=170+(Math.imul(i+3,40503)>>>0)%180;c.globalAlpha=.18;rect(x,y,10+i%14,2,"#5c5e60");c.globalAlpha=1;}
  // Steel scaffold towers behind each baseline hold the backboards (reference venue construction).
  const tube=(x0:number,y0:number,x1:number,y1:number,w=4)=>{c.lineCap="square";c.strokeStyle="#4e524c";c.lineWidth=w+2;c.beginPath();c.moveTo(x0,y0);c.lineTo(x1,y1);c.stroke();c.strokeStyle="#a9aca4";c.lineWidth=w;c.stroke();c.strokeStyle="#dcded6";c.lineWidth=1;c.beginPath();c.moveTo(x0-1,y0);c.lineTo(x1-1,y1);c.stroke();};
  for(const [x,key,side] of [[85,"left",-1],[815,"right",1]] as const){
    const p=courtPoint(x,COURT.rimY),art=BASKET_ART[key],board=side<0?p.x-(art.rimX-9)*p.scale:p.x+4*p.scale,armY=p.y-(COURT.rimZ+art.rimY-20)*p.scale;
    // Two depth planes of the tower, each with an inner and outer upright, projected like the court.
    const planes=[COURT.rimY-20,COURT.rimY+14].map(y=>{const g=courtPoint(side<0?48:852,y),h=courtPoint(side<0?26:874,y),top=g.y-(COURT.rimZ+16)*g.scale;return{inner:g,outer:h,top};});
    for(const pl of planes){tube(pl.inner.x,pl.inner.y,pl.inner.x,pl.top);tube(pl.outer.x,pl.outer.y,pl.outer.x,pl.top);
      for(let k=0;k<3;k++){const f=k/2,yi=pl.inner.y+(pl.top-pl.inner.y)*f,yo=pl.outer.y+(pl.top-pl.outer.y)*f;tube(pl.inner.x,yi,pl.outer.x,yo,2);if(k<2){const f2=(k+1)/2;tube(pl.inner.x,yi,pl.outer.x,pl.outer.y+(pl.top-pl.outer.y)*f2,2);}}}
    tube(planes[0].inner.x,planes[0].top,planes[1].inner.x,planes[1].top,2);tube(planes[0].outer.x,planes[0].top,planes[1].outer.x,planes[1].top,2);
    const mid=(planes[0].inner.x+planes[1].inner.x)/2;tube(mid,armY,board,armY,3);tube(mid,armY+10*p.scale,board,armY+10*p.scale,2);
    for(const pl of planes){c.globalAlpha=.4;c.fillStyle="#000";c.beginPath();c.ellipse((pl.inner.x+pl.outer.x)/2,pl.inner.y+1,Math.abs(pl.outer.x-pl.inner.x)/2+5,3,0,0,Math.PI*2);c.fill();c.globalAlpha=1;}
    // Spare balls and a duffel bag at the foot of the tower.
    for(let k=0;k<4;k++){const b=courtPoint((side<0?40:860)+side*-k*8,COURT.rimY+44+(k%2)*6),r=5*b.scale;c.fillStyle="#3a1a0e";c.beginPath();c.arc(b.x,b.y-r,r+1,0,Math.PI*2);c.fill();c.fillStyle="#b4561e";c.beginPath();c.arc(b.x,b.y-r,r,0,Math.PI*2);c.fill();c.fillStyle="#e08a3a";c.beginPath();c.arc(b.x-r*.35,b.y-r*1.35,r*.45,0,Math.PI*2);c.fill();c.strokeStyle="#3a1a0e";c.lineWidth=1;c.beginPath();c.moveTo(b.x-r,b.y-r);c.lineTo(b.x+r,b.y-r);c.stroke();}
    // Duffel bag on the floor by the crowd: rounded body, lighter top edge and a carry strap.
    const bag=courtPoint(side<0?36:864,COURT.top+6);c.fillStyle="#0d0e10";c.beginPath();c.ellipse(bag.x,bag.y-5,13,6,0,0,Math.PI*2);c.fill();c.fillStyle="#24262c";c.beginPath();c.ellipse(bag.x,bag.y-6,12,5,0,Math.PI,Math.PI*2);c.fill();c.strokeStyle="#3a3d44";c.lineWidth=1;c.beginPath();c.arc(bag.x,bag.y-10,5,Math.PI,Math.PI*2);c.stroke();rect(bag.x-12,bag.y-6,24,1,"#0d0e10");
  }
  // Project all court markings through the same ground plane as actors and ball.
  const path=(points:{x:number;y:number}[],color:string,fill=false,close=false)=>{c.beginPath();points.forEach((p,i)=>{const q=courtPoint(p.x,p.y);if(i===0)c.moveTo(q.x,q.y);else c.lineTo(q.x,q.y);});if(close)c.closePath();if(fill){c.fillStyle=color;c.fill();}else{c.strokeStyle=color;c.stroke();}};
  const box=(x:number,y:number,w:number,h:number,color:string,fill=false)=>path([{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}],color,fill,true);
  const arc=(x:number,y:number,rx:number,ry:number,start=0,end=Math.PI*2)=>Array.from({length:65},(_,i)=>({x:x+Math.cos(start+(end-start)*i/64)*rx,y:y+Math.sin(start+(end-start)*i/64)*ry}));
  const line="#d8d6c8";
  c.save();c.beginPath();[{x:60,y:164},{x:840,y:164},{x:840,y:330},{x:60,y:330}].forEach((p,i)=>{const q=courtPoint(p.x,p.y);if(i===0)c.moveTo(q.x,q.y);else c.lineTo(q.x,q.y);});c.closePath();c.clip();
  c.lineWidth=2;
  for(const left of [true,false]){const x=left?60:710,center=left?190:710;
    box(x,207,130,80,line);path(arc(center,247,45,40),line);
    path(arc(left?60:840,247,THREE_POINT_ARC.xRadius,THREE_POINT_ARC.yRadius,left?-Math.PI/2:Math.PI/2,left?Math.PI/2:Math.PI*1.5),line);
  }
  path([{x:450,y:164},{x:450,y:330}],line);
  path(arc(450,247,57,35),line);
  c.restore();c.lineWidth=2;box(60,164,780,166,line);
}
