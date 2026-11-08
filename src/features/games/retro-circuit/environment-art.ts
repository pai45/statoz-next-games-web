import {paintHiroshimaPanorama,paintHiroshimaProp} from './hiroshima-art';
import {paintLosAngelesPanorama,paintLAProp} from './los-angeles-art';
import {biomeFor} from './data';
import type { TrackDefinition } from './types';

/** Original code-authored scenery for the reference-only Circuit v2 study.
 * No pixels, track layouts, logos or lettering copied from a commercial game.
 * Canvas sizes are part of the asset contract. Contact is [32,94] for props,
 * [32,60] for obstacles. All raster edges use integer pixel fills. */
export const ENVIRONMENT_ART_VERSION = 'circuit-environments-2.0.0';
export const ENVIRONMENT_ART_METADATA = {
  authorship: 'Original code-authored pixel scenery; created for the StatOz Circuit reference study',
  status: 'reference; pending scene review',
  commercialPixels: false,
  native: { panorama: [1024,140], prop: [64,96], obstacle: [64,64] },
  anchors: { prop: [32,94], obstacle: [32,60] },
  notes: 'Layered horizon, roadside silhouettes and hazard readability are design choices inspired by a 16-bit rear-view racing presentation. No native source geometry or timing claim.'
} as const;
export type ObstacleArtKind = 'cone' | 'barrel' | 'barrier' | 'rock';
type Point = readonly [number,number];

function raster(c: CanvasRenderingContext2D) {
  const rect = (x:number,y:number,w:number,h:number,color:string) => {
    c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
  };
  const poly = (points:readonly Point[],color:string) => {
    let low=Infinity,high=-Infinity;for(const p of points){low=Math.min(low,p[1]);high=Math.max(high,p[1]);}
    c.fillStyle=color;
    for(let y=Math.ceil(low);y<Math.ceil(high);y++){
      const xs:number[]=[];
      for(let i=0,j=points.length-1;i<points.length;j=i++){
        const a=points[j],b=points[i];
        if((a[1]<=y+.5&&b[1]>y+.5)||(b[1]<=y+.5&&a[1]>y+.5))xs.push(a[0]+(y+.5-a[1])*(b[0]-a[0])/(b[1]-a[1]));
      }
      xs.sort((a,b)=>a-b);for(let i=0;i<xs.length;i+=2)c.fillRect(Math.round(xs[i]),y,Math.round(xs[i+1])-Math.round(xs[i]),1);
    }
  };
  const line = (x0:number,y0:number,x1:number,y1:number,color:string,width=1) => {
    x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);
    const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let error=dx+dy;
    for(;;){rect(x0,y0,width,width,color);if(x0===x1&&y0===y1)break;const e=error*2;if(e>=dy){error+=dy;x0+=sx;}if(e<=dx){error+=dx;y0+=sy;}}
  };
  return {rect,poly,line};
}

/** A continuous wrap panorama. Far layers end in level terrain at both edges. */
export function paintEnhancedPanorama(c:CanvasRenderingContext2D,track:TrackDefinition) {
  if(track.id==='night'){paintHiroshimaPanorama(c);return;}
  if(track.id==='harbour'){paintLosAngelesPanorama(c);return;}
  c.clearRect(0,0,c.canvas.width,c.canvas.height);c.imageSmoothingEnabled=false;
  const {rect:r,poly:p,line:l}=raster(c);
  const cloud=(x:number,y:number,scale=1,warm=false)=>{
    const a=warm?'#d6c3bf':'#b4d8da',b=warm?'#f1d1b7':'#e9f3dc';
    for(const [dx,dy,w,h]of [[0,8,46,4],[9,4,18,7],[17,0,16,9],[31,5,11,6]] as const)r(x+dx*scale,y+dy*scale,w*scale,h*scale,a);
    for(const [dx,dy,w,h]of [[5,7,34,3],[13,3,12,5],[20,1,10,6]]as const)r(x+dx*scale,y+dy*scale,w*scale,h*scale,b);
  };
  if(track.profile==='reference'&&biomeFor(track)==='desert'){
    // Original ridge construction matched to the source's broad tan/cyan hierarchy.
    // The coordinates are authored; no recording contours or texture samples.
    r(0,0,1024,140,'#04b9e2');
    const ridge:Point[]=[[0,88],[46,74],[93,58],[127,31],[170,15],[208,23],[251,42],[288,50],[331,32],[376,16],[421,29],[466,61],[508,78],[560,85],[603,71],[651,44],[697,28],[738,22],[778,39],[824,65],[870,74],[920,56],[965,68],[1024,88],[1024,140],[0,140]];
    p(ridge,'#d9ab89');
    p([[0,99],[93,59],[127,34],[170,18],[154,45],[130,66],[111,104],[90,126],[0,132]],'#edc3a1');
    p([[172,19],[207,26],[238,49],[269,63],[288,111],[245,91],[218,78],[196,44]],'#bb876d');
    p([[290,124],[331,36],[375,19],[361,50],[341,75],[333,118]],'#f0c5a2');
    p([[376,19],[421,31],[467,66],[491,109],[442,86],[416,70],[400,40]],'#c79577');
    p([[552,126],[603,73],[653,47],[698,31],[739,25],[716,61],[680,91],[653,126]],'#eac29f');
    p([[742,27],[780,43],[824,68],[870,79],[901,110],[839,97],[807,87],[773,61]],'#be8e74');
    for(let i=0;i<310;i++){const x=(i*73+17)%1024,y=48+(i*31)%84;if((x+y*3)%7<3){r(x,y,2+i%3,1,i%3?'#dfb492':'#d1a17f');if(i%4===0)r(x+3,y+2,2,1,'#ebbf9b');}}
    r(0,132,1024,4,'#c69b79');r(0,136,1024,4,'#ddb18c');
  }else if(biomeFor(track)==='desert'){

    r(0,0,1024,140,'#55a6b7');r(0,43,1024,24,'#71b5bd');r(0,67,1024,26,'#9ec6c2');r(0,93,1024,47,'#c8cbb5');
    r(742,20,24,16,'#ead69f');r(746,16,16,24,'#ead69f');r(746,20,16,16,'#ffe5b0');
    cloud(57,18,1);cloud(304,35,.75);cloud(504,12,1.3);cloud(881,40,.8);
    // Discrete mesa formations, with continuous foothill silhouettes underneath.
    p([[0,112],[45,99],[91,105],[133,90],[174,94],[210,83],[257,97],[292,87],[345,96],[399,79],[461,98],[503,91],[549,103],[606,89],[650,97],[699,82],[752,97],[801,90],[844,100],[894,86],[946,101],[984,105],[1024,112],[1024,140],[0,140]],'#ae9f8d');
    for(const [x,y,w,h]of [[83,53,132,72],[319,72,92,54],[544,48,159,78],[812,68,113,60]] as const){
      p([[x-28,126],[x-8,y+h*.48],[x+8,y+h*.48],[x+14,y+6],[x+27,y],[x+w-24,y],[x+w-13,y+6],[x+w-7,y+h*.54],[x+w+9,y+h*.54],[x+w+33,127]],'#805b56');
      p([[x-16,123],[x+1,y+h*.45],[x+15,y+h*.45],[x+20,y+7],[x+w-24,y+7],[x+w-18,y+15],[x+w-10,y+h*.65],[x+w+12,125]],'#b18065');
      p([[x+20,y+7],[x+42,y+7],[x+36,y+23],[x+29,y+27],[x+21,y+69],[x+5,125],[x-13,125],[x+2,y+45],[x+15,y+45]],'#d3a478');
      p([[x+48,y+7],[x+66,y+7],[x+61,y+37],[x+52,y+48],[x+43,124],[x+29,124],[x+36,y+52]],'#c59370');
      p([[x+w-34,y+7],[x+w-24,y+7],[x+w-17,y+51],[x+w-1,126],[x+w-24,126],[x+w-33,y+49]],'#8e6254');
      r(x+21,y+6,w-45,2,'#e7bc8c');r(x+17,y+14,w-31,2,'#a76f59');r(x+6,y+44,w-4,2,'#96624f');
      for(let i=0;i<6;i++){const xx=x+20+i*(w-29)/6,yy=y+26+(i%2)*9;r(xx,yy,8+(i%3)*3,2,'#98654f');r(xx+3,yy+3,5,1,'#d7a177');}
    }
    p([[0,125],[61,117],[117,124],[164,119],[222,129],[287,121],[345,127],[398,118],[456,125],[508,116],[565,127],[620,121],[676,125],[728,119],[787,128],[843,117],[902,125],[968,119],[1024,125],[1024,140],[0,140]],'#c1946c');
    p([[0,135],[104,132],[163,138],[257,129],[353,136],[441,132],[532,139],[639,130],[722,136],[820,132],[922,138],[1024,135],[1024,140],[0,140]],'#dcb186');
    for(const x of [37,263,481,748,960]){r(x,121,3,14,'#5c7152');r(x-4,124,3,6,'#5c7152');r(x-4,129,5,2,'#5c7152');r(x+4,119,3,8,'#5c7152');r(x+2,125,5,2,'#5c7152');r(x,121,1,13,'#829062');}
    for(let i=0;i<36;i++){const x=(i*139+31)%1024,y=130+(i%5)*2;r(x,y,5+i%4,1,i%2?'#c69770':'#e8bf91');}
  }else if(biomeFor(track)==='coast'){
    r(0,0,1024,140,'#318ab3');r(0,37,1024,28,'#55adc7');r(0,65,1024,29,'#8ecacf');r(0,94,1024,46,'#bbddd0');
    cloud(30,19,1.6);cloud(270,38,1);cloud(473,12,1.35);cloud(710,33,.8);cloud(860,18,1.4);
    r(0,101,1024,39,'#2a829d');r(0,107,1024,3,'#58b3bd');r(0,116,1024,2,'#3a9bb0');r(0,126,1024,2,'#76c9cb');
    p([[0,104],[44,101],[74,94],[100,96],[125,84],[160,88],[187,69],[211,64],[231,76],[255,79],[283,97],[320,105]],'#6f9792');
    p([[128,101],[161,90],[190,71],[212,66],[204,78],[188,84],[171,99]],'#8eb199');
    p([[572,105],[606,102],[626,90],[649,94],[674,72],[703,64],[728,68],[748,83],[770,88],[790,103],[839,106]],'#5c8e89');
    p([[637,104],[677,76],[703,67],[697,83],[678,90],[662,105]],'#88a992');
    p([[891,106],[922,94],[939,98],[959,84],[987,90],[1014,101],[1024,103],[1024,116],[900,116]],'#799c94');
    // Small original sailboats remain subordinate to the road and cars.
    for(const [x,y,s]of [[381,113,1],[868,120,.7],[515,128,.55]]as const){l(x,y-18*s,x,y,'#f3eed0');p([[x-2,y-17*s],[x-2,y-3*s],[x-13*s,y-3*s]],'#e4eacb');p([[x+1,y-13*s],[x+1,y-3*s],[x+9*s,y-3*s]],'#bcd2bd');p([[x-12*s,y],[x+10*s,y],[x+5*s,y+3*s],[x-7*s,y+3*s]],'#405f6b');r(x-15*s,y+5*s,30*s,1,'#9acdcc');}
    for(let i=0;i<34;i++){const x=(i*167+22)%1024,y=111+(i*7)%25;r(x,y,7+(i%4)*6,1,i%3?'#62b8c4':'#c1dfd1');}
    p([[0,138],[40,133],[93,137],[132,131],[186,136],[230,133],[278,139],[345,134],[392,138],[449,132],[511,137],[567,131],[618,135],[689,137],[743,132],[808,139],[873,133],[942,137],[1024,138],[1024,140],[0,140]],'#e6d3a2');
  }else{
    r(0,0,1024,140,'#21273f');r(0,32,1024,27,'#37364f');r(0,59,1024,23,'#58465d');r(0,82,1024,25,'#946573');r(0,107,1024,33,'#bf8b8b');
    r(765,26,18,18,'#e6c1a2');r(761,30,26,10,'#e6c1a2');r(766,27,11,13,'#eed0ad');r(777,27,8,15,'#35344b');
    for(const [x,y]of [[43,12],[145,28],[292,9],[388,35],[544,16],[621,39],[868,8],[939,37]])r(x,y,1,1,'#c4bfc6');
    // Distant skyline: muted, clustered windows rather than stochastic grain.
    for(let i=0;i<40;i++){const x=i*27-6,w=17+(i%3)*7,y=66+((i*19)%31);r(x,y,w,138-y,i%2?'#5c586e':'#696477');r(x+2,y-2,w-4,2,'#777080');for(let yy=y+8;yy<132;yy+=8)for(let xx=x+5;xx<x+w-3;xx+=6)if((i+yy/8)%3!==0)r(xx,yy,2,2,'#9d8c91');}
    const blocks=[[26,54,42],[126,69,36],[204,38,43],[307,60,49],[410,22,39],[509,71,61],[636,44,40],[736,66,41],[838,32,49],[951,62,38]]as const;
    for(let i=0;i<blocks.length;i++){
      const[x,y,w]=blocks[i],body=i%2?'#292e46':'#303047';r(x,y,w,140-y,body);r(x+w-7,y+5,7,135-y,'#1e263e');r(x+2,y-3,w-9,3,'#6c6577');r(x+5,y-5,w-16,2,'#89818b');r(x+5,y+2,2,136-y,'#4b4e65');
      for(let yy=y+9;yy<135;yy+=7)for(let xx=x+10;xx<x+w-9;xx+=7){const on=((xx+yy+i*3)%11)>3;r(xx,yy,3,3,on?(i%3?'#e8c58b':'#84b0ba'):'#53556b');if(on)r(xx,yy,3,1,'#f5dca5');}
      if(i%3===0){r(x+Math.floor(w/2),y-15,1,10,'#9f939b');r(x+Math.floor(w/2)-1,y-16,3,2,'#f58d72');}
      if(i===4){r(x+12,y+8,15,9,'#aaa1a0');r(x+15,y+10,9,5,'#33374c');r(x+19,y+10,1,4,'#d0c4ad');r(x+19,y+13,3,1,'#d0c4ad');}
    }
    r(0,137,1024,3,'#1f2c3e');for(let i=0;i<32;i++){const x=i*34+8;r(x,128,2,12,'#30384c');r(x-4,128,10,2,'#8f8c95');r(x-5,130,12,1,'#e0be91');}
  }
}

/** Mainplant, low prop, architecture, turn markers, pit, lamp, billboard. */
export function paintEnhancedProp(c:CanvasRenderingContext2D,track:TrackDefinition,kind:number) {
  if(track.id==='night'){paintHiroshimaProp(c,kind);return;}
  if(track.id==='harbour'){paintLAProp(c,kind);return;}
  c.clearRect(0,0,c.canvas.width,c.canvas.height);c.imageSmoothingEnabled=false;
  const {rect:r,poly:p,line:l}=raster(c);
  const shadow=()=>{r(15,92,37,2,'#23312f');r(20,94,28,1,'#23312f');};
  const palm=()=>{
    shadow();p([[29,93],[36,93],[32,69],[30,48],[34,27],[29,25],[25,49],[27,72]],'#523e35');p([[31,92],[34,92],[30,67],[29,47],[32,27],[30,27],[27,47],[29,70]],'#af8053');
    for(let y=39;y<92;y+=7)l(28+(y>65?1:0),y,32+(y>65?1:0),y-2,'#493b32');
    const leaves:readonly (readonly Point[])[]=[[[31,28],[23,13],[10,9],[1,15],[14,13],[21,18]],[[31,27],[29,9],[23,2],[17,2],[23,8],[26,25]],[[31,27],[38,12],[49,7],[60,10],[47,12],[37,20]],[[31,27],[45,20],[57,25],[63,35],[52,28],[41,26]],[[31,27],[18,25],[7,32],[0,44],[11,35],[23,32]],[[32,27],[42,32],[47,44],[47,52],[43,41],[36,33]],[[30,28],[23,35],[20,48],[15,54],[17,39],[23,31]]];
    for(const leaf of leaves)p(leaf,'#1c523c');
    for(const pts of [[[31,26],[22,16],[10,12]],[[31,26],[28,11],[23,5]],[[32,26],[39,15],[51,10]],[[33,27],[46,23],[58,30]],[[30,28],[18,29],[7,38]],[[33,29],[42,35],[46,46]]]as const){l(pts[0][0],pts[0][1],pts[1][0],pts[1][1],'#62a45b',2);l(pts[1][0],pts[1][1],pts[2][0],pts[2][1],'#3c8650');}
    r(27,25,8,7,'#38603b');r(26,29,4,4,'#96704a');r(31,31,4,4,'#795b3c');
  };
  const cactus=()=>{
    shadow();p([[27,93],[39,93],[39,33],[36,28],[31,28],[27,33]],'#305945');r(29,33,3,58,'#75945b');r(33,31,2,60,'#527c4e');r(37,35,2,55,'#244a3b');
    p([[27,68],[17,68],[12,62],[12,45],[14,41],[19,41],[21,45],[21,58],[27,58]],'#396247');r(14,46,2,15,'#79965a');r(18,44,2,19,'#4b7f4d');
    p([[38,56],[47,56],[53,50],[53,27],[50,23],[46,23],[43,27],[43,46],[38,46]],'#325c43');r(45,28,3,21,'#78965c');r(50,28,2,20,'#244b39');
    for(let y=36;y<90;y+=8){r(28,y,2,1,'#c7bb7d');r(35,y+3,1,2,'#a1a36b');}for(let y=30;y<47;y+=8)r(44,y,1,1,'#c7bb7d');
    r(21,93,24,2,'#9b7b56');r(24,92,6,1,'#c1a174');
  };
  const pine=()=>{
    shadow();r(30,65,6,29,'#493f37');r(31,69,2,23,'#8a7352');
    for(const[xx,yy,ww,hh]of [[27,12,12,22],[20,26,26,24],[15,42,37,25],[9,60,48,23]] as const){p([[xx+ww/2,yy],[xx+ww,yy+hh],[xx,yy+hh]],'#234c40');p([[xx+ww/2,yy+2],[xx+ww/2+1,yy+hh-2],[xx+4,yy+hh-2]],'#547c50');l(xx+4,yy+hh-2,xx+ww-3,yy+hh-2,'#183f36');}r(14,84,35,2,'#183f36');
  };
  const rock=(small=false)=>{
    shadow();const top=small?66:56;
    p([[8,91],[12,top+11],[24,top],[42,top+2],[54,top+16],[57,92]],biomeFor(track)==='desert'?'#806451':'#596c68');
    p([[10,89],[14,top+11],[25,top+2],[38,top+3],[31,top+11],[23,top+14],[21,87]],biomeFor(track)==='desert'?'#c4a27c':'#9aa58c');
    p([[31,top+13],[39,top+4],[51,top+16],[50,89],[29,89]],biomeFor(track)==='desert'?'#aa8664':'#7e9081');
    l(24,top+3,39,top+4,biomeFor(track)==='desert'?'#e2bd8d':'#b8bea2');l(13,89,52,90,'#3f4a43');
    r(9,91,48,2,biomeFor(track)==='desert'?'#baa178':'#607a52');
  };
  const building=()=>{
    shadow();
    if(biomeFor(track)==='city'){
      r(9,10,44,82,'#252b3e');r(11,7,38,3,'#70727a');r(15,4,30,3,'#a6a299');r(48,14,8,78,'#161f32');r(12,13,3,78,'#4a5261');r(18,18,28,2,'#747877');
      for(let yy=24;yy<78;yy+=10)for(let xx=20;xx<46;xx+=9){r(xx-1,yy-1,7,7,'#111d30');r(xx,yy,5,5,(xx+yy)%3?'#dbbd81':'#8aa7a7');r(xx,yy,5,1,'#f8dba0');r(xx+2,yy,1,5,'#404c57');}
      r(14,81,35,3,'#96968c');r(21,85,13,9,'#111e30');r(23,86,9,7,'#719494');r(26,86,1,7,'#253946');r(37,86,8,6,'#46606d');r(10,92,46,2,'#6b7679');
    }else if(biomeFor(track)==='coast'){
      r(8,54,45,37,'#d4c9a4');r(47,55,8,36,'#9b9b83');p([[4,56],[16,40],[46,40],[58,56]],'#8b5347');p([[6,54],[18,42],[45,42],[54,54]],'#c47b59');for(let y=46;y<55;y+=4)l(14-(y-46),y,47+(y-46)/2,y,'#e0a276');
      r(17,63,10,12,'#405e63');r(19,65,6,8,'#9bc2b7');r(34,63,10,12,'#405e63');r(36,65,6,8,'#9bc2b7');r(22,78,14,14,'#4b5a56');r(25,79,8,13,'#749189');r(29,85,1,1,'#eed6a1');r(6,91,50,3,'#8a997e');r(2,94,60,1,'#b6b796');
    }else{
      r(7,63,46,29,'#d2af7b');r(46,63,10,29,'#a7805c');r(5,59,52,5,'#e2bf8c');r(9,55,42,4,'#9f6e50');r(12,52,35,3,'#b7875e');r(11,68,13,11,'#6d6250');r(13,70,9,7,'#91a092');r(31,68,13,11,'#6d6250');r(33,70,9,7,'#91a092');r(24,81,12,12,'#584c3e');r(27,83,6,10,'#876e50');r(8,92,47,2,'#8d7253');
      r(43,41,2,15,'#775b43');r(41,40,6,2,'#c0a47e');
    }
  };
  if(kind===0){if(biomeFor(track)==='desert')cactus();else if(biomeFor(track)==='coast')palm();else pine();}
  else if(kind===1){
    if(biomeFor(track)==='coast'){
      shadow();for(const[xx,yy,ww,hh]of [[8,80,13,11],[14,71,16,17],[24,65,17,24],[37,73,17,16],[29,79,29,12]]as const){p([[xx+3,yy],[xx+ww-3,yy],[xx+ww,yy+4],[xx+ww,yy+hh-3],[xx+ww-4,yy+hh],[xx+3,yy+hh],[xx,yy+hh-5],[xx,yy+4]],'#2d633f');r(xx+4,yy+2,ww-8,3,'#77a85c');r(xx+2,yy+5,3,4,'#4e8f4b');}r(14,91,40,2,'#194c34');
    }else rock(true);
  }else if(kind===2)building();
  else if(kind===3||kind===4||kind===5){
    shadow();r(16,53,4,40,'#b2afa0');r(19,53,2,40,'#52616a');r(44,53,4,40,'#b2afa0');r(47,53,2,40,'#52616a');
    r(3,26,58,31,'#1b2c35');r(5,28,54,27,kind===5?'#164d69':'#e7dcb7');r(6,29,52,1,'#fff0c8');r(5,54,54,1,'#a4a894');
    if(kind===5){r(15,33,10,17,'#eff2d4');r(23,33,10,3,'#eff2d4');r(29,36,4,6,'#eff2d4');r(23,42,10,3,'#eff2d4');r(35,40,4,3,'#d2dfa9');p([[40,35],[50,41],[40,47]],'#d2dfa9');}
    else {for(const center of kind===3?[19,37,55]:[9,27,45]){const dir=kind===3?-1:1;for(let yy=-9;yy<=9;yy++){const xx=center+dir*(9-Math.abs(yy));r(xx-3,41+yy,6,1,'#bd3c32');}}}
    r(13,92,10,2,'#5e6259');r(42,92,10,2,'#5e6259');
  }else if(kind===6){
    shadow();r(29,13,4,81,'#526271');r(30,15,1,77,'#aeb8b4');l(29,17,22,10,'#7a8b94',3);r(10,8,16,3,'#b9bdb2');r(8,10,17,4,'#364453');r(10,14,13,2,biomeFor(track)==='city'?'#ffe2a0':'#b2bbb0');r(28,90,7,4,'#77807e');
    if(biomeFor(track)==='city'){r(35,27,17,23,'#202d44');r(37,29,13,19,'#b04f65');r(40,32,3,13,'#e8b68d');r(43,32,4,3,'#e8b68d');r(43,37,4,3,'#e8b68d');r(33,27,3,2,'#a9a294');r(33,49,3,2,'#a9a294');}
  }else{
    shadow();r(10,60,4,33,'#746955');r(13,60,2,33,'#3b4b4c');r(49,60,4,33,'#746955');r(52,60,2,33,'#3b4b4c');r(1,27,62,36,'#182c3a');r(3,29,58,31,biomeFor(track)==='coast'?'#397b80':biomeFor(track)==='desert'?'#8a453c':'#45495f');r(4,30,56,1,'#d3b991');r(4,58,56,1,'#a8ada0');
    // Original racing-stripe / sunrise motif, deliberately no sponsor wordmark.
    r(9,36,11,11,'#e2bf78');r(7,39,15,5,'#e2bf78');for(let y=0;y<5;y++)r(10+y*2,51-y*3,9,2,'#f0dfb2');for(let y=0;y<5;y++)r(27+y*2,51-y*3,9,2,'#b8d9c4');r(47,35,8,17,'#1e3b49');r(49,37,4,4,'#e0dbbb');r(49,45,4,5,'#e0dbbb');
    r(7,92,12,2,'#47544d');r(47,92,11,2,'#47544d');
  }
}

/** Static obstacles use distinct widths/heights and a readable wheel-contact edge.
 * Geometry/collision extents are simulation definitions, not this alpha envelope. */
export function paintObstacle(c:CanvasRenderingContext2D,kind:ObstacleArtKind) {
  c.clearRect(0,0,c.canvas.width,c.canvas.height);c.imageSmoothingEnabled=false;
  const {rect:r,poly:p,line:l}=raster(c);r(11,58,43,3,'#172a30');
  if(kind==='cone'){
    p([[10,57],[16,53],[46,53],[55,57],[52,61],[12,61]],'#242e31');r(16,55,33,3,'#5b5041');p([[19,54],[28,23],[34,23],[45,54]],'#d26432');p([[23,53],[29,25],[31,25],[32,53]],'#f7a34a');p([[23,39],[39,39],[41,45],[21,45]],'#f1dec0');p([[27,28],[35,28],[37,33],[25,33]],'#f3dfb7');r(19,52,25,2,'#994b2e');r(29,23,5,2,'#ffd16b');
  }else if(kind==='barrel'){
    p([[17,26],[22,22],[42,22],[47,26],[47,53],[43,58],[21,58],[17,53]],'#8a4537');r(20,26,24,28,'#bd6947');r(22,27,5,27,'#e39a61');r(40,27,4,27,'#8e4a38');r(18,30,28,4,'#505758');r(18,47,28,4,'#505758');r(20,30,24,1,'#93948a');r(20,47,24,1,'#93948a');r(22,22,20,2,'#d79964');r(21,24,23,3,'#9f5b41');r(26,24,13,1,'#6a4b3b');r(22,55,19,2,'#6a4537');
  }else if(kind==='barrier'){
    p([[6,53],[10,34],[53,34],[58,53],[55,59],[9,59]],'#3f5155');r(11,36,42,14,'#e2be4d');r(11,37,42,2,'#f9df75');r(10,50,44,4,'#b7b69d');
    for(let y=39;y<49;y++)for(let x=11;x<53;x++)if((x+y)%17<8)r(x,y,1,1,'#222b31');
    r(10,54,46,3,'#617075');r(8,57,48,2,'#2e424a');r(17,29,3,6,'#d2b76f');r(45,29,3,6,'#d2b76f');r(16,28,5,3,'#f1aa4c');r(44,28,5,3,'#f1aa4c');
  }else{
    p([[9,54],[14,42],[24,29],[40,30],[52,42],[57,55],[50,60],[16,60]],'#696755');p([[12,53],[18,42],[25,31],[38,32],[32,40],[24,43],[21,55]],'#b7aa80');p([[25,47],[34,37],[40,34],[49,43],[50,55],[35,57]],'#938d6b');l(25,31,39,32,'#d2bd8d');l(18,43,24,43,'#d2bd8d');l(34,40,39,42,'#666b58');p([[33,57],[51,55],[54,53],[55,57],[49,59],[20,59]],'#51594e');
  }
}
