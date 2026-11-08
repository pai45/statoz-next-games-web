import type { VehicleId } from "./types";
export type PixelRect={x:number;y:number;width:number;height:number;color:string};
export type CarPose="straight"|"left"|"right"|"brake"|"boost"|"contact";
export const poses:readonly CarPose[]=["straight","left","right","brake","boost","contact"];
const paints={vector:["#a8d7eb","#6393bc","#365578","#e6f5ff"],comet:["#f78e72","#c25654","#77354b","#ffdbbe"],kestrel:["#f3d98b","#c49a52","#78613f","#fff6ce"],nomad:["#bdacf3","#8973b7","#514c7f","#eee3ff"]};
/** Original 64×40 pixel construction with explicit rear three-quarter poses. No traced pixels. */
export function carPixels(id:VehicleId,pose:CarPose):PixelRect[]{
 const pixels:PixelRect[]=[],[light,body,shade,shine]=paints[id],turn=pose==="left"?-1:pose==="right"?1:0;
 const r=(x:number,y:number,width:number,height:number,color:string)=>pixels.push({x,y,width,height,color});
 const poly=(points:number[][],color:string)=>{for(let y=Math.floor(Math.min(...points.map(p=>p[1])));y<Math.max(...points.map(p=>p[1]));y++){const xs=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if((a[1]<=y+.5&&b[1]>y+.5)||(b[1]<=y+.5&&a[1]>y+.5))xs.push(a[0]+(y+.5-a[1])*(b[0]-a[0])/(b[1]-a[1]));}xs.sort((a,b)=>a-b);for(let i=0;i+1<xs.length;i+=2)r(Math.floor(xs[i]),y,Math.max(1,Math.ceil(xs[i+1])-Math.floor(xs[i])),1,color);}};
 const dark="#111b2c",rubber="#121322",glass="#17273f",metal="#8798ae",roof=id==="comet"?11:id==="nomad"?6:8,shift=turn*4;
 r(8,35,49,2,"#10242a");r(12,37,42,1,"#17353a");
 if(pose==="boost"){r(20,35,6,5,"#ff9a45");r(39,35,6,5,"#ff9a45");r(21,35,4,3,"#fff5b4");r(40,35,4,3,"#fff5b4");}
 poly([[7,23],[11+shift,17],[53+shift,17],[59,23],[58,34],[6,34]],dark);
 r(6+(turn<0?-2:0),24,6,11,rubber);r(52+(turn>0?2:0),24,6,11,rubber);
 r(7+(turn<0?-2:0),25,2,7,metal);r(54+(turn>0?2:0),25,2,7,metal);
 poly([[9,23],[15+shift,roof+6],[19+shift,roof],[45+shift,roof],[51+shift,roof+6],[56,23]],shade);
 poly([[11,21],[18+shift,roof+3],[21+shift,roof],[43+shift,roof],[49+shift,roof+4],[54,21]],light);
 poly([[17+shift,roof+4],[21+shift,roof+2],[43+shift,roof+2],[47+shift,roof+5],[48+shift,19],[15+shift,19]],dark);
 poly([[19+shift,roof+5],[22+shift,roof+3],[42+shift,roof+3],[45+shift,roof+5],[46+shift,17],[17+shift,17]],glass);
 r(22+shift,roof+3,20,1,shine);r(19+shift,roof+6,25,2,"#59748e");r(20+shift,roof+8,23,1,"#35465f");
 r(20+shift,roof-1,24,1,shine);r(17+shift,roof+1,3,1,shine);r(44+shift,roof+1,3,1,shine);
 poly([[11,20],[17+shift,18],[47+shift,18],[55,20],[58,24],[56,31],[8,31],[6,24]],body);
 poly([[11,20],[17+shift,18],[47+shift,18],[54,20],[54,22],[10,22]],light);
 r(11,20,43,1,shine);r(8,23,3,7,light);r(54,23,3,7,shade);
 if(turn){const side=turn<0?7:52;poly([[side,22],[side+(turn<0?7:-7),17],[side+(turn<0?7:-7),29],[side,33]],shade);r(side,25,2,5,shine);}
 r(11,23,42,6,dark);r(12,24,40,1,metal);
 const lamp=pose==="brake"?"#ff5a57":"#a94564",lampLight=pose==="brake"?"#ffe0a2":"#f29ba8";
 if(id==="vector"){for(const x of [12,18,40,46]){r(x,24,5,3,lamp);r(x,24,4,1,lampLight);}r(25,24,13,3,"#293247");r(26,25,11,1,metal);}
 if(id==="comet"){r(11,23,42,2,shade);r(11,24,42,1,lampLight);r(12,25,11,3,lamp);r(41,25,11,3,lamp);r(13,16,39,2,dark);r(15,16,35,1,shine);for(let y=19;y<23;y+=2)r(21+shift,y,22,1,dark);}
 if(id==="kestrel"){r(30+shift,roof+3,2,12,body);for(const x of [11,47]){r(x,23,6,6,lamp);r(x,23,4,2,lampLight);r(x+1,27,4,1,"#eee8d6");}r(23,24,18,3,shade);}
 if(id==="nomad"){r(17+shift,roof-1,3,3,dark);r(44+shift,roof-1,3,3,dark);r(13,24,11,4,lamp);r(41,24,10,4,lamp);r(13,24,9,1,lampLight);r(42,24,8,1,lampLight);r(24,24,16,2,metal);}
 r(9,29,47,3,light);r(10,30,44,1,shine);r(12,32,41,2,shade);r(17,34,30,1,dark);
 r(26,28,13,5,dark);r(27,29,11,3,"#c6cbd9");r(29,30,7,1,"#4f5e78");
 r(14,32,7,2,dark);r(15,32,2,1,metal);r(18,32,2,1,metal);r(44,32,6,2,dark);r(45,32,2,1,metal);r(48,32,1,1,metal);
 if(turn){const mirror=turn>0,side=(x:number)=>mirror?64-x:x;poly([[side(51),19],[side(60),22],[side(61),29],[side(55),34],[side(53),31]],shade);poly([[side(51),20],[side(59),23],[side(58),25],[side(53),23]],light);r(mirror?4:55,26,5,9,rubber);r(mirror?5:56,27,2,6,metal);r(mirror?5:56,22,2,1,shine);}
 if(pose==="contact"){r(1,22,4,1,"#fff4c2");r(2,26,3,2,"#ffd966");r(60,21,3,2,"#fff4c2");r(59,29,4,1,"#ffd966");}
 return pixels;
}
export const artMetadata={schemaVersion:1,packId:"retro-circuit-original-v2",nativeSize:{width:64,height:40},author:"StatOz workspace / original pixel construction",source:"art.ts",referencePixelsUsed:false,poses:poses.map(name=>({name,durationMs:name==="contact"?100:120,loop:name==="boost",anchors:{origin:{x:32,y:36},road:{x:32,y:36},rearAxle:{x:32,y:31},exhaust:{x:32,y:35}},collision:{halfWidth:.125,halfLength:2.75}}))};
