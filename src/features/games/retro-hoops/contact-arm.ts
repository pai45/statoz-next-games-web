import {courtPoint} from "./view";
import type {CharacterAnchors} from "./presentation";
import type {Match} from './simulation';

type P={x:number;y:number};
type Profile=[number,number][];
/** Same constants as scripts/retro_hoops_volume.py, so the live grip arm matches the atlas. */
const LIGHT=(()=>{const v=[.56,-.58,.5],l=Math.hypot(...v);return v.map(x=>x/l);})();
const THRESHOLDS=[-.15,.12,.42,.72];
const UPPER_ARM:Profile=[[0,3.9],[.12,4.4],[.5,3.8],[1,2.9]],FOREARM:Profile=[[0,3],[.25,3.3],[1,2.3]],FIST:Profile=[[0,2.9],[1,2.6]],SLEEVE:Profile=[[0,4.7],[1,4.4]];
// Mirrors PALETTES in scripts/build-retro-hoops-authored.py (skin ramps and red-team sleeve).
const SKIN=[["#0a0504","#62381c","#ad4d09","#df750e","#fea53d"],["#0a0504","#5c180c","#b54510","#e47435","#feaa61"]];
const SLEEVE_STOPS=["#3c4058","#a8adc4","#f2f3f8"];
const rgb=(c:string)=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
const mix=(a:string,b:string,t:number)=>{const x=rgb(a),y=rgb(b);return "#"+x.map((v,i)=>Math.round(v+(y[i]-v)*t).toString(16).padStart(2,"0")).join("");};
const interp=(t:number,p:Profile)=>{if(t<=p[0][0])return p[0][1];for(let i=1;i<p.length;i++)if(t<=p[i][0]){const k=(t-p[i-1][0])/(p[i][0]-p[i-1][0]);return p[i-1][1]+(p[i][1]-p[i-1][1])*k;}return p[p.length-1][1];};
const skinTones=(s:string[])=>[s[1],mix(s[1],s[2],.5),s[2],s[3],s[4]];
const ramp3=(s:string[])=>[s[0],mix(s[0],s[1],.5),s[1],mix(s[1],s[2],.5),s[2]];

/** Shade a union of tapered capsules into RGBA pixels with one continuous outline (no joint seams). */
function shadeGroup(px:Uint8ClampedArray,caps:[P,P,Profile][],tones:string[],ink:string,mirror:boolean){
 let x0=144,y0=128,x1=0,y1=0;for(const [a,b,p] of caps){const m=Math.max(...p.map(v=>v[1]))+2;x0=Math.min(x0,a.x-m,b.x-m);y0=Math.min(y0,a.y-m,b.y-m);x1=Math.max(x1,a.x+m,b.x+m);y1=Math.max(y1,a.y+m,b.y+m);}
 x0=Math.max(0,Math.floor(x0));y0=Math.max(0,Math.floor(y0));x1=Math.min(144,Math.ceil(x1)+1);y1=Math.min(128,Math.ceil(y1)+1);
 const w=x1-x0,h=y1-y0;if(w<=0||h<=0)return;const idx=new Int8Array(w*h).fill(-1);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const qx=x0+x+.5,qy=y0+y+.5;let best=-1e9,vx=0,vy=0;
  for(const [a,b,p] of caps){const abx=b.x-a.x,aby=b.y-a.y,l2=Math.max(1e-6,abx*abx+aby*aby),t=Math.max(0,Math.min(1,((qx-a.x)*abx+(qy-a.y)*aby)/l2)),cx=a.x+abx*t,cy=a.y+aby*t,r=interp(t,p),dx=qx-cx,dy=qy-cy,depth=r-Math.hypot(dx,dy);if(depth>best){best=depth;vx=dx/r;vy=dy/r;}}
  if(best<=0)continue;const r2=Math.min(1,vx*vx+vy*vy),vz=Math.sqrt(1-r2),shade=vx*LIGHT[0]+vy*LIGHT[1]+vz*LIGHT[2];
  let k=THRESHOLDS.filter(v=>shade>=v).length;if(r2>.8)k=Math.max(0,k-1);idx[y*w+x]=k;
 }
 const ramp=tones.map(rgb),edge=rgb(ink);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const k=idx[y*w+x];if(k<0)continue;
  const out=x===0||y===0||x===w-1||y===h-1||idx[y*w+x-1]<0||idx[y*w+x+1]<0||idx[(y-1)*w+x]<0||idx[(y+1)*w+x]<0;
  const col=out?edge:ramp[k],X=mirror?143-(x0+x):x0+x,o=((y0+y)*144+X)*4;px[o]=col[0];px[o+1]=col[1];px[o+2]=col[2];px[o+3]=255;
 }
}

/** Original articulated grip overlay. The authoritative ball drives its endpoint.
 * Body/arm layers share foot origin (72,116); no outcome is computed here. */
export function drawContactArm(canvas:HTMLCanvasElement,s:Match,rig?:CharacterAnchors){
 if(canvas.width!==144||canvas.height!==128){canvas.width=144;canvas.height=128;}
 const a=s.ball.owner===null?null:s.actors[s.ball.owner],c=canvas.getContext('2d')!;c.clearRect(0,0,144,128);
 if(!a||!['shoot','pass','dunk','fake','receive'].includes(a.action))return null;
 const ground=courtPoint(a.x,a.y,a.z),ball=courtPoint(s.ball.x,s.ball.y,s.ball.z);
 const shoulder={x:rig?.shoulders?.[0]?(a.face===1?rig.shoulders[0][0]:144-rig.shoulders[0][0]):67,y:rig?.shoulders?.[0]?.[1]??47},wrist={x:72+(ball.x-ground.x)/ground.scale*a.face,y:116+(ball.y-ground.y)/ground.scale};
 const dx=wrist.x-shoulder.x,dy=wrist.y-shoulder.y,d=Math.max(.01,Math.hypot(dx,dy)),reach=Math.max(1.1,Math.min(d,40.9)),u=(21*21-20*20+reach*reach)/(2*reach),h=Math.sqrt(Math.max(0,21*21-u*u));
 const bend=wrist.y<shoulder.y+12?(wrist.x>=shoulder.x?1:-1):(wrist.x>=shoulder.x?-1:1);
 const elbow={x:shoulder.x+dx/d*u-dy/d*h*bend,y:shoulder.y+dy/d*u+dx/d*h*bend};
 const skin=SKIN[a.team===0?0:1],fl=Math.max(.01,Math.hypot(wrist.x-elbow.x,wrist.y-elbow.y)),ux=(wrist.x-elbow.x)/fl,uy=(wrist.y-elbow.y)/fl;
 const image=c.createImageData(144,128),mirror=a.face===-1;
 // V19 volume arm: upper arm, forearm and fist share one lit volume and one outline.
 shadeGroup(image.data,[[shoulder,elbow,UPPER_ARM],[elbow,wrist,FOREARM],[{x:wrist.x-ux*.5,y:wrist.y-uy*.5},{x:wrist.x+ux*1.6,y:wrist.y+uy*1.6},FIST]],skinTones(skin),skin[0],mirror);
 if(a.team===1){const cuff={x:shoulder.x+(elbow.x-shoulder.x)*.42,y:shoulder.y+(elbow.y-shoulder.y)*.42};shadeGroup(image.data,[[shoulder,cuff,SLEEVE]],ramp3(SLEEVE_STOPS),SLEEVE_STOPS[0],mirror);}
 c.putImageData(image,0,0);
 return {actor:a.id,wrist:{x:wrist.x,y:wrist.y},shoulder};
}
