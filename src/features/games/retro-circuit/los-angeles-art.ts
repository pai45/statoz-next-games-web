/** Original pixel-cluster environment, inspired by observed landscape hierarchy.
 * No commercial pixels, lettering outlines or traced contours. Pending scene review.
 * Panorama 1024x140; props 64x96, ground contact [32,94]. */
export const LA_ART_VERSION = 'sunset-hills-original-1.1.0';
type Point = readonly [number, number];
function tools(c: CanvasRenderingContext2D) {
  const r = (x:number,y:number,w:number,h:number,color:string) => {c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
  const p = (a: readonly Point[],color:string) => {
    const low=Math.min(...a.map(q=>q[1])), high=Math.max(...a.map(q=>q[1])); c.fillStyle=color;
    for(let y=Math.ceil(low);y<high;y++){const xx:number[]=[];for(let i=0,j=a.length-1;i<a.length;j=i++){
      const v=a[j],w=a[i];if((v[1]<=y+.5&&w[1]>y+.5)||(w[1]<=y+.5&&v[1]>y+.5))xx.push(v[0]+(y+.5-v[1])*(w[0]-v[0])/(w[1]-v[1]));
    }xx.sort((v,w)=>v-w);for(let i=0;i<xx.length;i+=2)r(xx[i],y,Math.round(xx[i+1])-Math.round(xx[i]),1,color);}
  };
  const l=(x:number,y:number,xx:number,yy:number,color:string,width=1)=>{
    x=Math.round(x);y=Math.round(y);xx=Math.round(xx);yy=Math.round(yy);const dx=Math.abs(xx-x),sx=x<xx?1:-1,dy=-Math.abs(yy-y),sy=y<yy?1:-1;let e=dx+dy;
    for(;;){r(x,y,width,width,color);if(x===xx&&y===yy)break;const e2=e*2;if(e2>=dy){e+=dy;x+=sx;}if(e2<=dx){e+=dx;y+=sy;}}
  };return {r,p,l};
}
const glyphs:Record<string,string[]>={
  S:['111','100','100','111','001','001','111'],U:['101','101','101','101','101','101','111'],
  N:['1001','1101','1101','1011','1011','1001','1001'],E:['111','100','100','110','100','100','111'],
  T:['11111','00100','00100','00100','00100','00100','00100'],H:['1001','1001','1001','1111','1001','1001','1001'],
  I:['111','010','010','010','010','010','111'],L:['100','100','100','100','100','100','111'],
};
function lettering(c:CanvasRenderingContext2D,text:string,x:number,y:number,color:string,scaleY=1){
  const {r}=tools(c);for(const ch of text){const g=glyphs[ch];if(!g){x+=4;continue;}for(let yy=0;yy<g.length;yy++)for(let xx=0;xx<g[yy].length;xx++)if(g[yy][xx]==='1')r(x+xx,y+yy*scaleY,1,scaleY,color);x+=g[0].length+2;}
}
/** Wrapped undulating golden foothills. Original invented hill-top sign. */
export function paintLosAngelesPanorama(c:CanvasRenderingContext2D){
  c.clearRect(0,0,1024,140);c.imageSmoothingEnabled=false;const {r,p,l}=tools(c);
  r(0,0,1024,140,'#04bce8');
  p([[0,81],[35,77],[67,69],[100,73],[128,65],[167,59],[196,63],[224,53],[263,59],[304,72],[350,68],[392,79],[431,73],[468,61],[513,57],[552,64],[591,71],[637,67],[675,51],[708,46],[750,52],[788,65],[820,60],[853,65],[897,76],[944,69],[987,76],[1024,81],[1024,140],[0,140]],'#a7a322');
  p([[0,90],[60,83],[91,90],[140,82],[189,77],[226,62],[259,69],[303,83],[352,81],[401,91],[451,86],[492,74],[529,70],[566,77],[612,86],[651,78],[688,57],[714,53],[752,63],[788,77],[832,72],[875,82],[916,89],[960,81],[1002,87],[1024,90],[1024,140],[0,140]],'#b5ab25');
  p([[0,118],[51,108],[93,115],[130,103],[169,104],[210,89],[244,87],[278,99],[319,111],[362,104],[410,114],[449,109],[486,93],[525,89],[563,99],[601,113],[650,100],[689,77],[727,72],[764,88],[797,102],[837,94],[879,108],[921,117],[961,109],[1004,117],[1024,118],[1024,140],[0,140]],'#9a9a1e');
  // Sparse stepped bands are placed within the authored land silhouette.
  for(let i=0;i<480;i++){const x=(i*89+7)%1024,y=91+(i*17)%40,w=2+(i%4);r(x,y,w,1,i%3===0?'#c0b536':i%3===1?'#8c941a':'#a4a323');if(i%5===0)r(x+2,y-2,2,1,'#c7b940');}
  for(const [x,y]of [[155,77],[237,68],[505,78],[700,63],[767,80],[953,91]]){l(x,y,x+17,y+7,'#c0b238');l(x+5,y+5,x+13,y+9,'#99991c');}
  r(0,133,1024,4,'#7e8d17');r(0,137,1024,3,'#538b12');
  lettering(c,'SUNSET HILLS',481,77,'#6f701e',2);lettering(c,'SUNSET HILLS',480,76,'#fff4d0',2);
}
/** kind: 0 palm, 1 round tree, 2 rock, 3 left, 4 right, 5 pit, 6 lamp, 7 sign. */
export function paintLAProp(c:CanvasRenderingContext2D,kind:number){
  c.clearRect(0,0,64,96);c.imageSmoothingEnabled=false;const {r,p,l}=tools(c);
  const shadow=()=>{r(16,92,34,2,'#16400d');r(23,94,20,1,'#16400d');};shadow();
  if(kind===0){
    p([[29,94],[36,94],[31,68],[28,46],[34,24],[30,22],[24,46],[26,70]],'#384937');
    p([[31,93],[34,93],[29,67],[27,46],[32,25],[30,25],[25,46],[28,70]],'#b2bfa0');
    l(30,92,27,60,'#e0d8ba');l(26,56,30,27,'#e0d8ba');
    for(let y=41;y<92;y+=6)l(y<61?26:28,y,y<61?29:32,y-2,'#5f7259');
    const leaves: readonly (readonly Point[])[]=[[[32,25],[19,13],[8,13],[0,20],[12,17],[22,19]],[[31,25],[28,8],[22,2],[16,4],[23,9],[26,23]],[[32,24],[39,10],[50,7],[59,13],[47,12],[39,18]],[[33,25],[46,20],[56,26],[63,39],[55,34],[48,28],[40,28]],[[31,26],[17,25],[7,34],[3,47],[11,39],[20,32]],[[32,27],[39,36],[43,50],[42,57],[38,47],[33,36]],[[30,28],[23,38],[21,51],[16,58],[18,42],[23,31]]];
    for(const leaf of leaves)p(leaf,'#193d25');
    for(const [x,y,xx,yy]of [[30,24,13,15],[29,23,23,7],[33,23,48,11],[34,26,53,28],[29,27,12,35],[34,29,40,45],[27,31,20,47]])l(x,y,xx,yy,'#89ad62',2);
    r(28,23,7,6,'#5d8342');r(28,28,3,4,'#726b3c');r(32,29,3,3,'#544d31');
  }else if(kind===1){
    r(29,64,7,30,'#3a462b');r(30,67,2,26,'#8c8e53');
    p([[13,80],[9,72],[10,54],[15,49],[14,34],[20,29],[22,19],[35,15],[45,20],[48,34],[54,40],[53,57],[57,68],[51,80],[43,85],[22,85]],'#1e492c');
    p([[15,69],[14,53],[20,47],[19,34],[25,25],[36,22],[43,27],[43,39],[49,45],[47,60],[51,67],[43,76],[24,78]],'#477c43');
    for(const [x,y,w,h]of [[23,24,9,5],[32,21,8,5],[20,35,9,5],[30,34,10,6],[38,42,7,6],[17,52,7,6],[27,49,9,6],[23,62,10,6],[38,62,8,5],[33,73,7,4]]){r(x,y,w,h,'#739858');r(x+2,y,Math.max(2,w-4),2,'#98b473');}
    for(const [x,y]of [[22,31],[35,30],[31,43],[20,61],[39,55],[31,68],[44,72]])r(x,y,3,4,'#315d35');
    r(18,81,27,3,'#244e2d');
  }else if(kind===2){
    p([[12,91],[16,77],[27,68],[42,71],[51,83],[54,92]],'#697274');p([[15,88],[20,77],[29,70],[38,73],[30,80],[26,89]],'#bdc5b1');p([[31,82],[40,74],[48,84],[49,91],[30,91]],'#89968a');l(26,71,39,73,'#e0e2c9');r(17,92,36,2,'#455c43');
  }else if(kind===3||kind===4){
    r(17,46,3,48,'#a2b59a');r(19,48,2,44,'#425a44');r(46,46,3,48,'#a2b59a');r(48,48,2,44,'#425a44');r(3,25,58,27,'#293c2e');r(5,27,54,23,'#fff0ce');r(5,49,54,1,'#a9ae86');
    for(const center of [15,33,51])for(let y=-8;y<=8;y++){const dir=kind===3?-1:1;r(center+dir*(8-Math.abs(y))-3,38+y,5,1,'#df3624');}
  }else if(kind===5){
    r(17,48,3,46,'#b1b99b');r(46,48,3,46,'#b1b99b');r(4,26,56,28,'#184d35');r(6,28,52,24,'#2f7045');r(13,33,4,15,'#fff0c9');r(17,33,8,3,'#fff0c9');r(22,35,3,6,'#fff0c9');r(17,40,7,3,'#fff0c9');p([[39,32],[50,40],[39,48]],'#fff0c9');r(30,38,13,4,'#fff0c9');
  }else if(kind===6){
    r(30,15,3,79,'#6c8979');r(30,16,1,75,'#bac8a6');l(31,18,23,9,'#8ba18b',2);r(9,7,17,3,'#b7bda3');r(8,10,15,4,'#344e46');r(11,14,11,2,'#e6dcac');
  }else{
    r(9,55,4,39,'#647650');r(50,55,4,39,'#647650');r(1,29,62,32,'#344c2e');r(3,31,58,28,'#b7a149');r(4,32,56,1,'#eee0a1');lettering(c,'SUNSET',17,36,'#223c2a');lettering(c,'HILLS',20,47,'#223c2a');
  }
}
