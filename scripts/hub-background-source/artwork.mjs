// Original background dioramas: game-card material language, new compositions.
const n=v=>Math.round(v*100)/100;
const points=v=>v.map(([x,y])=>`${n(x)},${n(y)}`).join(' ');
const poly=(v,fill,opacity=1)=>`<polygon points="${Array.isArray(v)?points(v):v}" fill="${fill}" opacity="${opacity}"/>`;
const path=(d,fill,opacity=1)=>`<path d="${d}" fill="${fill}" opacity="${opacity}"/>`;
const line=(d,c='M_PALE',w=3,a=1)=>`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-opacity="${a}" stroke-linejoin="round"/>`;
const ellipse=(x,y,rx,ry,c,a=1)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c}" opacity="${a}"/>`;
const group=(body,x=0,y=0,s=1,r=0)=>`<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})">${body}</g>`;

function platform(v,top,side,depth=28) {
  const lower=v.map(([x,y])=>[x,y+depth]);
  return ellipse(650,827,560,83,'M_SHADOW',.7)+poly([...v,...lower.slice().reverse()],side)+poly(v,top)+poly([v[2],v[3],lower[3],lower[2]],side);
}
function court(top,side) {
  const v=[[75,590],[655,310],[1180,580],[600,900]];
  const project=(u,t)=>[v[0][0]*(1-u)*(1-t)+v[1][0]*u*(1-t)+v[2][0]*u*t+v[3][0]*(1-u)*t,v[0][1]*(1-u)*(1-t)+v[1][1]*u*(1-t)+v[2][1]*u*t+v[3][1]*(1-u)*t];
  const mark=(arr,w=3,a=.65)=>line('M'+arr.map(q=>points([project(...q)])).join('L'),'M_PALE',w,a);
  const rect=(u,t,w,h)=>mark([[u,t],[u+w,t],[u+w,t+h],[u,t+h],[u,t]]);
  const circle=(u,t,r)=>mark(Array.from({length:65},(_,i)=>[u+r*Math.cos(i*Math.PI/32),t+r*Math.sin(i*Math.PI/32)]));
  return {body:platform(v,top,side),project,mark,rect,circle};
}
function footballBall() {
  return ellipse(7,108,116,21,'M_SHADOW',.65)+'<circle r="100" fill="M_PALE"/>'
    +path('M22,-98 A100,100 0 0 1 52,85 Q76,16 22,-98','M_STEEL')
    +path('M-84,30 Q-28,91 52,85 A100,100 0 0 1 -84,30','M_STEEL',.5)
    +poly('-16,-43 28,-32 42,12 5,42 -34,15','M_INK')
    +poly('-91,-40 -64,-68 -45,-47 -55,-8 -96,-2','M_INK')
    +poly('27,-96 61,-78 70,-52 42,-48 18,-71','M_INK')
    +poly('96,-26 98,25 75,46 62,15 75,-14','M_INK')
    +poly('-48,80 -14,61 23,76 20,98 -14,99','M_INK')
    +line('M-16,-43 L-45,-47 M28,-32 L42,-48 M42,12 L62,15 M5,42 L-14,61 M-34,15 L-55,-8','M_INK',4,.65)
    +path('M-72,-42 Q-47,-83 -13,-81 Q-42,-65 -55,-37 Z','M_PALE',.7);
}
function basketballBall() {
  return ellipse(8,112,115,22,'M_SHADOW',.7)+'<circle r="103" fill="M_ORANGE"/>'
    +path('M20,-101 A103,103 0 0 1 57,86 Q88,10 20,-101','M_ORANGE_DEEP')
    +path('M-86,35 Q-34,98 57,86 A103,103 0 0 1 -86,35','M_ORANGE_DEEP',.6)
    +line('M-103,0 H103 M0,-103 V103 M-74,-71 Q36,0 -74,71 M74,-71 Q-36,0 74,71','M_INK',5,.8)
    +path('M-76,-33 Q-59,-72 -24,-81 L-40,-49 Z','M_WOOD_LIGHT',.4);
}
function cricketBall() {
  return ellipse(6,95,98,17,'M_SHADOW',.7)+'<circle r="86" fill="M_RED"/>'
    +path('M9,-85 A86,86 0 0 1 44,74 Q64,5 9,-85','M_RED_DEEP')
    +line('M-25,-82 Q25,0 -25,82 M-12,-85 Q38,0 -12,85','M_PALE',3,.85)
    +Array.from({length:12},(_,i)=>{const y=-69+i*12;return line(`M${n(3+17*Math.cos(y/95))},${y} l9,-3`,'M_PALE',2,.6);}).join('')
    +path('M-56,-38 Q-40,-67 -15,-71 L-27,-50 Z','M_PALE',.24);
}
function tennisBall() {
  return ellipse(4,87,86,16,'M_SHADOW',.6)+'<circle r="78" fill="M_LIME"/>'
    +path('M17,-76 A78,78 0 0 1 41,66 Q66,3 17,-76','M_TURF_LIGHT')
    +line('M-46,-62 Q28,0 -46,62 M50,-59 Q-27,0 50,59','M_PALE',5,.8)
    +path('M-52,-27 Q-30,-61 -8,-60 L-29,-36 Z','M_PALE',.3);
}
function goal(project) {
  // The posts share the actual u=.95 end line. Net depth extends OUTSIDE
  // the field; its top, sides and mesh use the same court projection.
  const at=(t,z,back=false)=>{const [x,y]=project(back?1.07:.95,.36+.28*t);return [x,y-126*z];};
  const edge=vertices=>'M'+vertices.map(q=>points([q])).join('L');
  let b=poly([at(0,0,true),at(1,0,true),at(1,1,true),at(0,1,true)],'M_COURT_DEEP');
  b+=poly([at(0,1),at(1,1),at(1,1,true),at(0,1,true)],'M_COURT',.8);
  b+=poly([at(1,0),at(1,0,true),at(1,1,true),at(1,1)],'M_COURT_DEEP',.8);
  for(let i=0;i<=10;i++){
    b+=line(edge([at(i/10,0,true),at(i/10,1,true)]),'M_STEEL',1.5,.4);
    b+=line(edge([at(i/10,1),at(i/10,1,true)]),'M_STEEL',1.5,.4);
  }
  for(let i=0;i<=6;i++)b+=line(edge([at(0,i/6,true),at(1,i/6,true)]),'M_STEEL',1.5,.4);
  b+=line(edge([at(0,0,true),at(0,1,true),at(1,1,true),at(1,0,true)]),'M_STEEL',5,.9);
  b+=line(edge([at(0,1),at(0,1,true)])+edge([at(1,1),at(1,1,true)]),'M_STEEL',6);
  const front=edge([at(0,0),at(0,1),at(1,1),at(1,0)]);
  return b+line(front,'M_STEEL',12)+line(front,'M_PALE',8).replace('<path ','<path data-goal-mouth="true" ');
}
function stand() {
  let b=poly('130,397 623,159 1094,353 1094,399 636,236 130,467','M_INK');
  for(let t=0;t<4;t++)b+=poly([[140,397-t*22],[626,161-t*22],[1090,353-t*22],[1090,367-t*22],[627,182-t*22],[140,417-t*22]],t%2?'M_COURT_DEEP':'M_SLATE');
  for(const [x,y]of [[262,164],[920,158]]){
    b+=poly([[x,y],[x+8,y-3],[x+8,y+178],[x,y+181]],'M_STEEL',.6);
    b+=poly([[x-41,y-20],[x+54,y-20],[x+54,y+18],[x-41,y+18]],'M_SLATE');
    for(let i=0;i<4;i++)b+=poly([[x-33+i*21,y-13],[x-18+i*21,y-13],[x-18+i*21,y+9],[x-33+i*21,y+9]],'M_PALE',.65);
  }
  return group(b,0,70);
}
function football() {
  const c=court('M_TURF','M_TURF_DEEP');let b=stand()+c.body;
  for(let i=0;i<8;i++)if(i%2===0)b+=poly([c.project(i/8,0),c.project((i+1)/8,0),c.project((i+1)/8,1),c.project(i/8,1)],'M_TURF_LIGHT',.24);
  b+=c.rect(.05,.06,.9,.88).replace('<path ','<path data-pitch-boundary="true" ')+c.mark([[.5,.06],[.5,.94]])+c.circle(.5,.5,.13)+c.rect(.05,.25,.15,.5)+c.rect(.8,.25,.15,.5);
  b+=c.rect(.89,.37,.06,.26);
  return b+goal(c.project)+group(footballBall(),413,740,1.28,-18);
}
function bat() {
  return path('M-16,-160 H16 V-53 L43,-25 V168 L29,196 H-29 L-43,168 V-25 L-16,-53 Z','M_CLAY_LIGHT')
    +path('M11,-45 L43,-25 V168 L29,196 H8 V-29 Z','M_CLAY')
    +path('M-43,-25 L-27,-31 V158 L-11,183 H-29 L-43,168 Z','M_PALE',.55)
    +path('M-16,-160 H16 V-54 H-16 Z','M_INK')
    +Array.from({length:7},(_,i)=>line(`M-16,${-148+i*12} H16`,'M_STEEL',3,.65)).join('')
    +poly('-20,28 23,25 23,52 -20,57','M_TURF_DEEP');
}
function cricket() {
  const c=court('M_TURF','M_TURF_DEEP');let b=c.body+ellipse(624,592,366,157,'M_TURF_LIGHT',.24);
  b+=platform([[410,643],[676,424],[850,512],[566,744]],'M_CLAY','M_CLAY_DEEP',12);
  b+=line('M432,637 L583,713 M653,460 L810,539','M_PALE',5,.65)+poly('647,461 687,425 810,484 768,522','M_CLAY_LIGHT',.25);
  for(const x of [688,725,762])b+=path(`M${x},274 h12 v244 h-12 Z`,'M_CLAY_LIGHT')+path(`M${x+8},274 h5 v244 h-5 Z`,'M_CLAY')+ellipse(x+6,520,9,4,'M_CLAY_DEEP');
  return b+path('M680,267 H779 V279 H680 Z','M_CLAY_LIGHT')+group(bat(),420,503,1.06,27)+group(cricketBall(),886,675,.93,-22);
}
function hoop() {
  return ellipse(14,406,76,18,'M_SHADOW',.7)+poly('-3,61 21,56 21,405 -3,415','M_STEEL')+poly('13,59 23,57 23,405 13,410','M_SLATE')
    +poly('-157,-110 143,-110 160,-94 160,78 -157,78','M_STEEL')+poly('-157,-110 143,-110 143,62 -157,62','M_PALE')
    +poly('-141,-93 127,-93 127,45 -141,45','M_COURT_LIGHT',.24)+path('M-60,-33 H51 V42 H-60 Z','M_ORANGE')+path('M-51,-24 H42 V42 H-51 Z','M_PALE')
    +ellipse(-3,85,91,23,'M_ORANGE_DEEP')+poly('-84,85 72,86 46,172 -50,172','M_INK',.8)
    +Array.from({length:7},(_,i)=>line(`M${-75+i*23},88 L${-44+i*14},168`,'M_STEEL',3,.6)).join('')
    +line('M-72,113 H68 M-62,140 H58 M-51,170 H46','M_STEEL',3,.5)+'<ellipse cx="-3" cy="80" rx="91" ry="23" fill="none" stroke="M_ORANGE" stroke-width="10"/>';
}
function basketball() {
  const c=court('M_WOOD','M_WOOD_DEEP');let b=c.body;
  for(let i=1;i<13;i++)b+=c.mark([[i/13,0],[i/13,1]],2,.13);
  b+=poly([c.project(.4,.06),c.project(.92,.06),c.project(.92,.9),c.project(.4,.9)],'M_WOOD_LIGHT',.25);
  b+=c.rect(.05,.06,.9,.88)+c.rect(.67,.32,.28,.36)+c.circle(.67,.5,.14);
  b+=c.mark(Array.from({length:49},(_,i)=>[.91-.51*Math.sin(Math.PI*i/48),.5+.41*Math.cos(Math.PI*i/48)]));
  return b+group(hoop(),806,277,.73)+group(basketballBall(),416,717,1.33,-18);
}
function racingCar() {
  let b=ellipse(5,125,167,49,'M_SHADOW',.75);
  for(const [x,y]of [[-132,-99],[87,-99],[-141,79],[94,79]])b+=path(`M${x},${y} h48 v83 h-48 Z`,'M_RUBBER')+path(`M${x+4},${y+5} h7 v73 h-7 Z`,'M_SLATE');
  b+=line('M-110,-45 H111 M-117,111 H118','M_STEEL',10,.8)
    +poly('-27,-179 27,-179 47,-51 85,-1 66,111 27,149 -27,149 -66,111 -85,-1 -47,-51','M_RED')
    +poly('0,-179 27,-179 47,-51 85,-1 66,111 27,149 0,149','M_RED_DEEP')
    +poly('-23,-160 -7,-160 -7,-56 -29,-28','M_PALE',.88)+poly('-32,-39 -23,26 23,26 32,-39 12,-64 -12,-64','M_INK')
    +poly('-12,-48 12,-48 20,-30 14,8 -14,8 -20,-30','M_STEEL')+path('M-103,-179 H103 V-153 H-103 Z','M_STEEL')
    +path('M-126,142 H126 V170 H-126 Z','M_SLATE')+poly('-126,142 -126,153 126,153 126,142','M_STEEL')
    +poly('-65,13 -41,25 -47,97 -66,110','M_PALE',.55);
  return b;
}
function motorsport() {
  const origin=[-65,710],along=[937,-460],across=[351,160];
  const project=(u,v)=>[origin[0]+along[0]*u+across[0]*v,origin[1]+along[1]*u+across[1]*v];
  const asphalt=[project(.05,.1),project(.95,.1),project(.95,.9),project(.05,.9)];
  let b=platform([project(0,0),project(1,0),project(1,1),project(0,1)],'M_SLATE','M_INK',36)+poly(asphalt,'M_RUBBER');
  const edges=`M${points(asphalt.slice(0,2)).replaceAll(' ','L')} M${points([asphalt[3],asphalt[2]]).replaceAll(' ','L')}`;
  b+=line(edges,'M_STEEL',7,.55).replace('<path ','<path data-road-edges="true" ');
  for(let i=0;i<13;i++){
    const u=.05+i*.9/13,next=.05+(i+1)*.9/13;
    b+=poly([project(u,.065),project(next,.065),project(next,.1),project(u,.1)],i%2?'M_PALE':'M_RED');
  }
  for(let r=0;r<3;r++)for(let c=0;c<7;c++)if((r+c)%2===0){
    const u=.81+r*.025,v=.14+c*.103;
    b+=poly([project(u,v),project(u+.025,v),project(u+.025,v+.103),project(u,v+.103)],'M_PALE',.65);
  }
  // Map BOTH car axes into the road plane: local X spans its width and
  // local -Y points forwards. Rotating in screen space leaves tyres skewed.
  const width=.68/284,length=.4/349,centre=project(.58,.5);
  const matrix=[across[0]*width,across[1]*width,-along[0]*length,-along[1]*length,...centre].map(value=>Math.round(value*1e6)/1e6).join(' ');
  return b+`<g data-racing-car="true" transform="matrix(${matrix})">${racingCar()}</g>`+poly('987,252 1080,204 1160,243 1067,295','M_SLATE')+poly('987,252 1067,295 1067,318 987,275','M_INK')+line('M1042,235 L1093,261','ACCENT',8,.6);
}
function racket() {
  let b='<ellipse cx="6" cy="5" rx="92" ry="132" fill="M_COURT_DEEP"/><ellipse rx="92" ry="132" fill="none" stroke="M_TURF_DEEP" stroke-width="17"/><ellipse cx="-4" cy="-5" rx="92" ry="132" fill="none" stroke="ACCENT" stroke-width="13"/>';
  for(let x=-60;x<=60;x+=20){const y=112*Math.sqrt(1-x*x/6400);b+=line(`M${x},${-y} V${y}`,'M_PALE',2,.5);}
  for(let y=-100;y<=100;y+=20){const x=81*Math.sqrt(1-y*y/15129);b+=line(`M${-x},${y} H${x}`,'M_PALE',2,.5);}
  b+=poly('-42,120 -17,190 17,190 42,120 20,137 0,168 -20,137','M_STEEL')+path('M-16,184 H16 V304 H-16 Z','M_CLAY_DEEP')+path('M-16,184 H-7 V304 H-16 Z','M_CLAY_LIGHT');
  for(let y=198;y<300;y+=16)b+=line(`M-16,${y} l32,-6`,'M_STEEL',3,.65);
  return b;
}
function tennis() {
  const c=court('M_COURT','M_COURT_DEEP');let b=c.body+c.rect(.06,.07,.88,.86)+c.rect(.06,.19,.88,.62);
  b+=c.mark([[.28,.19],[.28,.81],[.72,.81],[.72,.19],[.28,.19],[.28,.5],[.72,.5]]);
  const a=c.project(.5,.02),z=c.project(.5,.98);
  b+=poly([[a[0],a[1]-140],[z[0],z[1]-140],z,a],'M_INK');
  for(let i=0;i<19;i++){const x=a[0]+(z[0]-a[0])*i/18,y=a[1]+(z[1]-a[1])*i/18;b+=line(`M${n(x)},${n(y-140)} V${n(y)}`,'M_STEEL',2,.3);}
  for(let i=0;i<5;i++)b+=line(`M${n(a[0])},${n(a[1]-i*32)} L${n(z[0])},${n(z[1]-i*32)}`,'M_STEEL',2,.3);
  b+=line(`M${n(a[0])},${n(a[1]-140)} L${n(z[0])},${n(z[1]-140)}`,'M_PALE',7,.8);
  return b+group(racket(),435,425,.92,-30)+group(tennisBall(),932,537,.98,-20);
}
function card(body,x,y,r=0) {
  return group(poly('-106,-156 -88,-174 110,-174 110,148 92,166 -106,166','M_INK')+poly('-115,-168 -97,-186 101,-186 101,136 83,154 -115,154','M_SLATE')+poly('-104,-157 -87,-174 90,-174 90,124 73,141 -104,141','M_COURT_DEEP')+body+path('M-82,91 H63 V101 H-82 Z M-82,112 H12 V119 H-82 Z','M_STEEL',.45),x,y,1,r);
}
function trending() {
  let b=platform([[62,650],[646,362],[1180,650],[595,968]],'M_COURT_DEEP','M_INK',38)+poly('94,650 646,378 1141,650 595,943','M_COURT')+poly('100,650 650,389 892,519 347,790','M_COURT_LIGHT',.35);
  b+=card(group(footballBall(),0,-43,.55),400,407,-19)+card(group(basketballBall(),0,-43,.55),840,405,17);
  b+=poly('514,158 730,158 757,185 757,517 730,544 514,544 487,517 487,185','M_INK')+poly('507,145 723,145 750,172 750,504 723,531 507,531 480,504 480,172','M_COURT_LIGHT')+poly('512,161 717,161 734,178 734,497 717,514 512,514 496,497 496,178','M_COURT_DEEP');
  b+=poly('575,255 575,406 685,330','ACCENT')+poly('575,406 685,330 685,349 575,424','M_COURT')+path('M529,455 H704 V466 H529 Z M529,480 H639 V488 H529 Z','M_STEEL',.65);
  b+=group(footballBall(),418,792,.78,-15)+group(tennisBall(),934,727,.62,22);
  return b+poly('583,700 759,616 849,662 677,756','M_SLATE')+poly('583,700 677,756 677,779 583,724','M_INK')+poly('677,756 849,662 849,687 677,779','M_COURT_DEEP')+poly('611,698 753,631 817,663 677,736','ACCENT',.5);
}
export const scenes={trending,football,cricket,basketball,motorsport,tennis};
export function artwork(theme,format,width,height,palette) {
  const scale=format==='portrait'?.8:1.1,x=format==='portrait'?width-760:width-1320,y=format==='portrait'?125:60;
  const defs='<defs><linearGradient id="bed" x1="0" y1="0" x2="1" y2="1"><stop stop-color="BASE"/><stop offset=".6" stop-color="SURFACE"/><stop offset="1" stop-color="BASE"/></linearGradient><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="BASE" stop-opacity=".28"/><stop offset=".38" stop-color="BASE" stop-opacity="0"/><stop offset="1" stop-color="BASE" stop-opacity=".65"/></linearGradient></defs>';
  const bounds=`M0,0H${width}V${height}H0Z`;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${defs}${path(bounds,'url(#bed)')}<g transform="translate(${x} ${y}) scale(${scale})" opacity=".48">${scenes[theme]()}</g>${path(bounds,'url(#shade)')}</svg>\n`;
  return svg.replace(/\b(?:BASE|SURFACE|EDGE|ACCENT|M_[A-Z_]+)\b/g,role=>{if(!palette[role])throw Error(`Missing illustration material ${role}`);return palette[role];});
}
