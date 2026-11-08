/** Original pixel-cluster environment, inspired by observed landscape hierarchy.
 * No commercial pixels, lettering outlines or traced contours. Pending scene review.
 * Panorama 1024x140; props 64x96, ground contact [32,94]. */
export const HIROSHIMA_ART_VERSION = 'hiroshima-festival-original-1.1.0';
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

/** Original terraced sunset bands, low hills and gate silhouette. No traced contours. */
export function paintHiroshimaPanorama(c:CanvasRenderingContext2D,daylight=false){
  c.clearRect(0,0,1024,140);c.imageSmoothingEnabled=false;const {r,p}=tools(c);
  const bands=daylight?['#c95e12','#db7513','#eb8b14','#f49c18','#f6ae24','#f9bd32','#ffd044']:['#160704','#280805','#440b06','#650e07','#86170a','#ac280d','#c94310'];
  for(let i=0;i<7;i++)r(0,i*20,1024,20,bands[i]);
  // Original stepped cloud banks, distinct from the commercial cloud contours.
  for(const [x,y,w]of [[-30,39,176],[134,55,128],[329,38,190],[565,55,171],[777,40,188],[962,50,110]]){
    p([[x,y+10],[x+16,y+8],[x+27,y+3],[x+48,y],[x+73,y+3],[x+85,y+7],[x+w-48,y+8],[x+w-30,y+3],[x+w-8,y+8],[x+w,y+15],[x+w,y+20],[x,y+20]],daylight?'#bc5d16':'#531007');
    r(x+31,y+6,31,2,daylight?'#d87817':'#7b1b0a');r(x+92,y+13,27,2,daylight?'#d87817':'#7b1b0a');
  }
  // Banded sun, positioned outside the screen's minimap/speed rectangles.
  // 13x24 native hold becomes approximately 13x12 in the 1024x68 panorama plane.
  // Deliberate source-led display proportions; no source pixels or contour tracing.
  p([[516,55],[521,55],[524,59],[525,64],[525,71],[523,76],[520,79],[516,79],[513,75],[512,70],[512,62],[514,58]],daylight?'#ffe589':'#c89a32');
  r(515,57,7,2,daylight?'#fff1ac':'#e6b94f');r(512,64,13,2,daylight?'#ffdc73':'#c18a26');r(513,70,11,2,daylight?'#f8c04d':'#af6b19');r(516,76,5,2,daylight?'#dc9430':'#8f4311');
  const far=daylight?'#7d5d25':'#24100c',near=daylight?'#50461e':'#110d0b';
  p([[0,123],[58,115],[106,120],[151,111],[199,115],[245,108],[299,114],[350,121],[401,113],[450,119],[500,113],[550,121],[604,112],[657,118],[713,110],[763,113],[810,122],[866,115],[916,119],[971,113],[1024,123],[1024,140],[0,140]],far);
  p([[0,133],[77,128],[137,134],[207,127],[263,132],[334,128],[402,135],[477,128],[549,134],[616,129],[686,134],[748,128],[816,134],[881,128],[956,134],[1024,133],[1024,140],[0,140]],near);
  // Original torii cluster and its reflection-free ground silhouette.
  for(const [x,y,s]of [[467,84,1],[849,106,.6]]as const){
    const rr=(xx:number,yy:number,w:number,h:number)=>r(x+xx*s,y+yy*s,w*s,h*s,near);
    rr(10,12,5,39);rr(49,12,5,39);rr(5,21,54,5);rr(0,9,64,5);rr(-5,4,13,6);rr(57,4,12,6);rr(7,12,50,4);rr(27,14,8,11);rr(8,49,10,3);rr(46,49,10,3);
  }
  for(let i=0;i<200;i++){const x=(i*97+13)%1024,y=91+(i*23)%27;r(x,y,1+i%2,1,daylight?'#df8a22':'#a52a0c');}
}

/** 0 lamp, 1 gate, 2 rock, 3 left chevron, 4 right, 5 pit, 6 original billboard, 7 festival banner. */
export function paintHiroshimaProp(c:CanvasRenderingContext2D,kind:number){
  c.clearRect(0,0,64,96);c.imageSmoothingEnabled=false;const {r,p,l}=tools(c);
  r(15,92,37,2,'#132019');r(23,94,21,1,'#132019');
  if(kind===0){
    r(30,10,4,84,'#30343a');r(30,11,1,81,'#a8b5ac');r(32,12,1,80,'#667c7a');r(29,91,7,3,'#5d6968');
    p([[28,12],[31,7],[44,7],[48,11],[48,14],[44,13],[43,10],[33,10],[31,13]],'#8a9a97');r(38,11,13,5,'#3b464a');r(40,11,10,2,'#bdc3ac');r(41,15,8,2,'#ffdc85');r(42,17,6,1,'#b89e61');
  }else if(kind===1){
    r(12,32,6,61,'#532b23');r(47,32,6,61,'#532b23');r(13,35,2,55,'#b66b43');r(48,35,2,55,'#b66b43');r(10,89,10,5,'#30352c');r(45,89,10,5,'#30352c');
    p([[2,20],[9,23],[55,23],[62,20],[60,29],[53,32],[10,32],[4,29]],'#3b2420');r(9,25,47,3,'#b4653d');r(7,30,51,3,'#713d2b');r(8,43,48,6,'#74432f');r(10,43,45,2,'#bf7a48');r(29,32,7,12,'#774d30');r(30,34,4,7,'#cab172');
  }else if(kind===2){
    p([[11,91],[17,76],[29,69],[43,74],[53,86],[54,93]],'#333e40');p([[14,88],[20,77],[29,72],[38,75],[30,82],[26,90]],'#7f8781');p([[31,83],[40,77],[49,87],[49,92],[30,92]],'#576564');l(26,73,37,75,'#a9afa0');
  }else if(kind===3||kind===4){
    r(17,49,3,45,'#6f8382');r(46,49,3,45,'#6f8382');r(18,51,1,41,'#c5d0bb');r(47,51,1,41,'#c5d0bb');
    r(2,25,60,29,'#26343a');r(4,27,56,25,'#e9e1bf');r(5,28,54,1,'#fff5d4');r(4,50,56,2,'#72837a');
    for(const center of [14,32,50])for(let y=-8;y<=8;y++){const dir=kind===3?-1:1;r(center+dir*(8-Math.abs(y))-3,39+y,5,1,'#ce3526');}
  }else if(kind===5){
    r(15,51,3,43,'#76867b');r(46,51,3,43,'#76867b');r(3,29,58,29,'#252d32');r(5,31,54,25,'#d5ac29');r(6,32,52,2,'#ffe37c');
    r(12,36,4,15,'#31372e');r(16,36,7,3,'#31372e');r(20,39,3,5,'#31372e');r(16,43,7,3,'#31372e');r(27,36,3,15,'#31372e');r(34,36,15,3,'#31372e');r(40,39,3,12,'#31372e');
  }else if(kind===6){
    r(9,56,3,38,'#575b6a');r(51,56,3,38,'#575b6a');r(1,28,62,31,'#29364d');r(3,30,58,27,'#dde1d5');r(5,32,54,23,'#334fa8');r(6,33,52,1,'#6f8ed3');
    // Original unlettered sunrise/stripe motif, no commercial sponsor identity.
    r(10,38,9,9,'#f7e1a3');r(8,41,13,3,'#f7e1a3');for(let i=0;i<4;i++)r(25+i*3,48-i*4,18,2,'#e8e7c7');r(8,52,47,1,'#97b1ce');
  }else{
    r(17,10,3,84,'#5e6960');r(18,11,1,80,'#bdc4a8');r(19,11,34,2,'#a8afa0');r(49,11,2,58,'#e3d3a1');
    p([[22,14],[49,14],[49,71],[36,65],[22,71]],'#e8d2a1');r(24,16,8,47,'#2f567e');r(34,16,12,47,'#cf552e');
    for(let i=0;i<4;i++){const yy=20+i*11;p([[35,yy],[41,yy-3],[46,yy],[41,yy+4]],'#f0bd51');r(26,yy-2,4,5,'#e4ddb7');}
    l(23,68,35,63,'#b1a47e');l(36,63,48,68,'#b1a47e');
  }
}
