/** Final Over pixel scene. All art is authored cells; references are never runtime assets. */
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Pixels,fixed,shapes,svg} from './pixels.mjs';
import {BATTER,BATTER_KEYS,BOWLER,drawCharacter} from './characters.mjs';
export const WIDTH=192,HEIGHT=256,FRAMES=360,FPS=30;
export const PITCH_CENTER=98;
export const WICKETS=[{x:PITCH_CENTER-2,y:124,h:10,spacing:2},{x:PITCH_CENTER-4,y:236,h:23,spacing:4}];
export const pitchHalfWidth=y=>14+(y-112)*60/132;
const edge=(y,side,inset=0)=>Math.round(PITCH_CENTER+side*(pitchHalfWidth(y)-inset));
export const C={bg:'#0d111a',sky:'#081925',sky2:'#0b2130',stand:'#102a38',stand2:'#173747',rail:'#28495a',crowd:'#37606c',turf:'#0d393b',stripe:'#124344',pitch:'#8e8153',pitchLit:'#a19563',pitchShade:'#706443',crease:'#ddd8aa',lamp:'#bcebf0',cyan:'#50baca'};
const round=p=>p.map(Math.round),lerp=(a,b,t)=>a+(b-a)*t;
export function batterAt(frame){return BATTER_KEYS.findLast(([at])=>at<=frame)[1];}
export const RUN_KEYS=[[30,1],[35,2],[40,3],[44,4],[48,5],[52,6],[56,7],[59,8],[62,1],[66,2],[70,3],[73,4],[77,5],[81,6],[85,7],[88,8],[91,1],[94,2]];
function rawBowlerAt(frame){
 let pose=0,ground=114;
 if(frame>=30&&frame<96){pose=RUN_KEYS.findLast(([at])=>at<=frame)[1];ground=114+Math.round(17*((frame-30)/66)**1.15);}
 else if(frame>=96&&frame<160){const keys=[[96,9],[100,10],[104,11],[109,12],[112,13],[114,14],[118,15],[123,16],[130,17],[141,18]];pose=keys.findLast(([at])=>at<=frame)[1];ground=131;}
 else if(frame>=160&&frame<186){pose=19;ground=131;}
 else if(frame>=186&&frame<282){pose=20+Math.floor((frame-186)/6)%6;ground=131-Math.round(17*(frame-186)/96);}
 else if(frame>=282&&frame<294){pose=19;}
 else if(frame>=294&&frame<306){pose=26;}
 return {pose,scale:1,pos:[76,ground-47]};
}
// Authoring-time foot locking. Sprite sizes never change; planted shoes share a
// world anchor while the body advances through the stride. Nothing runs in-app.
const bowlerSamples=[];let planted=null;
for(let frame=0;frame<=360;frame++){
 const sample=rawBowlerAt(frame),pose=BOWLER[sample.pose],support=pose.support;
 if(support){
  const a=drawCharacter('bowler',sample.pose,{distance:true}).anchors[`${support}Foot`];
  if(!planted||planted.side!==support)planted={side:support,point:a.map((v,i)=>v+sample.pos[i])};
  sample.pos=planted.point.map((v,i)=>v-a[i]);sample.planted={side:support,point:[...planted.point]};
 }else planted=null;
 bowlerSamples.push(sample);
}
export function bowlerAt(frame){return bowlerSamples[Math.max(0,Math.min(360,Math.floor(frame)))];}
export const BATTER_POSITION=[8,96];
const bowlerRelease=()=>{const b=bowlerAt(114),a=drawCharacter('bowler',b.pose,{distance:true}).anchors.release;return a.map((v,i)=>v+b.pos[i]);};
const contact=()=>round(drawCharacter('batter',10).anchors.face.map((v,i)=>v+BATTER_POSITION[i]));
export const ANCHORS={release:bowlerRelease(),bounce:[106,163],contact:contact(),landing:[157,81],pivot:drawCharacter('batter',10).anchors.farFoot.map((v,i)=>v+BATTER_POSITION[i]+(i===0?5:0))};
export function ballAt(f){
 if(f<114||f>181)return null;
 if(f<=125){const t=(f-114)/11;return round([lerp(ANCHORS.release[0],ANCHORS.bounce[0],t),lerp(ANCHORS.release[1],ANCHORS.bounce[1],t)]);}
 if(f<=132){const t=(f-125)/7;return round([lerp(ANCHORS.bounce[0],ANCHORS.contact[0],t),lerp(ANCHORS.bounce[1],ANCHORS.contact[1],t)-Math.sin(t*Math.PI)*18]);}
 const t=(f-132)/49,u=1-t;
 return round([u*u*ANCHORS.contact[0]+2*u*t*165+t*t*ANCHORS.landing[0],u*u*ANCHORS.contact[1]+2*u*t*(-8)+t*t*ANCHORS.landing[1]]);
}
export function background(){
 const p=new Pixels(WIDTH,HEIGHT);p.rect(0,0,WIDTH,HEIGHT,C.bg);
 [[23,18],[56,9],[91,24],[131,14],[164,27]].forEach(([x,y])=>p.set(x,y,'#264657'));
 // Tiered seating with stepped perspective rails, not photographic textures.
 for(let tier=0;tier<3;tier++){
  const y=62+tier*17;
  p.polygon([[0,y-4],[43,y+7],[149,y+7],[192,y-4],[192,y+12],[145,y+22],[47,y+22],[0,y+12]],tier%2?C.stand2:C.stand);
  p.line([0,y-4],[45,y+7],2,C.rail);p.line([45,y+7],[147,y+7],2,C.rail);p.line([147,y+7],[192,y-4],2,C.rail);
  for(let row=0;row<2;row++)for(let i=0;i<26;i++){const x=5+i*7,y2=y+4+row*6+Math.round(5*(1-Math.abs(x-96)/96));if((i+row+tier)%3!==0)p.rect(x,y2,1,(i%4===0?2:1),((i+tier)%4===0?'#49727a':C.crowd));}
 }
 // Stadium floodlights: coherent rectangular pixel clusters and stable light.
 for(const x of [19,173]){
  p.polygon([[x-7,49],[x+7,49],[x+20,115],[x-19,115]],'#102c3b');
  p.rect(x-1,50,2,57,'#365d6a');p.rect(x,51,1,55,'#203e4d');
  p.rect(x-10,34,21,17,'#122e40');p.rect(x-9,35,19,15,'#315a6b');
  for(let row=0;row<2;row++)for(let col=0;col<4;col++)p.rect(x-7+col*4,37+row*6,3,4,C.lamp);
 }
 p.rect(0,102,192,154,C.turf);
 for(let y=125;y<252;y+=28)p.rect(0,y,192,11,C.stripe);
 // Pitch widens toward the foreground; camera and horizon remain fixed.
 p.polygon([[edge(112,-1),112],[edge(112,1),112],[edge(244,1),244],[edge(244,-1),244]],C.pitchShade);
 p.polygon([[edge(112,-1,2),112],[edge(112,1,2),112],[edge(244,1,5),244],[edge(244,-1,5),244]],C.pitch);
 p.polygon([[edge(112,-1,2),112],[edge(112,-1,5),112],[edge(244,-1,12),244],[edge(244,-1,5),244]],C.pitchLit);
 for(const [x,y,w]of[[88,123,18],[76,146,5],[110,168,6],[62,199,4],[130,218,6],[95,232,3]])p.rect(x,y,w,1,'#998c5c');
 for(const y of [131,227])p.line([edge(y,-1,3),y],[edge(y,1,3),y],1,C.crease);
 for(const side of [-1,1])p.line([edge(221,side,5),221],[edge(232,side,5),232],1,C.crease);
 // Far and near stumps are behind the players, with individual bails.
 for(const {x,y,h,spacing}of WICKETS){
  p.ellipse(x+spacing,y+1,spacing*2+2,1,'#173a37');
  for(let i=0;i<3;i++){p.rect(x+i*spacing,y-h,1,h,C.crease);if(spacing===4)p.rect(x+i*spacing+1,y-h,1,h,C.cyan);}
  p.rect(x-1,y-h,spacing*2+3,1,C.lamp);
 }
 p.ellipse(65,232,25,2,'#344b38');
 // Stepped dark foreground blends the scene into the native navy surface.
 for(const [y,c]of[[246,'#102e32'],[250,'#10252c'],[253,C.bg]])p.rect(0,y,192,256-y,c);
 return p;
}
export function effects(frame){
 const p=new Pixels(WIDTH,HEIGHT);
 for(const x of [37,154]){p.rect(x,77,1,20,C.rail);const wave=Math.floor(frame/18)%2;p.polygon([[x+1,77],[x+11,77+wave],[x+9,81],[x+1,80]],'#397480');p.rect(x+2,78,3,1,C.cyan);}
 // Small staggered crowd reactions around the landing area.
 for(let cluster=0;cluster<3;cluster++){
  const begin=181+cluster*5;
  if(frame>=begin&&frame<begin+25){const up=Math.floor((frame-begin)/4)%2;for(let i=0;i<5;i++){const x=132+cluster*11+i*2,y=86+cluster*2;p.set(x,y-up,C.crowd);if(up){p.set(x-1,y-1,'#5d8990');p.set(x+1,y-1,'#5d8990');}}}
 }
 const ball=ballAt(frame);
 if(ball){
  if(frame>132)for(let n=6;n>=2;n-=2){const previous=ballAt(Math.max(132,frame-n));if(previous)p.rect(previous[0],previous[1],1,1,n===2?'#9fd5d7':'#477e8b');}
  const size=frame>168?1:frame>153?2:3;p.rect(ball[0]-1,ball[1]-1,size,size,'#f0eee0');if(size===3)p.set(ball[0]+1,ball[1],'#b69363');
 }
 if(frame>=132&&frame<=134){const [x,y]=ANCHORS.contact;p.rect(x-4,y,2,1,C.lamp);p.rect(x+3,y-1,2,1,C.lamp);p.rect(x,y-5,1,2,C.crease);p.rect(x-1,y+3,1,2,C.crease);}
 if(frame>=125&&frame<=128){const [x,y]=ANCHORS.bounce,spread=frame-124;p.set(x-spread-1,y+1,C.pitchLit);p.set(x+spread+1,y+1,C.pitchLit);}
 if(frame>=132&&frame<147){const t=frame-132,[x,y]=ANCHORS.pivot;for(let i=0;i<5;i++)p.rect(x-3+i*2+Math.floor(t/5),y-Math.floor(Math.sin((i+1)*.7)*t/5),1+(i%2),1,i%2?C.pitchLit:C.pitchShade);}
 return p;
}
export function scene(frame=0){
 const p=background(),bowler=bowlerAt(frame),sprite=drawCharacter('bowler',bowler.pose,{scale:bowler.scale,distance:true});
 p.stamp(sprite.image,...bowler.pos);
 p.stamp(drawCharacter('batter',batterAt(frame)).image,...BATTER_POSITION);p.stamp(effects(frame),0,0);
 return p;
}
const ks=(p=[0,0],opacity=fixed(100))=>({o:opacity,r:fixed(0),p:fixed([...p,0]),a:fixed([0,0,0]),s:fixed([100,100,100])});
const shapeLayer=(name,pixel)=>({ty:4,ind:1,nm:name,ddd:0,sr:1,ks:ks(),shapes:shapes(pixel),ip:0,op:FRAMES,st:0,bm:0});
function held(values){const keys=[];values.forEach((v,t)=>{if(t===0||JSON.stringify(v)!==JSON.stringify(values[t-1]))keys.push({t,s:Array.isArray(v)?v:[v],h:1});});if(keys.length===1)return fixed(values[0]);return {a:1,k:keys};}
export function animation(){
 const assets=[],layers=[],samples=Array.from({length:361},(_,f)=>({b:batterAt(f),w:bowlerAt(f)}));
 const addComp=(id,pixel)=>{assets.push({id,w:pixel.w,h:pixel.h,layers:[shapeLayer(id,pixel)]});};
 addComp('stadium',background());layers.push({ty:0,ind:1,nm:'Pixel stadium / static',refId:'stadium',ddd:0,sr:1,ks:ks(),w:WIDTH,h:HEIGHT,ip:0,op:FRAMES,st:0});
 const bowlerIds=[...new Set(samples.map(s=>`${s.w.pose}:${s.w.scale}`))];
 for(const key of bowlerIds){const [index,scale]=key.split(':').map(Number),id=`bowler-${index}-${Math.round(scale*100)}`;const image=drawCharacter('bowler',index,{scale,distance:true}).image;addComp(id,image);
  layers.push({ty:0,ind:layers.length+1,nm:`Bowler / ${BOWLER[index].name}`,refId:id,ddd:0,sr:1,ks:{...ks(),o:held(samples.map(s=>`${s.w.pose}:${s.w.scale}`===key?100:0)),p:held(samples.map(s=>[...s.w.pos,0]))},w:image.w,h:image.h,ip:0,op:FRAMES,st:0});
 }
 for(let i=0;i<BATTER.length;i++){const id=`batter-${i}`,image=drawCharacter('batter',i).image;addComp(id,image);layers.push({ty:0,ind:layers.length+1,nm:`Batsman / ${BATTER[i].name}`,refId:id,ddd:0,sr:1,ks:ks(BATTER_POSITION,held(samples.map(s=>s.b===i?100:0))),w:image.w,h:image.h,ip:0,op:FRAMES,st:0});}
 // Effects are grouped by exact cell positions and switched without interpolation.
 const effectFrames=new Map();for(let f=0;f<360;f++){const image=effects(f),key=JSON.stringify(image.packed());if(!effectFrames.has(key))effectFrames.set(key,{image,frames:[]});effectFrames.get(key).frames.push(f);}
 for(const [i,{image,frames}]of [...effectFrames.values()].entries()){
  if(!image.packed().length)continue;const id=`effects-${i}`;addComp(id,image);const active=new Set(frames);
  layers.push({ty:0,ind:layers.length+1,nm:'Ball / flags / contact / crowd',refId:id,ddd:0,sr:1,ks:ks([0,0],held(Array.from({length:361},(_,f)=>active.has(f%360)?100:0))),w:WIDTH,h:HEIGHT,ip:0,op:FRAMES,st:0});
 }
 return {v:'5.7.4',fr:FPS,ip:0,op:FRAMES,w:WIDTH,h:HEIGHT,nm:'Final Over / authored athletic pixel cricket',ddd:0,assets,layers:layers.reverse(),markers:[{tm:0,cm:'Guard',dr:0},{tm:114,cm:'Release',dr:0},{tm:125,cm:'Bounce',dr:0},{tm:132,cm:'Bat contact',dr:0},{tm:152,cm:'Follow through',dr:0},{tm:288,cm:'Return',dr:0}]};
}
export const poster=()=>svg(scene(0),'Final Over pixel cricket stadium, batsman and bowler');
export function characterSheet(kind){
 const poses=kind==='batter'?BATTER:BOWLER,cols=6,rows=Math.ceil(poses.length/cols),cw=kind==='batter'?148:116,ch=kind==='batter'?156:140,sheet=new Pixels(cols*cw,rows*ch);
 for(let i=0;i<poses.length;i++){const x=(i%cols)*cw,y=Math.floor(i/cols)*ch;sheet.rect(x,y,cw-2,ch-2,'#101e2b');sheet.stamp(drawCharacter(kind,i).image,x+2,y+6);}
 return svg(sheet,`${kind} authored pose sheet`);
}
export async function generate({output,flutter,check=false,sourceOutput}){
 const data=animation(),files={'final-over.json':JSON.stringify(data),'final-over-poster.svg':poster()};
 for(const root of [output,...(flutter?[path.join(flutter,'assets/game_lobbies')]:[])]){
  if(!check)await mkdir(root,{recursive:true});for(const [name,value]of Object.entries(files)){if(check){if(await readFile(path.join(root,name),'utf8')!==value)throw new Error(`Asset mismatch ${root}/${name}`);}else await writeFile(path.join(root,name),value);}
 }
 if(sourceOutput&&!check){
  await mkdir(sourceOutput,{recursive:true});
  for(const kind of ['batter','bowler'])await writeFile(path.join(sourceOutput,`${kind}-poses.svg`),characterSheet(kind));
  await writeFile(path.join(sourceOutput,'background.svg'),svg(background()));
  await writeFile(path.join(sourceOutput,'scene-anchors.json'),JSON.stringify({anchors:ANCHORS,batterPoses:BATTER.map(p=>p.name),bowlerPoses:BOWLER.map(p=>p.name),batterKeys:BATTER_KEYS},null,2));
  await writeFile(path.join(sourceOutput,'movement-metadata.json'),JSON.stringify({schemaVersion:1,fps:FPS,frames:FRAMES,events:{release:114,bounce:125,contact:132},batter:BATTER.map((p,i)=>({name:p.name,anchors:drawCharacter('batter',i).anchors})),bowler:BOWLER.map((p,i)=>({name:p.name,anchors:drawCharacter('bowler',i).anchors,distanceAnchors:drawCharacter('bowler',i,{distance:true}).anchors})),batterKeys:BATTER_KEYS,bowlerFrames:bowlerSamples},null,2));
 }
 return data;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const arg=n=>{const i=process.argv.indexOf(n);return i<0?undefined:process.argv[i+1];};
 const data=await generate({output:arg('--output')??path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../public/assets/games/lobbies'),flutter:arg('--flutter'),check:process.argv.includes('--check'),sourceOutput:path.dirname(fileURLToPath(import.meta.url))});
 console.log(`${BATTER.length} batsman poses / ${BOWLER.length} bowler poses / ${data.assets.length} local vector compositions / ${JSON.stringify(data).length} bytes`);
}
