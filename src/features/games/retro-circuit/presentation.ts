import {displayFor} from './fidelity';
import {mapPoints} from "./projection";
import type {RaceSnapshot,TrackDefinition} from "./types";

export const glyphs:Record<string,string>={
 "0":"01110/10001/10011/10101/11001/10001/01110","1":"00100/01100/00100/00100/00100/00100/01110","2":"01110/10001/00001/00010/00100/01000/11111","3":"11110/00001/00001/01110/00001/00001/11110","4":"00010/00110/01010/10010/11111/00010/00010","5":"11111/10000/10000/11110/00001/00001/11110","6":"01110/10000/10000/11110/10001/10001/01110","7":"11111/00001/00010/00100/01000/01000/01000","8":"01110/10001/10001/01110/10001/10001/01110","9":"01110/10001/10001/01111/00001/00001/01110",
 A:"01110/10001/10001/11111/10001/10001/10001",B:"11110/10001/10001/11110/10001/10001/11110",C:"01111/10000/10000/10000/10000/10000/01111",D:"11110/10001/10001/10001/10001/10001/11110",E:"11111/10000/10000/11110/10000/10000/11111",F:"11111/10000/10000/11110/10000/10000/10000",G:"01111/10000/10000/10111/10001/10001/01111",H:"10001/10001/10001/11111/10001/10001/10001",I:"11111/00100/00100/00100/00100/00100/11111",J:"00111/00010/00010/00010/10010/10010/01100",K:"10001/10010/10100/11000/10100/10010/10001",L:"10000/10000/10000/10000/10000/10000/11111",M:"10001/11011/10101/10101/10001/10001/10001",N:"10001/11001/10101/10011/10001/10001/10001",O:"01110/10001/10001/10001/10001/10001/01110",P:"11110/10001/10001/11110/10000/10000/10000",Q:"01110/10001/10001/10001/10101/10010/01101",R:"11110/10001/10001/11110/10100/10010/10001",S:"01111/10000/10000/01110/00001/00001/11110",T:"11111/00100/00100/00100/00100/00100/00100",U:"10001/10001/10001/10001/10001/10001/01110",V:"10001/10001/10001/10001/10001/01010/00100",W:"10001/10001/10001/10101/10101/10101/01010",X:"10001/10001/01010/00100/01010/10001/10001",Y:"10001/10001/01010/00100/00100/00100/00100",Z:"11111/00001/00010/00100/01000/10000/11111","/":"00001/00010/00010/00100/01000/01000/10000",":":"0/1/0/0/1/0/0",".":"0/0/0/0/0/1/1","-":"00000/00000/00000/11111/00000/00000/00000","!":"1/1/1/1/1/0/1"," ":"0/0/0/0/0/0/0"};
export function pixelText(c:CanvasRenderingContext2D,text:string,x:number,y:number,size=1,color="#f3f0e9",shadow=true){
 const draw=(dx:number,dy:number,ink:string)=>{c.fillStyle=ink;let pen=x;for(const letter of text.toUpperCase()){const rows=(glyphs[letter]??glyphs[" "]).split('/');for(let row=0;row<rows.length;row++)for(let col=0;col<rows[row].length;col++)if(rows[row][col]==="1")c.fillRect(Math.round(pen+col*size+dx),Math.round(y+row*size+dy),size,size);pen+=(letter===' '?4:letter==='.'||letter===':'?3:6)*size;}};
 if(shadow)draw(size,size,"#0b101b");draw(0,0,color);
}
/** Original panorama, authored at native resolution. No sampled game pixels. */
export function paintPanorama(c:CanvasRenderingContext2D,track:TrackDefinition){
 const w=c.canvas.width,h=c.canvas.height,r=(x:number,y:number,a:number,b:number,color:string)=>{c.fillStyle=color;c.fillRect(x,y,a,b);};
 const poly=(points:number[][],color:string)=>{c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
 r(0,0,w,h,track.sky);
 if(track.id==='desert'){
  for(let k=0;k<4;k++){const x=k*240;poly([[x-40,84],[x+15,42],[x+39,38],[x+76,17],[x+116,28],[x+157,8],[x+214,50],[x+264,83]],"#b8816d");poly([[x+5,84],[x+76,19],[x+65,52],[x+87,41],[x+104,76],[x+130,84]],"#e9b592");poly([[x+85,84],[x+157,10],[x+178,39],[x+167,35],[x+192,70],[x+214,84]],"#dba17f");for(let i=0;i<22;i++){const px=x+((i*43)%231),py=47+(i*19)%35;r(px,py,2+(i%4)*2,1,i%2?'#d4a080':'#f0c6a0');}}
  r(0,82,w,4,"#eac09b");r(0,86,w,3,"#be8a68");
 }else if(track.id==='coast'){
  r(0,17,w,2,"#28b7d4");for(let k=0;k<5;k++){const x=k*212;poly([[x,67],[x+23,57],[x+48,54],[x+67,36],[x+94,29],[x+114,43],[x+137,51],[x+179,62],[x+212,74]],"#526e6a");poly([[x+31,67],[x+69,39],[x+94,31],[x+82,47],[x+93,50],[x+69,61]],"#8f9b72");}
  r(0,73,w,18,"#268caf");for(let y=75;y<91;y+=4)r(0,y,w,1,y%3?'#43b4c4':'#85d2cc');
  for(let i=0;i<12;i++){r(40+i*79,18+(i%3)*6,22,3,"#d1eef0");r(46+i*79,15+(i%3)*6,12,4,"#e6f4ed");}
 }else{
  r(0,38,w,30,"#685474");r(0,68,w,24,"#a46d80");for(let i=0;i<53;i++){const x=i*20,y=28+(i*13)%43,width=12+(i%4)*4;r(x,y,width,92-y,i%3?'#343549':'#272a42');r(x+2,y,2,92-y,"#51526b");if(i%5===0){r(x+width/2,y-12,1,12,"#80758d");r(x+width/2,y-12,1,2,"#ff9d87");}for(let wy=y+5;wy<90;wy+=6)for(let wx=x+5;wx<x+width-2;wx+=5)if((wx+wy+i)%4!==0)r(wx,wy,2,2,(i+wy)%3?'#d8b181':'#7c8194');}
 }
}
export function paintRoadside(c:CanvasRenderingContext2D,kind:number){
 const r=(x:number,y:number,w:number,h:number,color:string)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
 const line=(points:number[][],color:string,width:number)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();};
 r(13,61,29,2,"#1f3c2e");
 if(kind===0){line([[29,62],[25,43],[22,26],[24,14]],"#283c38",5);line([[28,60],[24,42],[22,26],[24,14]],"#8c9a78",2);for(let y=27;y<61;y+=6)r(24+Math.floor((y-36)/8),y,4,1,"#303e32");for(const [x,y]of [[2,18],[9,8],[19,3],[35,6],[45,19],[42,28],[5,31]]){line([[24,15],[(24+x)/2,y-4],[x,y]],"#1d4d3a",5);line([[24,15],[x,y]],"#55926b",2);}r(21,14,7,5,"#335c3e");
 }else if(kind===1){for(const [x,y,w,h,color]of [[8,53,31,9,'#7c5144'],[13,43,24,10,'#af7d5a'],[18,34,17,10,'#ca9a71'],[23,30,10,5,'#e3b78c']] as const)r(x,y,w,h,color);r(15,48,7,4,"#d3a67d");r(22,54,15,2,"#6d4b40");r(7,62,34,1,"#b17f5e");
 }else if(kind===2){r(6,12,35,50,"#26283d");r(8,9,29,3,"#4b4b63");r(10,7,25,2,"#737085");r(36,16,5,45,"#171f34");for(let y=18;y<57;y+=7)for(let x=12;x<35;x+=7)r(x,y,3,3,(x+y)%3?'#edbf81':'#6c7495');r(8,57,30,4,"#4c5265");r(16,58,10,4,"#1a2434");
 }else{r(22,37,3,25,"#d5d0b6");r(25,37,2,25,"#424c48");r(7,15,34,24,"#17242b");r(8,16,32,21,"#e9e1c5");if(kind===5){pixelText(c,'P',16,20,2,"#1f434d",false);}else for(let i=0;i<7;i++){const x=kind===3?27-i*2:14+i*2;r(x,18+i,5,2,"#af293b");r(x,32-i,5,2,"#af293b");}for(let i=0;i<8;i++)r(14+i*3,62,2,1,i%2?'#17242b':'#d5c7a0');}
}
const segments=[[1,1,10,2],[11,3,2,10],[11,15,2,10],[1,25,10,2],[-1,15,2,10],[-1,3,2,10],[1,13,10,2]];
const numeral=["1111110","0110000","1101101","1111001","0110011","1011011","1011111","1110000","1111111","1111011"];
export function drawRaceHud(c:CanvasRenderingContext2D,state:RaceSnapshot,track:TrackDefinition,points:ReturnType<typeof mapPoints>){
 const h=displayFor(track).height;c.clearRect(0,0,480,h);const speed=Math.round(state.player.speed*3.6),ratio=Math.min(1,state.player.speed/(track.profile==='reference'?65:100));
 // An original stepped rev ribbon and seven-segment instrument, matched in hierarchy to the source.
 c.save();if(track.profile==='reference'){c.translate(77,-.52);c.scale(.85,.76);}
 c.fillStyle="#10131c";c.fillRect(315,27,151,34);c.restore();c.save();if(track.profile==='reference'){c.translate(-21,-7);c.scale(1.1,.76);}for(let i=0;i<30;i++){const x=292+i*5,y=18+Math.max(0,7-i)*2;const color=i<14?'#80cb45':i<22?'#c4b44f':'#cd493d';c.fillStyle="#10131c";c.fillRect(x-1,y-1,5,9);c.fillStyle=i<ratio*30?color:'#383632';c.fillRect(x,y,3,7);}
 c.restore();c.save();if(track.profile==='reference'){c.translate(77,-.52);c.scale(.85,.76);}
 const digits=String(speed).padStart(3,'0');for(let digit=0;digit<3;digit++)for(let s=0;s<7;s++){const[x,y,w,h]=segments[s];c.fillStyle=numeral[Number(digits[digit])][s]==='1'?'#ef493f':'#21161d';c.fillRect(Math.round(325+digit*28+x*1.5),30+y,Math.round(w*1.5),h);}
 pixelText(c,'KM/H',417,47,1,'#ed5c53',false);
 const centiseconds=Math.round((state.result?.elapsed??state.elapsed)*100),clock=String(Math.floor(centiseconds/6000)).padStart(2,'0')+':'+String(Math.floor(centiseconds/100)%60).padStart(2,'0')+'.'+String(centiseconds%100).padStart(2,'0');
 if(track.profile==='reference'){c.restore();c.save();c.translate(345,49);c.scale(1.3,1);pixelText(c,clock,0,0,2);}else{c.fillStyle='#10131c';c.fillRect(344,64,108,19);pixelText(c,clock,348,67,2);}
 c.restore();
 const trace=(dx:number,dy:number,color:string,width:number)=>{c.strokeStyle=color;c.lineWidth=width;c.lineJoin='round';c.beginPath();points.forEach((p,i)=>{const x=10+p.x*.82+dx,y=4+p.y*.82+dy;if(i)c.lineTo(x,y);else c.moveTo(x,y);});c.stroke();};trace(2,2,'#383b42',5);trace(0,0,'#fff9e8',3);
 for(const car of state.cars){if(car.dnf)continue;const p=points[Math.min(points.length-1,Math.floor(((car.distance%track.length)/track.length)*points.length))];c.fillStyle=car.id===0?'#f7eb95':'#53334e';c.fillRect(Math.round(9+p.x*.82),Math.round(3+p.y*.82),car.id===0?4:2,car.id===0?4:2);}
 pixelText(c,`LAP ${state.lap}/3`,204,14,1);
 const fuelTop=h===180?74:117,fuelBottom=h===180?173:h-23,fuelStep=(fuelBottom-fuelTop)/40;c.fillStyle='#10131c';c.fillRect(459,fuelTop-2,13,fuelBottom-fuelTop+6);pixelText(c,'F',462,fuelTop-11,1);pixelText(c,'E',462,h-13,1);
 for(let i=0;i<40;i++){c.fillStyle=i<state.player.fuel*.4?(i<8?'#f15847':i<18?'#c6b54e':'#72c44a'):'#333a31';c.fillRect(462,Math.round(fuelBottom-i*fuelStep),7,Math.max(1,Math.floor(fuelStep)-1));}
 pixelText(c,'N X '+state.player.nitro,12,h-49,2);pixelText(c,'AUTO '+Math.max(1,Math.min(5,Math.ceil(speed/(track.profile==='reference'?43:62)))),12,h-22,2);
 const rank=String(state.position),suffix=state.position===1?'ST':state.position===2?'ND':state.position===3?'RD':'TH';pixelText(c,rank,398-rank.length*18,h-28,3);pixelText(c,suffix,402,h-17,1);
 if(state.phase==='racing'&&state.player.boost>0)pixelText(c,'NITRO',210,h-63,2,'#ffe98f');
 if(state.phase==='racing'&&state.player.fuel<20&&Math.floor(state.elapsed*2)%2===0)pixelText(c,'FUEL LOW',182,h-78,2,'#fff0a0');
}
