import {Pixels} from './pixels.mjs';

/** Original compact athletic cricket designs. All output is integer pixel data. */
export const P={outline:'#081724',deep:'#11283c',navy:'#183951',blue:'#2b5975',blueLit:'#407d99',cyan:'#47c4d5',cyanLit:'#91e0df',skin:'#d79b65',skinLit:'#f1c18a',skinShade:'#a96943',hair:'#302d29',white:'#e4eeeb',silver:'#b5d0d1',steel:'#7196a7',shoe:'#d9e5df',wood:'#d6b576',woodLit:'#f1d59b',woodShade:'#a7824f',amber:'#bd793d',amberLit:'#e4a862',amberShade:'#875332'};
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]],rad=a=>a*Math.PI/180;
const base={hip:[55,81],chest:[56,55],head:[58,32],nearKnee:[65,99],nearFoot:[70,117],farKnee:[45,99],farFoot:[41,117],grip:[58,72],bat:-110,turn:.35,rearHeel:0,blink:false};
const pose=(name,data={})=>({name,...structuredClone(base),...data});
// The blade sweeps through the bottom of the arc then rises. Angles are unwrapped:
// -325 is the same visible direction as +35, without reversing at contact.
export const BATTER=[
 pose('Guard'),
 pose('Grip adjustment',{grip:[59,71],head:[59,32],bat:-112}),
 pose('Ready',{hip:[55,82],chest:[56,56],grip:[58,70],bat:-114}),
 pose('Load stance',{hip:[54,83],chest:[55,56],head:[57,33],grip:[53,60],bat:-140}),
 pose('Crouch',{hip:[53,83],chest:[54,57],head:[57,33],grip:[52,60],bat:-148}),
 pose('Backlift',{hip:[54,82],chest:[55,55],head:[58,32],grip:[51,56],bat:-156}),
 pose('High backlift',{hip:[55,82],chest:[56,55],head:[60,32],grip:[47,59],bat:-165}),
 pose('Front stride',{hip:[57,81],chest:[59,55],head:[63,32],grip:[51,58],bat:-180,turn:.55}),
 pose('Downswing high',{hip:[58,81],chest:[61,55],head:[65,32],grip:[55,56],bat:-205,turn:.7}),
 pose('Downswing middle',{hip:[59,81],chest:[63,55],head:[65,32],grip:[67,69],bat:-270,turn:.9}),
 pose('Contact',{hip:[59,80],chest:[64,54],head:[65,32],grip:[75,68],bat:-325,turn:1}),
 pose('Extension',{hip:[60,80],chest:[65,54],head:[65,32],grip:[79,63],bat:-350,turn:1}),
 pose('Follow through low',{hip:[60,80],chest:[64,53],head:[65,32],grip:[78,53],bat:-378,turn:.85}),
 pose('Follow through high',{hip:[59,80],chest:[62,52],head:[64,31],grip:[72,44],bat:-408,turn:.6}),
 pose('Finish',{hip:[58,80],chest:[60,52],head:[62,31],grip:[64,43],bat:-438,turn:.4}),
 pose('Watch six',{hip:[58,80],chest:[59,53],head:[63,31],grip:[62,46],bat:-455,turn:.35}),
 pose('Relax finish',{hip:[58,81],chest:[59,54],head:[62,32],grip:[60,50],bat:-466}),
 pose('Lower bat high',{hip:[57,81],chest:[58,54],head:[61,32],grip:[58,55],bat:-480}),
 pose('Lower bat middle',{hip:[56,82],chest:[57,55],head:[60,32],grip:[57,61],bat:-484}),
 pose('Lower bat low',{hip:[56,82],chest:[56,56],head:[59,32],grip:[57,67],bat:-470}),
 pose('Recover',{hip:[55,82],chest:[56,56],head:[58,33],grip:[58,72],bat:-470}),
 pose('Settled',{head:[58,33]}),
 pose('Blink',{blink:true}),
 pose('Downswing quarter',{hip:[59,81],chest:[62,55],head:[65,32],grip:[63,67],bat:-235,turn:.8}),
 pose('Downswing before contact',{hip:[59,80],chest:[64,54],head:[65,32],grip:[72,69],bat:-300,turn:1}),
 pose('Front foot lift',{hip:[57,81],chest:[58,54],head:[61,32],grip:[58,55],bat:-480,nearFoot:[74,106],nearKnee:[68,92]}),
 pose('Front foot step back',{hip:[56,81],chest:[57,55],head:[60,32],grip:[57,61],bat:-484,nearFoot:[71,111],nearKnee:[66,95]}),
];
for(let i=7;i<=16;i++){BATTER[i].nearFoot=[76,109];BATTER[i].nearKnee=[69,94];BATTER[i].rearHeel=i>=9?3:1;}
for(const i of [23,24]){BATTER[i].nearFoot=[76,109];BATTER[i].nearKnee=[69,94];BATTER[i].rearHeel=3;}
// Recovery contains a lifted foot, a visible backward step and a planted settle.
BATTER[17].nearFoot=[76,109];BATTER[17].nearKnee=[69,94];
BATTER[18].nearFoot=[74,106];BATTER[18].nearKnee=[68,92];
BATTER[19].nearFoot=[71,111];BATTER[19].nearKnee=[66,95];
export const BATTER_KEYS=[[0,0],[17,1],[28,0],[96,2],[102,3],[108,4],[114,5],[119,6],[123,7],[126,8],[129,23],[130,9],[131,24],[132,10],[135,11],[139,12],[145,13],[152,14],[165,15],[183,16],[198,17],[209,25],[219,26],[230,19],[239,20],[253,21],[270,0],[315,22],[318,0],[360,0]];

const bb={hip:[56,81],chest:[56,55],head:[56,32],nearKnee:[62,100],nearFoot:[63,117],farKnee:[49,100],farFoot:[49,117],nearElbow:[72,68],nearHand:[69,81],farElbow:[40,68],farHand:[43,81],back:false,support:null};
const bp=(name,data={})=>({name,...structuredClone(bb),...data});
export const BOWLER=[
 bp('Ready'),
 bp('Run right plant',{chest:[57,54],head:[57,31],nearKnee:[63,99],nearFoot:[63,117],farKnee:[48,94],farFoot:[49,107],nearElbow:[70,64],nearHand:[65,52],farElbow:[42,67],farHand:[47,80],support:'near'}),
 bp('Run right drive',{hip:[57,80],chest:[58,53],head:[58,30],nearKnee:[62,99],nearFoot:[63,117],farKnee:[48,91],farFoot:[50,104],nearElbow:[71,62],nearHand:[65,49],farElbow:[42,66],farHand:[47,80],support:'near'}),
 bp('Run flight one',{hip:[57,79],chest:[58,52],head:[58,29],nearKnee:[62,95],nearFoot:[60,110],farKnee:[49,91],farFoot:[51,105],nearElbow:[70,63],nearHand:[65,51],farElbow:[42,65],farHand:[47,78]}),
 bp('Run crossing one',{hip:[57,80],chest:[58,53],head:[58,30],nearKnee:[63,93],nearFoot:[60,107],farKnee:[49,99],farFoot:[49,117],nearElbow:[71,64],nearHand:[67,77],farElbow:[41,63],farHand:[46,51],support:'far'}),
 bp('Run left plant',{chest:[57,54],head:[57,31],nearKnee:[64,92],nearFoot:[63,105],farKnee:[49,100],farFoot:[49,117],nearElbow:[71,67],nearHand:[67,80],farElbow:[41,63],farHand:[46,50],support:'far'}),
 bp('Run left drive',{hip:[57,80],chest:[58,53],head:[58,30],nearKnee:[65,91],nearFoot:[64,104],farKnee:[49,99],farFoot:[49,117],nearElbow:[72,66],nearHand:[67,80],farElbow:[42,61],farHand:[47,48],support:'far'}),
 bp('Run flight two',{hip:[57,79],chest:[58,52],head:[58,29],nearKnee:[64,94],nearFoot:[63,108],farKnee:[49,96],farFoot:[50,111],nearElbow:[71,65],nearHand:[67,78],farElbow:[42,62],farHand:[47,50]}),
 bp('Run crossing two',{hip:[57,80],chest:[58,53],head:[58,30],nearKnee:[63,99],nearFoot:[63,117],farKnee:[49,94],farFoot:[50,108],nearElbow:[71,63],nearHand:[66,51],farElbow:[42,66],farHand:[47,79],support:'near'}),
 bp('Gather arms',{hip:[56,80],chest:[56,53],head:[56,30],nearElbow:[70,48],nearHand:[61,36],farElbow:[42,48],farHand:[50,36],nearFoot:[63,117],farFoot:[49,113],support:'near'}),
 bp('Gather knee',{hip:[55,78],chest:[55,51],head:[55,28],nearKnee:[66,88],nearFoot:[70,102],farKnee:[48,99],farFoot:[48,117],nearElbow:[69,42],nearHand:[61,30],farElbow:[41,43],farHand:[47,31],support:'far'}),
 bp('Bound',{hip:[56,76],chest:[56,49],head:[56,26],nearKnee:[68,87],nearFoot:[73,103],farKnee:[46,96],farFoot:[42,110],nearElbow:[69,36],nearHand:[62,23],farElbow:[42,37],farHand:[48,24]}),
 bp('Front leg brace',{hip:[58,80],chest:[57,51],head:[57,28],nearKnee:[68,98],nearFoot:[73,117],farKnee:[46,98],farFoot:[40,110],nearElbow:[66,36],nearHand:[60,20],farElbow:[43,39],farHand:[40,24],support:'near'}),
 bp('Arm vertical',{hip:[59,80],chest:[58,51],head:[57,28],nearKnee:[68,98],nearFoot:[73,117],farKnee:[46,99],farFoot:[40,111],nearElbow:[65,34],nearHand:[63,17],farElbow:[42,49],farHand:[39,64],support:'near'}),
 bp('Release',{hip:[59,80],chest:[60,52],head:[60,29],nearKnee:[68,98],nearFoot:[73,117],farKnee:[46,100],farFoot:[40,112],nearElbow:[75,36],nearHand:[81,20],farElbow:[44,59],farHand:[49,73],support:'near'}),
 bp('Release extension',{hip:[60,81],chest:[63,54],head:[63,31],nearKnee:[68,98],nearFoot:[73,117],farKnee:[47,99],farFoot:[42,111],nearElbow:[81,45],nearHand:[94,35],farElbow:[47,65],farHand:[55,77],support:'near'}),
 bp('Follow across',{hip:[61,81],chest:[65,56],head:[65,33],nearKnee:[68,98],nearFoot:[73,117],farKnee:[45,96],farFoot:[39,108],nearElbow:[82,65],nearHand:[68,76],farElbow:[50,66],farHand:[59,78],support:'near'}),
 bp('Follow bent',{hip:[62,82],chest:[68,60],head:[68,37],nearKnee:[68,98],nearFoot:[73,117],farKnee:[45,94],farFoot:[35,101],nearElbow:[78,76],nearHand:[62,84],farElbow:[53,71],farHand:[63,83],support:'near'}),
 bp('Follow recovery',{hip:[61,81],chest:[64,55],head:[64,32],nearKnee:[67,99],nearFoot:[71,117],farKnee:[48,98],farFoot:[46,113],nearElbow:[79,67],nearHand:[73,81],farElbow:[49,67],farHand:[53,81]}),
 bp('Turn',{chest:[58,55],head:[59,32],nearElbow:[73,68],nearHand:[69,81],farElbow:[43,68],farHand:[47,81],back:true}),
 bp('Walk right',{nearKnee:[63,100],nearFoot:[63,117],farKnee:[49,96],farFoot:[49,110],nearElbow:[72,67],nearHand:[68,80],farElbow:[40,67],farHand:[44,80],back:true,support:'near'}),
 bp('Walk rise',{hip:[56,80],chest:[56,54],head:[56,31],nearKnee:[63,102],nearFoot:[63,120],farKnee:[49,96],farFoot:[49,111],nearElbow:[72,67],nearHand:[68,80],farElbow:[40,67],farHand:[44,80],back:true,support:'near'}),
 bp('Walk pass',{nearKnee:[62,97],nearFoot:[62,111],farKnee:[49,100],farFoot:[49,117],nearElbow:[72,68],nearHand:[68,81],farElbow:[40,66],farHand:[44,79],back:true,support:'far'}),
 bp('Walk left',{nearKnee:[62,96],nearFoot:[62,110],farKnee:[49,102],farFoot:[49,120],nearElbow:[72,66],nearHand:[68,79],farElbow:[40,68],farHand:[44,81],back:true,support:'far'}),
 bp('Walk crossing',{hip:[56,80],chest:[56,54],head:[56,31],nearKnee:[63,99],nearFoot:[63,117],farKnee:[49,97],farFoot:[49,113],nearElbow:[72,67],nearHand:[68,80],farElbow:[40,67],farHand:[44,80],back:true,support:'near'}),
 bp('Walk settle',{nearKnee:[63,101],nearFoot:[63,120],farKnee:[49,96],farFoot:[49,111],nearElbow:[72,67],nearHand:[68,80],farElbow:[40,67],farHand:[44,80],back:true,support:'near'}),
 bp('Face crease',{head:[57,32],nearHand:[68,81],farHand:[44,81]}),
];
export function batAnchors(p){const d=[Math.cos(rad(p.bat)),Math.sin(rad(p.bat))];return {grip:p.grip,face:add(p.grip,d.map(v=>v*27)),tip:add(p.grip,d.map(v=>v*43)),direction:d};}

/** Stable two-bone construction, baked at authoring time; never stretch a limb. */
function armElbow(shoulder,hand,side){
 const dx=hand[0]-shoulder[0],dy=hand[1]-shoulder[1],length=Math.hypot(dx,dy),bone=15;
 if(length>bone*2+.01)throw new Error(`Unreachable cricket grip: ${length.toFixed(2)}`);
 const h=Math.sqrt(Math.max(0,bone*bone-length*length/4)),n=length||1;
 return [(shoulder[0]+hand[0])/2-dy/n*h*side,(shoulder[1]+hand[1])/2+dx/n*h*side];
}
export function drawCharacter(kind,index,{distance=false,inspect=false}={}){
 const p=kind==='batter'?BATTER[index]:BOWLER[index],pad=kind==='batter'?16:0;
 // A fixed, separately simplified 45x52 sprite family. No per-frame size changes.
 const s=distance?.4:1,image=new Pixels(distance?45:144,distance?52:144);
 const armMask=inspect?new Pixels(image.w,image.h):null,bladeMask=kind==='batter'?new Pixels(image.w,image.h):null;
 let paintingArm=false;
 if(distance)image.ellipse(22,49,7,1,'#1b4d48');
 const pt=a=>[Math.round(a[0]*s),Math.round((a[1]+pad)*s)];
 const poly=(points,c)=>image.polygon(points.map(pt),c);
 const line=(a,b,width,c)=>image.line(pt(a),pt(b),Math.max(1,Math.round(width*s)),c);
 const rect=(x,y,w,h,c)=>image.rect(...pt([x,y]),Math.max(1,Math.round(w*s)),Math.max(1,Math.round(h*s)),c);
 const limb=(a,b,w1,w2,c,shade)=>{
  const dx=b[0]-a[0],dy=b[1]-a[1],n=Math.hypot(dx,dy)||1,normal=[-dy/n,dx/n];
  const q=(wa,wb)=>[add(a,normal.map(v=>v*wa/2)),add(b,normal.map(v=>v*wb/2)),add(b,normal.map(v=>-v*wb/2)),add(a,normal.map(v=>-v*wa/2))];
  poly(q(w1+2,w2+2),P.outline);poly(q(w1,w2),c);
  if(paintingArm&&armMask)armMask.polygon(q(w1+2,w2+2).map(pt),P.white);
  if(!distance&&shade)line(add(a,normal.map(v=>v*(w1/2-1))),add(b,normal.map(v=>v*(w2/2-1))),1,shade);
 };
 const chest=p.chest,hip=p.hip,head=p.head;
 const turn=kind==='batter'?p.turn:1,shoulders=[add(chest,[-8-4*turn-(kind==='batter'?6*(1-turn):0),0]),add(chest,[8+4*turn,0])];
 const leg=near=>{
  const knee=near?p.nearKnee:p.farKnee,foot=near?p.nearFoot:p.farFoot,h=add(hip,[near?6:-6,0]);
  const trouser=kind==='batter'?(near?P.white:P.silver):P.navy;
  limb(h,knee,12,9,trouser,kind==='batter'?P.steel:P.deep);limb(knee,add(foot,[0,-4]),9,7,trouser,P.deep);
  if(!distance)line(add(h,[near?2:-3,4]),add(knee,[near?2:-3,-3]),2,P.blue);
  const heel=!near?(p.rearHeel||0):0;
  poly([add(foot,[-5,-5-heel]),add(foot,[2,-5]),add(foot,[7,-1]),add(foot,[7,2]),add(foot,[-5,2-heel])],P.outline);
  poly([add(foot,[-4,-4-heel]),add(foot,[1,-4]),add(foot,[5,-1]),add(foot,[5,0]),add(foot,[-4,-heel])],kind==='batter'?P.navy:P.shoe);
  line(add(foot,[-4,1-heel]),add(foot,[6,1]),1,kind==='batter'?P.silver:P.steel);
  if(kind==='batter')line(add(foot,[-2,-2-heel/2]),add(foot,[2,-2]),2,P.blue);
  if(kind==='batter'){
   const a=add(knee,[0,-2]),b=add(foot,[0,-7]);limb(a,b,11,9,P.white,P.steel);
   line(add(a,[-2,2]),add(b,[-2,0]),2,P.silver);
   line(add(a,[-4,4]),add(a,[4,4]),2,P.steel);
   line(add(b,[-4,-2]),add(b,[4,-2]),1,P.steel);
   rect(a[0]+4,a[1]+6,2,2,P.deep);
  }
 };
 leg(false);leg(true);
 const kit=kind==='batter'?P.cyan:P.amber,shade=kind==='batter'?P.blue:P.amberShade;
 const body=[add(chest,[-6,-5]),add(chest,[5,-5]),add(shoulders[1],[2,0]),add(shoulders[1],[1,10]),add(hip,[10,0]),add(hip,[7,4]),add(hip,[-9,3]),add(shoulders[0],[-1,10]),add(shoulders[0],[-2,0])];
 poly(body.map(a=>add(a,[0,1])),P.outline);poly(body,kit);
 poly([add(shoulders[0],[1,1]),add(chest,[-6,-3]),add(hip,[-4,1]),add(hip,[-8,1])],shade);
 if(kind==='batter')poly([add(chest,[0,1]),add(chest,[7,3]),add(hip,[6,-2]),add(hip,[-1,-2])],P.cyanLit);
 else if(!p.back)poly([add(chest,[-5,0]),add(chest,[1,1]),add(hip,[0,-4]),add(hip,[-5,-3])],P.amberLit);
 line(add(hip,[-9,2]),add(hip,[9,2]),2,P.deep);
 rect(head[0]-3,head[1]+11,7,8,P.skinShade);
 poly([add(chest,[-6,-5]),add(chest,[0,-2]),add(chest,[5,-5]),add(chest,[7,-3]),add(chest,[0,1]),add(chest,[-7,-3])],P.deep);
 const hx=head[0]-(kind==='batter'?11:7),hy=head[1]-3;
 if(kind==='bowler'){
  poly([[hx+2,hy],[hx+11,hy],[hx+15,hy+4],[hx+15,hy+12],[hx+11,hy+17],[hx+4,hy+17],[hx,hy+12],[hx,hy+4]],P.outline);
  rect(hx+2,hy+2,11,12,P.skin);rect(hx+6,hy+3,7,8,P.skinLit);rect(hx+4,hy+13,8,2,P.skinShade);
  if(p.back){rect(hx+1,hy+1,13,11,P.hair);rect(hx+4,hy+12,8,3,P.skinShade);}
  else {rect(hx+4,hy+7,2,2,P.outline);rect(hx+11,hy+7,2,2,P.outline);if(!distance)rect(hx+8,hy+10,2,2,P.skinShade);}
 }
 if(kind==='batter'){
  // Broad helmet and a readable profile, inspired by the supplied retro batter.
  // Original clusters and equipment: no reference-image tracing or copied pixels.
  poly([[hx+7,hy+6],[hx+20,hy+6],[hx+21,hy+11],[hx+25,hy+13],[hx+24,hy+16],[hx+21,hy+16],[hx+20,hy+20],[hx+11,hy+20],[hx+7,hy+15]],P.outline);
  poly([[hx+9,hy+7],[hx+19,hy+7],[hx+19,hy+12],[hx+23,hy+13],[hx+23,hy+14],[hx+19,hy+15],[hx+18,hy+18],[hx+12,hy+18],[hx+9,hy+14]],P.skin);
  rect(hx+13,hy+8,6,5,P.skinLit);rect(hx+9,hy+13,3,4,P.skinShade);
  rect(hx+17,hy+10,2,p.blink?1:2,P.outline);rect(hx+19,hy+16,2,1,P.skinShade);
  poly([[hx-1,hy+8],[hx-1,hy+2],[hx+2,hy-3],[hx+7,hy-6],[hx+16,hy-6],[hx+22,hy-2],[hx+24,hy+4],[hx+24,hy+8],[hx+9,hy+10],[hx+7,hy+17],[hx+2,hy+15]],P.outline);
  poly([[hx+1,hy+6],[hx+1,hy+2],[hx+4,hy-2],[hx+8,hy-4],[hx+15,hy-4],[hx+20,hy-1],[hx+22,hy+4],[hx+21,hy+6],[hx+10,hy+7],[hx+7,hy+12],[hx+4,hy+11]],P.navy);
  poly([[hx+8,hy-3],[hx+14,hy-3],[hx+17,hy-1],[hx+14,hy+2],[hx+9,hy+1]],P.blue);
  line([hx+4,hy+7],[hx+25,hy+7],2,P.deep);line([hx+10,hy+8],[hx+25,hy+8],1,P.blueLit);
  rect(hx+6,hy+11,3,4,P.blue);
  // Fine lower grille leaves the eye, nose and warm face clusters unobscured.
  line([hx+25,hy+10],[hx+25,hy+21],1,P.steel);line([hx+9,hy+15],[hx+12,hy+21],1,P.steel);
  line([hx+12,hy+21],[hx+25,hy+21],1,P.silver);line([hx+11,hy+17],[hx+25,hy+17],1,P.silver);
 }else{
  poly([[hx,hy+6],[hx,hy+1],[hx+4,hy-2],[hx+11,hy-1],[hx+14,hy+2],[hx+14,hy+5],[hx+7,hy+3],[hx+2,hy+7]],P.hair);
 }
 const anchors={nearFoot:pt(p.nearFoot),farFoot:pt(p.farFoot)};
 if(kind==='batter'){
  const bodyCells=image.cells.slice();
  const a=batAnchors(p),d=a.direction,n=[-d[1],d[0]],at=v=>add(p.grip,d.map(x=>x*v));
  line(at(-9),at(10),4,P.outline);line(at(-8),at(9),2,P.deep);
  const blade=[add(at(8),n.map(v=>v*3)),add(at(39),n.map(v=>v*4)),add(at(43),n.map(v=>v*2)),add(at(43),n.map(v=>-v*2)),add(at(39),n.map(v=>-v*4)),add(at(8),n.map(v=>-v*3))];
  poly(blade.map(v=>add(v,[1,1])),P.outline);poly(blade,P.wood);
  if(bladeMask){bladeMask.polygon(blade.map(v=>add(v,[1,1])).map(pt),P.white);bladeMask.polygon(blade.map(pt),P.white);}
  line(add(at(12),n.map(v=>v*2)),add(at(39),n.map(v=>v*2)),2,P.woodLit);
  line(add(at(12),n.map(v=>-v*2)),add(at(39),n.map(v=>-v*2)),1,P.woodShade);
  line(at(18),at(22),4,P.blue);
  const hands=[at(-3),at(3)];
  anchors.shoulders=shoulders.map(pt);anchors.elbows=[];anchors.hands=hands.map(pt);
  paintingArm=true;
  shoulders.forEach((shoulder,i)=>{
   const hand=hands[i],elbow=armElbow(shoulder,hand,i===0?1:-1);anchors.elbows.push(pt(elbow));
   limb(shoulder,elbow,8,6,P.skin,P.skinShade);limb(elbow,hand,6,5,P.skin,P.skinShade);
   const sleeve=add(shoulder,[(elbow[0]-shoulder[0])*.35,(elbow[1]-shoulder[1])*.35]);
   line(shoulder,sleeve,9,P.cyan);line(sleeve,add(sleeve,[(elbow[0]-shoulder[0])*.05,(elbow[1]-shoulder[1])*.05]),7,P.deep);
   rect(hand[0]-3,hand[1]-3,7,7,P.outline);rect(hand[0]-2,hand[1]-2,5,5,P.white);rect(hand[0]-1,hand[1]-2,1,4,P.silver);
  });
  // During guard/backlift the blade is behind the shoulder and helmet. Gloves
  // and handle remain in front; the blade cannot paint across the player's body.
  if(index<=7||index>=17&&index<=22||index>=25){
   const grip=pt(p.grip);
   for(let n=0;n<image.cells.length;n++)if(bladeMask.cells[n]&&bodyCells[n]&&Math.hypot(n%image.w-grip[0],Math.floor(n/image.w)-grip[1])>11)image.cells[n]=bodyCells[n];
  }
  for(const key of ['grip','face','tip'])anchors[key]=[a[key][0],a[key][1]+pad];
 }else{
  [[p.farElbow,p.farHand],[p.nearElbow,p.nearHand]].forEach(([elbow,hand],i)=>{
   const shoulder=shoulders[i];limb(shoulder,elbow,7,5,P.skin,P.skinShade);limb(elbow,hand,5,4,P.skin,P.skinShade);
   line(shoulder,add(shoulder,[(elbow[0]-shoulder[0])*.35,(elbow[1]-shoulder[1])*.35]),8,kit);
   rect(hand[0]-2,hand[1]-2,4,4,P.skinLit);
  });
  anchors.release=pt(p.nearHand);
  if(index<14){const hand=pt(p.nearHand);image.rect(hand[0],hand[1]-1,distance?1:2,distance?1:2,P.white);}
 }
 return {image,anchors,pose:p,...(inspect?{armMask,bladeMask}:{})};
}
