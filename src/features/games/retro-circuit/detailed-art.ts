import {carPixels,type CarPose,type PixelRect} from './art';
import type {VehicleId} from './types';
const variants:Record<VehicleId,readonly string[]>={vector:['#a8d7eb','#b7d5bd','#d1c7db'],comet:['#f78e72','#dbcba5','#b2ccde'],kestrel:['#f3d98b','#b5d4c7','#e7b4b9'],nomad:['#bdacf3','#91bfcc','#cbb898']};
/** Native128×80 detail layer. Base silhouettes share original64×40 authorship;
 * fine contours, rims, vents and liveries are authored here, not interpolated. */
export function detailedCarPixels(id:VehicleId,pose:CarPose,livery=0):PixelRect[]{
 const edition=((livery%3)+3)%3,paint=variants[id][edition],basePaint=variants[id][0];
 const pixels=carPixels(id,pose).map(r=>({...r,x:r.x*2,y:r.y*2,width:r.width*2,height:r.height*2,color:r.color===basePaint?paint:r.color}));
 const r=(x:number,y:number,width:number,height:number,color:string)=>pixels.push({x,y,width,height,color}),turn=pose==='left'?-8:pose==='right'?8:0,roof=id==='comet'?22:id==='nomad'?12:16;
 // Glass edge, reflected horizon and sculpted rear-deck seams.
 r(44+turn,roof+6,36,1,'#e7f5ff');r(42+turn,roof+7,40,1,'#8cacc3');r(39+turn,Math.min(roof+12,33),47,1,'#8198b2');
 for(let i=0;i<6;i++)r(46+turn+i*5,34,3,1,'#7990a8');
 r(25,40,78,1,'#e7f0eb');r(23,42,80,1,'#879bab');r(20,58,88,1,'#dce7e8');r(22,61,82,1,'#a3b3c5');r(26,66,75,1,'#344254');
 // Round-looking pixel rim clusters within the exposed tyres.
 for(const x of [14,109]){r(x,51,3,15,'#070d18');r(x+1,53,3,10,'#94a2b2');r(x+2,55,1,6,'#d4e1e4');r(x+1,57,2,2,'#28324b');r(x,65,4,2,'#11172a');}
 // Differing rear light arrangements preserve each car's identity.
 if(id==='vector'){for(const x of [25,37,81,93]){r(x,49,6,1,pose==='brake'?'#ffe0a1':'#f1a3ac');r(x+1,53,4,1,'#432c42');}r(53,51,21,1,'#8c9aab');}
 if(id==='comet'){for(let y=34;y<46;y+=3){r(39+turn,y,48,1,'#1c2136');r(42+turn,y+1,42,1,'#815354');}r(20,47,86,1,'#ffe0b7');r(25,52,14,1,'#f5a0a2');r(87,52,14,1,'#f5a0a2');}
 if(id==='kestrel'){r(62+turn,14,3,22,paint);r(30,47,4,7,'#fbf1d6');r(95,47,4,7,'#fbf1d6');r(47,53,34,1,'#d4c5a2');}
 if(id==='nomad'){r(33+turn,9,5,2,'#dae5f1');r(88+turn,9,5,2,'#dae5f1');r(32+turn,35,65,1,'#252c45');r(30,51,15,2,'#d96685');r(85,51,15,2,'#d96685');}
 // Original numbered editions, stripes and flank decals; no sponsor marks.
 if(edition){const stripe=edition===1?'#e9e7d2':'#2b3d59';r(55+turn,roof,5,3,stripe);r(68+turn,roof,5,3,stripe);r(53,38,6,5,stripe);r(70,38,6,5,stripe);for(let i=0;i<4;i++)r(24+i*3,58,2,2,stripe);r(91,40,10,5,'#172438');r(94,41,2,3,'#eee9d2');if(edition===2)r(98,41,1,3,'#eee9d2');}
 // Exhaust mouths, polished edges, licence recess and rear diffuser vanes.
 for(const x of [30,38,89,96]){r(x,64,4,2,'#d1d1cb');r(x+1,64,2,1,'#151e2a');}for(let i=0;i<6;i++)r(49+i*5,67,2,2,'#192132');r(57,59,14,1,'#71819a');
 return pixels;
}
