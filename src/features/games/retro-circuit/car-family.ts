/**
 * Original APEXBREAK car family, revision 1 (2026-10-23).
 * Editable scanline pixel construction. No commercial sprite pixels, masks,
 * traced contours, fonts or logos are incorporated. Reference observations:
 * low rear camera; visible tyre contacts; strong vehicle colour identities;
 * readable flank views. All dimensions, details and holds below are designed.
 */
export type CarId = 'vector' | 'comet' | 'kestrel' | 'nomad';
export type CarPose = 'straight' | 'left' | 'right' | 'brake' | 'boost' | 'contact';
export type PixelRect = {x:number;y:number;width:number;height:number;color:string};
export const carIds:readonly CarId[] = ['vector','comet','kestrel','nomad'];
export const poses:readonly CarPose[] = ['straight','left','right','brake','boost','contact'];
export const carPaint = {
  vector:{light:'#f1ece7',body:'#c7c1c9',shade:'#817a94',deep:'#514b65',shine:'#fffbee'},
  comet:{light:'#ffc17c',body:'#e87530',shade:'#a83c23',deep:'#572b2d',shine:'#fff0b9'},
  kestrel:{light:'#e885d6',body:'#a6389b',shade:'#6a286d',deep:'#351f47',shine:'#ffd8ef'},
  nomad:{light:'#9397a9',body:'#4a4c60',shade:'#292b3c',deep:'#1d1e2b',shine:'#d7d5df'},
} as const;

/** Original low-rear coupe construction. Source-inspired proportions, no source
 * pixels or traced contours. Scanline faces change perspective independently. */
type Pt=readonly[number,number];
const ink='#15131e',rubber='#201d28',chrome='#b6adb3',glass='#252c42',glassMid='#4d506a',glassLight='#8a839a';
function painter(){const pixels:PixelRect[]=[];const r=(x:number,y:number,width:number,height:number,color:string)=>{if(width>0&&height>0)pixels.push({x:Math.round(x),y:Math.round(y),width:Math.round(width),height:Math.round(height),color});};const p=(a:readonly Pt[],color:string)=>{for(let y=Math.floor(Math.min(...a.map(q=>q[1])));y<Math.ceil(Math.max(...a.map(q=>q[1])));y++){const xs:number[]=[];for(let i=0,j=a.length-1;i<a.length;j=i++){const v=a[j],w=a[i];if((v[1]<=y+.5&&w[1]>y+.5)||(w[1]<=y+.5&&v[1]>y+.5))xs.push(v[0]+(y+.5-v[1])*(w[0]-v[0])/(w[1]-v[1]));}xs.sort((v,w)=>v-w);for(let i=0;i<xs.length;i+=2){const x=Math.ceil(xs[i]-.5);r(x,y,Math.ceil(xs[i+1]-.5)-x,1,color);}}};return{pixels,r,p,rect:r,poly:p};}
export function turnAmountFor(amount:number):0|.5|1|-.5|-1{const a=Number.isFinite(amount)?Math.min(1,Math.abs(amount)):0,m=a<.18?0:a<.65?.5:1;return(amount<0?-m:m)as 0|.5|1|-.5|-1;}
function geometry(id:CarId,amount:number){const t=Math.max(-1,Math.min(1,amount)),a=Math.abs(t),rear=40-t*7,half=24-a*2,cabin=40+t*1,roof=id==='comet'?9:id==='kestrel'?6:7;return{t,a,rear,half,cabin,roof,left:rear-half,right:rear+half};}
export function carPoseAnchors(id:CarId,turnAmount=0){const g=geometry(id,turnAmount);return{ground:[40,34]as const,rearAxle:[g.rear,34]as const,cabin:[g.cabin,g.roof+3]as const,exhausts:[[g.rear-g.half*.62,30],[g.rear+g.half*.62,30]]as const,lamps:[[g.rear-g.half*.62,23],[g.rear+g.half*.62,23]]as const};}
export function carPixels(id:CarId,pose:CarPose,frame=0,turnMagnitude=1):PixelRect[]{
 const turn=(pose==='left'?-1:pose==='right'?1:0)*Math.max(0,Math.min(1,turnMagnitude));
 return bodyPixels(id,turn,pose,frame);
}
export function turnCarPixels(id:CarId,amount:number,frame=0){const t=turnAmountFor(amount);return bodyPixels(id,t,'straight',frame);}
function bodyPixels(id:CarId,turn:number,pose:CarPose,frame:number):PixelRect[]{
 const{pixels,r,p}=painter(),c=carPaint[id],g=geometry(id,turn),{left:L,right:R,rear:cx,cabin:nx,roof:y,a,t}=g;
 const face=(u:number)=>cx+u*g.half;
 // Rear contact width foreshortens with the fascia; contacts remain at y34.
 r(L+2,25,6,9,rubber);r(R-8,25,6,9,rubber);r(L+3,29,2,3,'#777786');r(R-5,29,2,3,'#777786');
 // Visible flank is on the steering side. Nose/cabin follows steering sign.
 if(a){const side=t<0?L:R,front=side+t*13,near=side+(t<0?2:-2);
  p([[side,20],[front,16],[front,26],[near,33],[side,30]],ink);
  p([[side,21],[front+t,18],[front+t,25],[near,30]],c.shade);
  p([[side,21],[front+t,18],[front+t,20],[side,24]],c.light);
  p([[side,27],[front+t,23],[front+t,26],[near,31]],c.deep);
  r(front-2,23,5,8,rubber);r(front,24,1,5,chrome);
 }
 // Original shallow roof/glass/deck envelope; reduced rear width at yaw.
 p([[L,20],[nx-21,15],[nx-14,y],[nx+13,y],[nx+21,15],[R,20],[R+1,28],[R-3,33],[L+3,33],[L-1,28]],ink);
 p([[L+2,20],[nx-20,15],[nx-13,y+1],[nx+12,y+1],[nx+19,15],[R-2,20],[R-1,29],[L+1,29]],c.shade);
 p([[nx-20,16],[nx-13,y+1],[nx+12,y+1],[nx+20,16]],c.light);r(nx-12,y+1,24,1,c.shine);
 p([[nx-17,16],[nx-11,y+3],[nx+11,y+3],[nx+17,16],[nx+17,18],[nx-17,18]],ink);
 p([[nx-15,16],[nx-10,y+4],[nx+10,y+4],[nx+15,16],[nx+15,17],[nx-15,17]],glass);
 r(nx-10,y+4,19,1,'#8a839a');r(nx-16,17,32,1,c.shade);
 // Attached mirrors, wider outer deck and a broad recessed dark rear fascia.
 r(nx-23,17,6,2,ink);r(nx-22,17,4,1,c.light);r(nx+17,17,6,2,ink);r(nx+18,17,4,1,c.light);
 p([[L+1,21],[nx-20,18],[nx+20,18],[R-1,21],[R-2,23],[L+2,23]],c.light);
 r(L+3,20,R-L-6,1,c.shine);r(L+1,22,R-L-2,6,c.deep);r(L+3,22,R-L-6,5,ink);
 const red=pose==='brake'?'#ff4841':'#a3293c',hot=pose==='brake'?'#fff1a6':'#ee6970';
 if(id==='vector'){
  for(const u of[-.79,-.58,.4,.61]){r(face(u),23,4-a,3,red);r(face(u),23,3-a,1,hot);}r(face(-.37),23,g.half*.74,1,c.shade);r(face(-.37),25,g.half*.74,1,c.shade);r(cx-3,23,6,1,chrome);r(face(-.28),26,g.half*.56,1,c.deep);
 }else if(id==='comet'){
  r(nx-20,18,40,2,ink);r(nx-19,18,38,1,c.light);for(let yy=20;yy<22;yy++)r(nx-12,yy,24,1,yy%2?c.deep:c.shade);
  r(face(-.82),23,9-a*2,4,red);r(face(.48),23,9-a*2,4,red);r(face(-.82),23,8-a*2,1,hot);r(face(.52),23,7-a*2,1,hot);
 }else if(id==='kestrel'){
  r(nx,13,1,5,c.light);for(const u of[-.81,.63]){r(face(u),22,4,6,red);r(face(u)+1,23,2,2,hot);}r(face(-.5),24,g.half,2,c.body);
 }else{
  r(nx-13,y,26,1,chrome);r(face(-.83),23,g.half*.5,3,red);r(face(.32),23,g.half*.5,3,red);r(face(-.8),23,g.half*.43,1,hot);r(face(.35),23,g.half*.43,1,hot);r(face(-.87),28,g.half*1.74,1,chrome);
 }
 p([[L+2,28],[R-2,28],[R-3,32],[L+3,32]],c.light);r(L+4,29,R-L-8,1,c.shine);
 // Recessed intake pairs, squared plate and separate lower tyre contacts.
 r(face(-.82),29,8-a,3,ink);r(face(.5),29,8-a,3,ink);for(const u of[-.75,-.6,.56,.72])r(face(u),29,1,2,chrome);
 r(cx-8,27,16,5,ink);r(cx-6,28,12,2,'#e0d8cc');r(cx-3,29,6,1,c.shade);r(L+5,32,R-L-10,1,c.shade);
 if(pose==='boost'){const anchors=carPoseAnchors(id,turn);for(const[x,yy]of anchors.exhausts){const h=frame%2?6:4;p([[x-2,yy],[x+2,yy],[x,yy+h]],'#e76229');p([[x-1,yy],[x+1,yy],[x,yy+h*.6]],'#fff3ba');}}
 if(pose==='contact'){const x=frame%2?R+2:L-4;r(x,23,2,3,'#fff3bd');r(x+(frame%2?3:-3),25,3,1,'#ffc465');}
 return pixels;
}
/** Distant geometry deliberately retains each identity at reduced detail. */
export function farCarPixels(id:CarId):PixelRect[]{const{pixels,r,p}=painter(),c=carPaint[id],roof=id==='comet'?3:id==='kestrel'?1:2;p([[2,8],[6,roof+1],[8,roof],[16,roof],[19,roof+1],[22,8],[21,12],[3,12]],ink);r(3,10,3,3,rubber);r(18,10,3,3,rubber);p([[4,8],[8,roof+1],[16,roof+1],[20,8],[20,11],[4,11]],c.body);r(8,roof+1,8,1,c.light);r(7,roof+2,10,1,glass);r(4,8,16,2,c.deep);if(id==='kestrel'){r(4,8,2,3,'#dd5763');r(18,8,2,3,'#dd5763');}else{r(4,8,5,1,'#dd5763');r(15,8,5,1,'#dd5763');}r(4,11,16,1,c.light);r(10,10,4,1,'#ded4c5');if(id==='nomad')r(5,10,14,1,chrome);if(id==='comet')r(6,7,12,1,c.light);return pixels;}
export const carFamilyMetadata={version:'original-rear-perspective-2.2.0',near:{width:80,height:40,anchor:[40,34]},far:{width:24,height:14,anchor:[12,13]},poses:{amounts:[-1,-.5,0,.5,1],holds:'Designed 3ticks soft turn-in/release; held full pose; no body bob or wheel spin claim'},provenance:{commercialPixels:false,tracedContours:false,source:'Manual source proportion study; wholly original scanline pixels',approval:'reference'}}as const;





/** Nose-up overhead, 48×80; rear axle ground anchor [24,72]. */
export function overheadCarPixels(id:CarId):PixelRect[]{
  const {pixels,rect:r,poly:p}=painter(),c=carPaint[id],wide=id==='kestrel'?1:0;
  r(7,19,5,13,rubber);r(36,19,5,13,rubber);r(6,57,5,15,rubber);r(37,57,5,15,rubber);
  p([[15,5],[33,5],[38,10],[40+wide,25],[39+wide,65],[36,73],[12,73],[9-wide,65],[8-wide,25],[10,11]],ink);
  p([[15,6],[33,6],[37,11],[39,26],[38,65],[35,72],[13,72],[10,65],[9,26],[11,12]],c.body);
  p([[15,7],[33,7],[36,12],[37,28],[11,28],[12,13]],c.light);
  r(16,8,16,1,c.shine);r(11,19,2,31,c.light);r(35,19,2,31,c.shade);
  // Bonnet crease, inset headlight clusters and two longitudinal highlights.
  r(14,12,3,5,c.shine);r(31,12,3,5,c.shine);r(15,18,1,10,c.body);r(32,18,1,10,c.shade);
  p([[13,30],[35,30],[34,39],[14,39]],ink);p([[14,31],[34,31],[33,37],[15,37]],glass);
  r(15,32,17,2,glassLight);r(17,34,15,1,glassMid);
  p([[15,40],[33,40],[34,53],[14,53]],c.light);r(16,40,16,1,c.shine);r(16,42,1,9,c.body);r(31,42,1,9,c.shade);
  p([[14,54],[34,54],[35,63],[13,63]],ink);p([[15,55],[33,55],[34,61],[14,61]],glass);r(16,56,16,1,glassLight);
  r(12,65,24,5,c.light);r(13,69,22,1,c.shine);r(12,71,24,1,c.shade);
  r(10,33,3,17,c.shade);r(35,33,3,17,c.deep);r(6,34,5,3,ink);r(37,34,5,3,ink);r(7,34,3,1,c.light);r(38,34,3,1,c.light);
  r(12,70,7,2,'#a3293c');r(29,70,7,2,'#a3293c');
  if(id==='vector'){r(19,23,10,1,c.body);r(16,64,16,1,c.shade);}
  if(id==='comet'){for(let y=56;y<65;y+=2)r(14,y,20,1,c.deep);r(10,66,28,2,ink);r(11,66,26,1,c.light);r(21,17,6,9,c.shade);}
  if(id==='kestrel'){r(23,55,2,7,c.shade);r(13,54,2,9,c.body);r(33,54,2,9,c.body);r(13,26,22,2,c.shade);}
  if(id==='nomad'){r(12,68,24,1,chrome);r(13,41,1,10,chrome);r(34,41,1,10,chrome);r(16,23,16,1,c.shade);}
  return pixels;
}
export function paintPixels(ctx:Pick<CanvasRenderingContext2D,'fillStyle'|'fillRect'>,pixels:readonly PixelRect[]){for(const pixel of pixels){ctx.fillStyle=pixel.color;ctx.fillRect(pixel.x,pixel.y,pixel.width,pixel.height);}}
