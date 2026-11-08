import {CHARACTER_PACK} from "./character-pack";
import {drawContactArm} from "./contact-arm";
import {actionPose} from "./action-spec";
import {REFERENCE_TUNING as T} from "./reference-tuning";
import {courtPoint,cameraOrigin,cameraTop,BASKET_ART,VIEW} from "./view";
import {drawParkCourt} from "./court";
import {gaitFrame,bodyBob,defenseFrame} from "./motion";
import { anchor, COURT, type Actor, type Match } from "./simulation";

export type Pictures = Record<string, HTMLImageElement>;
export const POSES = ["d-push","d-low","d-down","s-ready","s-rise","s-release","s-follow","p-pass-gather-left","p-pass-extend-left","a-reach","a-overhead","carry-low","carry-front","dunk-gather","dunk-contact","land-recover","neutral-a","neutral-b"];
export function poseFor(s:Match,a:Actor) {
  let pose="s-ready";
  const age=s.tick-a.started,has=s.ball.owner===a.id;
  if(a.action==="shoot")pose=age<10?"s-ready":age<22?"s-rise":age<26?"s-release":"s-follow";
  else if(a.action==="dunk")pose=!has?(a.z>20?"dunk-contact":"land-recover"):a.z===0&&age>6?"neutral-a":age<15?"dunk-gather":"dunk-contact";
  else if(a.action==="block")pose=a.z>16?"a-overhead":age>20?"land-recover":"a-reach";
  else if(a.action==="steal"||a.action==="gather")pose="d-low";
  else if(a.action==="recoil")pose=age<8?"d-low":age<16?"neutral-b":"neutral-a";
  else if(a.action==="pass")pose=age<T.passGatherTicks?"p-pass-gather-left":"p-pass-extend-left";
  else if(has&&a.z>0)pose="a-overhead";
  else if(a.action==="receive")pose=a.z>0?"a-overhead":has?(s.ball.age<6?"s-ready":"carry-front"):age<6?"land-recover":"neutral-a";
  else if(has)pose=(a.moving||(a.dribbleTick??-1)>=0)?`dribble-body-${String(a.moving?gaitFrame(a.travel??0):0).padStart(2,"0")}`:"carry-front";
  else if(a.action==="idle"){
    const travel=a.travel??a.id*7,mark=a.intent?.mark===undefined?undefined:s.actors[a.intent.mark],marking=!!mark&&(a.intent?.role==="mark"||a.intent?.role==="pressure")&&Math.hypot(mark.x-a.x,mark.y-a.y)<120,defending=marking||(s.ball.owner!==null&&s.actors[s.ball.owner].team!==a.team&&Math.hypot(s.ball.x-a.x,s.ball.y-a.y)<180);
    if(a.turnedAt!==undefined&&s.tick-a.turnedAt<8)pose=`pivot-${String(Math.floor((s.tick-a.turnedAt)/2)).padStart(2,"0")}`;
    else if(a.moving&&defending&&(a.moveX??0)*a.face<-.1)pose=`backpedal-${String(defenseFrame(travel)).padStart(2,"0")}`;
    else if(a.moving)pose=defending?`defend-${String(defenseFrame(travel)).padStart(2,"0")}`:`run-${String(gaitFrame(travel)).padStart(2,"0")}`;
    else if(a.lastMoved!==undefined&&s.tick-a.lastMoved<8)pose=`brake-${String(Math.floor((s.tick-a.lastMoved)/2)).padStart(2,"0")}`;
    else pose=defending?"defend-00":Math.floor((s.tick+a.id*11)/24)%2?"neutral-a":"neutral-b";
  }
  const action=actionPose(a,s.tick);if(action)pose=action;if(a.action==="dunk"&&!has)pose=a.z>20?"finish-10":"recover-03";
  const directional=a.action==="idle"&&(pose.startsWith("run-")||pose.startsWith("dribble-body-")||pose.startsWith("defend-")||pose.startsWith("backpedal-")||["neutral-a","neutral-b","carry-front"].includes(pose));
  if(directional&&Math.abs(a.moveY??0)>Math.abs(a.moveX??0)*.7)pose+=(a.moveY??0)<0?"-back":"-front";
  return `${a.team===0?"navy":"amber"}-${pose}-${a.face===1?"source":"mirrored"}`;
}
export function overlayFor(s:Match,a:Actor){
  if(s.ball.owner!==a.id||a.action!=="idle"||(!a.moving&&(a.dribbleTick??-1)<0))return null;
  const phase=((a.dribbleTick??0)%18+18)%18,blend=(a.dribbleFacing??a.face)/a.face,switching=blend<1,frame=switching?phase*4+Math.max(0,Math.min(3,Math.round((blend+1)*2))):phase;
  const view=Math.abs(a.moveY??0)>Math.abs(a.moveX??0)*.7?((a.moveY??0)<0?"-back":"-front"):"";
  return {key:`${a.team===0?"navy":"amber"}-${switching?"dribble-switch":"dribble-arm"}-${String(frame).padStart(2,"0")}${view}-${a.face===1?"source":"mirrored"}`,y:bodyBob(a.moving?(a.travel??0):0)};
}
export function courtCanvas(frame=0) {
  const canvas=document.createElement("canvas");canvas.width=VIEW.width;canvas.height=VIEW.height;
  drawParkCourt(canvas.getContext("2d")!,frame);
  return canvas;
}
let contactCanvas:HTMLCanvasElement|undefined;
export function drawCanvas(c:CanvasRenderingContext2D,s:Match,p:Pictures,debug=false) {
  const width=c.canvas.width,cam=cameraOrigin(s,width),top=cameraTop(s);c.imageSmoothingEnabled=false;c.clearRect(0,0,width,c.canvas.height);c.save();c.translate(0,-top);const shade=ditherPattern(c);
  c.drawImage(p["court-"+(Math.floor(s.tick/T.crowdFrameTicks)%T.crowdFrames)]??p.court, -cam,0);
  const rows=s.actors.map(a=>({y:a.y,kind:"actor",a}));
  rows.push({y:s.ball.y+.1,kind:"ball",a:s.actors[0]});
  for(const row of rows.sort((a,b)=>a.y-b.y)) {
    if(row.kind==="ball"){const p0=courtPoint(s.ball.x,s.ball.y),p1=courtPoint(s.ball.x,s.ball.y,s.ball.z);c.fillStyle=shade;c.beginPath();c.ellipse(p0.x-cam,p0.y,7*p0.scale,2.5*p0.scale,0,0,Math.PI*2);c.fill();drawPicture(c,p,"ball",Math.round(p1.x-cam-6.5*p1.scale),Math.round(p1.y-6.5*p1.scale),13*p1.scale,13*p1.scale);continue;}
    const a=row.a,p0=courtPoint(a.x,a.y,a.z),scale=p0.scale,x=Math.round(p0.x-cam),y=Math.round(p0.y);
    const ground=courtPoint(a.x,a.y),size=Math.max(.55,1-a.z/250)*scale;c.fillStyle=shade;c.beginPath();c.ellipse(Math.round(ground.x-cam),Math.round(ground.y),19*size,5*size,0,0,Math.PI*2);c.fill();
    if(a.id===s.selected){const marker=characterMarkerHeight(p,poseFor(s,a));c.save();c.translate(x,y);c.scale(scale,scale);c.font="bold 10px monospace";c.textAlign="center";c.fillStyle="#191810";c.fillText("1P",1,3-marker);c.fillStyle="#ef3c27";c.fillText("1P",0,2-marker);c.beginPath();c.moveTo(-4,4-marker);c.lineTo(4,4-marker);c.lineTo(0,8-marker);c.fill();c.restore();}
    const pose=poseFor(s,a),head=headLayer(p,a,pose);
    const drawHead=()=>{if(head)drawPicture(c,p,head.key,x+(head.x-72-16)*scale,y+(head.y-116-16)*scale,32*scale,32*scale);};
    if(head?.underBody)drawHead();
    drawPicture(c,p,pose,x-72*scale,y-116*scale,144*scale,128*scale);
    if(!head?.underBody)drawHead();
    const overlay=overlayFor(s,a);if(overlay)drawPicture(c,p,overlay.key,x-72*scale,y+(-116+overlay.y)*scale,144*scale,128*scale);
    const gripCanvas=contactCanvas??(contactCanvas=document.createElement("canvas"));gripCanvas.width=144;gripCanvas.height=128;
    const grip=drawContactArm(gripCanvas,s,characterAnchors(p,poseFor(s,s.actors[s.ball.owner??0])));if(grip?.actor===a.id)c.drawImage(gripCanvas,x-72*scale,y-116*scale,144*scale,128*scale);
    if(debug){c.strokeStyle="#51ff94";c.strokeRect(x-13*scale,a.y-8*scale,26*scale,16*scale);c.font="9px monospace";c.fillStyle="white";c.fillText(a.id+" "+a.action,x-20,y-120*scale);const hand=anchor(a),hp=courtPoint(hand.x,hand.y,hand.z);c.fillRect(hp.x-cam-2,hp.y-2,4,4);}
  }
  for(const [key,x] of [["left",85],["right",815]] as const){const p0=courtPoint(x,COURT.rimY),art=BASKET_ART[key];drawPicture(c,p,key,p0.x-cam-art.rimX*p0.scale,p0.y-(COURT.rimZ+art.rimY)*p0.scale,art.width*p0.scale,art.height*p0.scale);}
  c.restore();
}
const patterns=new WeakMap<CanvasRenderingContext2D,CanvasPattern|string>();
/** Checkerboard fill matching the Three renderer's dithered shadow texture. */
function ditherPattern(c:CanvasRenderingContext2D){let p=patterns.get(c);if(!p){const tile=document.createElement("canvas");tile.width=tile.height=2;const t=tile.getContext("2d")!;t.fillStyle="#000000b0";t.fillRect(0,0,1,1);t.fillRect(1,1,1,1);p=c.createPattern(tile,"repeat")??"#0006";patterns.set(c,p);}return p;}
export type CharacterAnchors={view?:"side"|"front"|"back";head?:[number,number];shoulders?:[number,number][];hands?:[number,number][];hips?:[number,number];elbows?:[number,number][]};
type Atlas={regions:Record<string,[number,number,number,number,number]>;images:HTMLImageElement[];poses:Record<string,CharacterAnchors>};
const atlases=new WeakMap<Pictures,Atlas>();
export function characterAnchors(p:Pictures,key:string){return atlases.get(p)?.poses[key];}
/** Identity is stable per athlete; the action body owns the head anchor/view. */
export function headLayer(p:Pictures,a:Actor,pose:string){
 const rig=characterAnchors(p,pose);if(!rig?.head)return null;
 // Pass frames are drawn facing the receiver (mirrored body), so their head layer flips too.
 const flip=/-(throw-[0-9]+|p-pass-gather-left|p-pass-extend-left)-(source|mirrored)$/.test(pose),key=`${a.team===0?"navy":"amber"}-head-${a.id%3}-${rig.view??"side"}-${(a.face===1)!==flip?"source":"mirrored"}`;
 return p[key]?{key,x:rig.head[0],y:rig.head[1],underBody:/-(jump-block-[0-9]+|a-overhead|a-reach)-/.test(pose)}:null;
}
export function characterMarkerHeight(p:Pictures,key:string){const head=characterAnchors(p,key)?.head;return head?116-head[1]+18:124;}
export function pictureAtlas(p:Pictures){return atlases.get(p);}
export function drawPicture(c:CanvasRenderingContext2D,p:Pictures,key:string,x:number,y:number,w:number,h:number){const atlas=atlases.get(p),r=atlas?.regions[key];if(r)c.drawImage(atlas!.images[r[4]],r[0],r[1],r[2],r[3],x,y,w,h);else c.drawImage(p[key],x,y,w,h);}
export async function loadPictures(base:string,signal:AbortSignal):Promise<Pictures>{
  const response=await fetch(`${base}/../${CHARACTER_PACK.folder}/manifest.json`,{signal});if(!response.ok)throw Error("Player manifest unavailable");
  const manifest=await response.json();if(manifest.version!==CHARACTER_PACK.version||!manifest.regions)throw Error("Unsupported player pack");
  const result:Pictures={};
  const images=await Promise.all(manifest.atlases.map(async(name:string)=>{
    if(!/^family-[0-9]+\.png$/.test(name))throw Error("Invalid atlas name");
    const response=await fetch(`${base}/../${CHARACTER_PACK.folder}/${name}`,{signal});if(!response.ok)throw Error("Player atlas unavailable");
    const url=URL.createObjectURL(await response.blob()),image=new Image();
    try{image.src=url;await image.decode();if(signal.aborted)throw new DOMException("Cancelled","AbortError");return image;}finally{URL.revokeObjectURL(url);}
  }));
  for(const [key,rect] of Object.entries(manifest.regions))result[key]=images[(rect as number[])[4]];
  atlases.set(result,{regions:manifest.regions,images,poses:Object.fromEntries(manifest.frames.map((f:{key:string;view:CharacterAnchors['view'];anchors:CharacterAnchors})=>[f.key,{...f.anchors,view:f.view}]))});
  for(let frame=0;frame<T.crowdFrames;frame++){if(signal.aborted)throw new DOMException("Cancelled","AbortError");const canvas=courtCanvas(frame),img=new Image();img.src=canvas.toDataURL();await img.decode();result["court-"+frame]=img;}result.court=result["court-0"];return result;
}
