/** Original street-event backdrop after the reference venue: dark draped warehouse, warm
 * spot light, a dense standing crowd, a seated front row on the floor and a centre DJ booth.
 * Code-drawn; arrangement follows the reference footage, no pixels, logos or text copied. */
export function drawHoopsCrowd(c:CanvasRenderingContext2D,frame:number){
 const hash=(n:number)=>{let x=Math.imul(n+31,1597334677);x^=x>>>16;return(x>>>0)/4294967296;};
 const rect=(x:number,y:number,w:number,h:number,fill:string)=>{c.fillStyle=fill;c.fillRect(Math.round(x),Math.round(y),w,h);};
 const poly=(points:number[][],fill:string,ink?:string)=>{c.beginPath();points.forEach((p,i)=>i?c.lineTo(Math.round(p[0]),Math.round(p[1])):c.moveTo(Math.round(p[0]),Math.round(p[1])));c.closePath();c.fillStyle=fill;c.fill();if(ink){c.strokeStyle=ink;c.lineWidth=1;c.stroke();}};
 // Dark warehouse: drape folds and warm overhead pools of light.
 rect(0,0,900,164,'#0c0d0b');
 for(let x=0;x<900;x+=9){const fold=hash(x)*.5+.5;rect(x,0,5,96,fold>.75?'#1d1e17':'#151611');rect(x+5,0,1,96,'#22231b');}
 for(const [x,w] of [[150,220],[450,260],[760,220]] as const){c.save();c.globalAlpha=.16;c.fillStyle='#c79a4e';c.beginPath();c.ellipse(x,70,w/2,58,0,0,Math.PI*2);c.fill();c.globalAlpha=.1;c.beginPath();c.ellipse(x,90,w/2.6,44,0,0,Math.PI*2);c.fill();c.restore();}
 rect(0,96,900,68,'#141511');
 const skin=['#c98b52','#8e593c','#e0a56a','#a9703f','#6e4530','#d89a62'],tees=['#b9b08a','#8a8a80','#6c6a4a','#a49a70','#c8c4b0','#7a7466','#9c9478'],shorts=['#5a2a22','#4a3a2a','#3c3e40','#5e4a30','#2e2c2a'],caps=['#1c1c22','#8a2620','#d8d4c8','#2a3c5a'];
 const ink='#0b0b09';
 function arms(shoulder:number,y:number,tone:string,cloth:string,raise:boolean){
  if(raise){poly([[shoulder-11,y+12],[shoulder-17,y+4],[shoulder-16,y-9],[shoulder-11,y-9],[shoulder-11,y+2],[shoulder-6,y+8]],tone,ink);poly([[shoulder-17,y-9],[shoulder-17,y-14],[shoulder-12,y-16],[shoulder-10,y-11]],tone,ink);}
  else poly([[shoulder-11,y+11],[shoulder-14,y+18],[shoulder-8,y+27],[shoulder-3,y+28],[shoulder-5,y+20],[shoulder-6,y+14]],tone,ink);
  poly([[shoulder+10,y+11],[shoulder+14,y+18],[shoulder+9,y+27],[shoulder+4,y+28],[shoulder+6,y+20],[shoulder+6,y+14]],tone,ink);
  void cloth;
 }
 function head(x:number,y:number,id:number,tone:string){
  poly([[x-5,y-7],[x+3,y-7],[x+6,y-3],[x+5,y+4],[x+1,y+7],[x-4,y+4],[x-6,y]],tone,ink);
  poly([[x-5,y-2],[x-2,y],[x-2,y+4],[x+1,y+6],[x-4,y+4]],'#00000040');
  const cap=id%3===0,hair=['#15130f','#2c1c10','#4a3218'][id%3];
  poly([[x-6,y-3],[x-5,y-8],[x+2,y-9],[x+6,y-5],[x+3,y-3],[x,y-5]],cap?caps[id%caps.length]:hair,ink);
  if(cap&&id%2)rect(x-1,y-5,9,2,'#00000066');
  if(id%4===1){rect(x-3,y,7,2,'#0b0b0d');}else{rect(x-3,y+1,2,1,ink);rect(x+2,y+1,2,1,ink);}
  rect(x-1,y+4,3,1,'#4c3624');
 }
 function standing(x:number,y:number,id:number,far:boolean){
  const h=hash(id),tone=skin[id%skin.length],tee=tees[(id*3+1)%tees.length],short=shorts[id%shorts.length],lean=(hash(id+7)-.5)*4,shoulder=x+lean,hip=x-lean*.5;
  c.save();if(far){c.globalAlpha=.75;}
  head(x+(h-.5)*3,y,id,tone);
  // Muscular frame in a loose tee or tank with a generic printed number.
  poly([[shoulder-8,y+7],[shoulder+8,y+7],[shoulder+13,y+12],[hip+10,y+32],[hip-10,y+32],[shoulder-13,y+12]],tee,ink);
  poly([[shoulder+6,y+9],[shoulder+12,y+13],[hip+9,y+30],[hip+4,y+31],[shoulder+4,y+16]],'#00000038');
  if(id%2){c.fillStyle='#3a3226';c.font='bold 7px monospace';c.fillText(String(1+id%9),shoulder-2,y+22);}
  arms(shoulder,y,tone,tee,id%6===0&&(frame+id)%4<2);
  poly([[hip-10,y+31],[hip+10,y+31],[hip+11,y+44],[hip+1,y+45],[hip,y+40],[hip-2,y+45],[hip-11,y+44]],short,ink);
  poly([[hip-9,y+44],[hip-3,y+44],[hip-3,y+55],[hip-9,y+55]],tone,ink);poly([[hip+2,y+44],[hip+8,y+44],[hip+8,y+55],[hip+2,y+55]],tone,ink);
  rect(hip-11,y+54,9,3,'#1c1c1e');rect(hip+1,y+54,9,3,'#1c1c1e');rect(hip-10,y+53,7,1,'#d8d6cc');rect(hip+2,y+53,7,1,'#d8d6cc');
  c.restore();
 }
 function seated(x:number,y:number,id:number){
  const tone=skin[(id+2)%skin.length],tee=tees[(id*5)%tees.length],short=shorts[(id+1)%shorts.length];
  head(x,y,id,tone);
  poly([[x-8,y+7],[x+8,y+7],[x+12,y+12],[x+10,y+28],[x-10,y+28],[x-12,y+12]],tee,ink);
  poly([[x+5,y+9],[x+11,y+13],[x+9,y+26],[x+5,y+27],[x+4,y+15]],'#00000038');
  // Knees up, forearms resting on them, cross-legged feet.
  poly([[x-11,y+24],[x-2,y+22],[x-6,y+34],[x-15,y+36]],short,ink);poly([[x+2,y+22],[x+11,y+24],[x+15,y+36],[x+6,y+34]],short,ink);
  poly([[x-15,y+34],[x-6,y+33],[x-2,y+44],[x-10,y+46]],tone,ink);poly([[x+6,y+33],[x+15,y+34],[x+10,y+46],[x+2,y+44]],tone,ink);
  poly([[x-12,y+16],[x-2,y+27],[x-5,y+30],[x-15,y+20]],tone,ink);poly([[x+12,y+16],[x+15,y+20],[x+5,y+30],[x+2,y+27]],tone,ink);
  rect(x-12,y+45,10,3,'#1c1c1e');rect(x+2,y+45,10,3,'#1c1c1e');
 }
 // Back standing rows, then the DJ booth, then the seated front row on the floor.
 for(let i=0;i<34;i++){if(hash(i+400)<.12)continue;standing(i*27+4+Math.round(hash(i)*8),54+Math.round(hash(i+20)*7),i+200,true);}
 for(let i=0;i<30;i++){if(Math.abs(i*31+14-450)<70||hash(i+500)<.15)continue;standing(i*31+14+Math.round(hash(i+3)*8),70+Math.round(hash(i+33)*6),i+61,false);}
 // DJ booth: DJ with headphones behind turntables, original star banner (no copied lettering).
 const bx=450;
 rect(bx-14,74,28,30,'#b9b08a');poly([[bx-6,58],[bx+6,58],[bx+8,66],[bx+5,74],[bx-5,74],[bx-8,66]],'#c98b52',ink);rect(bx-9,60,18,3,'#1c1c22');rect(bx-10,62,3,7,'#1c1c22');rect(bx+7,62,3,7,'#1c1c22');
 rect(bx-62,96,124,4,'#2a2a2c');rect(bx-50,92,26,5,'#151517');rect(bx+24,92,26,5,'#151517');rect(bx-40,93,6,2,'#8a8c90');rect(bx+34,93,6,2,'#8a8c90');
 rect(bx-66,100,132,46,'#1c2a5c');rect(bx-66,100,132,3,'#2c3e7a');rect(bx-66,113,132,12,'#8a1e1e');rect(bx-66,113,132,1,'#b8302a');rect(bx-66,124,132,1,'#5a1414');rect(bx-66,143,132,3,'#101a3c');
 c.fillStyle='#e8e0c8';c.font='bold 11px monospace';c.textAlign='center';c.fillText('STREET',bx-26,123);c.fillText('JAM',bx+30,123);c.textAlign='start';
 poly([[bx+3,113],[bx+5,118],[bx+10,118],[bx+6,121],[bx+8,126],[bx+3,123],[bx-2,126],[bx,121],[bx-4,118],[bx+1,118]],'#f0c22e');
 for(let i=0;i<26;i++){const x=i*36+10+Math.round(hash(i+52)*8);if(Math.abs(x-450)<80||hash(i+600)<.2)continue;seated(x,108+Math.round(hash(i+52)*3),i+103);}
 // Floor edge where the crowd sits: same dark asphalt as the court, slightly shaded.
 rect(0,156,900,8,'#1e1f20');rect(0,163,900,1,'#2c2d2e');
}
