export const LAP = 2400;
export type Input = { left:boolean; right:boolean; gas:boolean; brake:boolean };
export type Race = { distance:number; x:number; speed:number; time:number; countdown:number; finished:boolean; cooldown:number; hits:number; bots:{distance:number;x:number;speed:number;color:string}[] };
export const emptyInput = ():Input => ({left:false,right:false,gas:false,brake:false});
export function newRace():Race { return {distance:0,x:0,speed:0,time:0,countdown:3,finished:false,cooldown:0,hits:0,bots:Array.from({length:5},(_,i)=>({distance:45+i*32,x:(i%3-1)*.58,speed:64+i*2,color:['#5cdfff','#fdc700','#b28aff','#fafafa','#ff8904'][i]}))}; }
export function curve(distance:number) { return Math.sin(distance/LAP*Math.PI*4)*.45 + Math.sin(distance/LAP*Math.PI*8)*.18; }
export function position(s:Race) { return 1+s.bots.filter(b=>b.distance>s.distance).length; }
export function step(s:Race,i:Input,dt:number) {
 if(s.finished)return;
 if(s.countdown>0){s.countdown=Math.max(0,s.countdown-dt);return;}
 s.time+=dt;s.cooldown=Math.max(0,s.cooldown-dt);
 const off=Math.abs(s.x)>1;
 s.speed=Math.max(0,Math.min(108,s.speed+((i.brake?-95:i.gas?32:-14)-(off?48:0))*dt));
 s.x+=((Number(i.right)-Number(i.left))*(.3+s.speed/65)-curve(s.distance)*s.speed/65)*dt;
 s.x=Math.max(-1.65,Math.min(1.65,s.x));s.distance+=s.speed*dt;
 for(const b of s.bots){b.distance+=b.speed*dt;if(s.cooldown===0&&Math.abs(b.distance-s.distance)<8&&Math.abs(b.x-s.x)<.25){s.speed*=.53;s.cooldown=1.2;s.hits++;}}
 if(s.distance>=LAP*3){s.distance=LAP*3;s.finished=true;s.speed=0;}
}
export function draw(ctx:CanvasRenderingContext2D,w:number,h:number,s:Race) {
 const horizon=h*.34;
 const sky=ctx.createLinearGradient(0,0,0,horizon);sky.addColorStop(0,'#102239');sky.addColorStop(1,'#edb08a');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
 ctx.fillStyle='#e7c29b';ctx.beginPath();ctx.arc(w*.77,h*.16,h*.055,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#263d47';ctx.beginPath();ctx.moveTo(0,horizon);for(let x=0;x<=w;x+=w/25)ctx.lineTo(x,horizon-h*.08*(1+Math.sin(x*.012)+.5*Math.sin(x*.035)));ctx.lineTo(w,horizon);ctx.fill();
 const project=(z:number)=>{const p=1-z/650;return {y:horizon+(h-horizon)*p*p,half:w*.62*p+.5,center:w/2+curve(s.distance+z)*w*.3*p*(1-p)-s.x*w*.23*p};};
 for(let n=79;n>=0;n--){const z=n*8,a=project(z),b=project(z+8),stripe=Math.floor((s.distance+z)/28)%2===0;
 ctx.fillStyle=stripe?'#476b55':'#42644e';ctx.fillRect(0,b.y,w,a.y-b.y+1);
 const quad=(l:number,r:number,color:string)=>{ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(a.center+a.half*l,a.y+1);ctx.lineTo(a.center+a.half*r,a.y+1);ctx.lineTo(b.center+b.half*r,b.y-1);ctx.lineTo(b.center+b.half*l,b.y-1);ctx.closePath();ctx.fill();};
 quad(-1.08,1.08,stripe?'#eee8dc':'#cc4e42');quad(-1,1,stripe?'#41474f':'#3e444c');
 if(stripe){quad(-.345,-.325,'#bbc1c3');quad(.325,.345,'#bbc1c3');}
 if((s.distance+z)%LAP<12)quad(-1,1,'#e9e5d8');
 }
 const car=(x:number,y:number,size:number,color:string)=>{ctx.save();ctx.translate(x,y);ctx.fillStyle='#0005';ctx.beginPath();ctx.ellipse(0,size*.05,size*.62,size*.21,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#101519';for(const side of [-1,1]){ctx.fillRect(side*size*.43-size*.1,-size*.65,size*.2,size*.38);ctx.fillRect(side*size*.47-size*.12,-size*.13,size*.24,size*.4);}ctx.fillStyle=color;ctx.fillRect(-size*.12,-size*.9,size*.24,size*.92);ctx.fillRect(-size*.43,-size*.78,size*.86,size*.12);ctx.fillRect(-size*.4,size*.12,size*.8,size*.16);ctx.beginPath();ctx.moveTo(-size*.12,-size*.65);ctx.lineTo(-size*.3,size*.2);ctx.lineTo(size*.3,size*.2);ctx.lineTo(size*.12,-size*.65);ctx.fill();ctx.fillStyle='#131c26';ctx.fillRect(-size*.12,-size*.35,size*.24,size*.28);ctx.fillStyle='#ece8d8';ctx.fillRect(-size*.07,-size*.3,size*.14,size*.12);ctx.restore();};
 for(const b of [...s.bots].sort((a,b)=>b.distance-a.distance)){const z=b.distance-s.distance;if(z>0&&z<620){const p=project(z);car(p.center+b.x*p.half,p.y,Math.max(3,(1-z/650)*h*.17),b.color);}}
 car(w/2,h*.85,h*.24,s.cooldown>.9?'#fafafa':'#f42d29');
 if(Math.abs(s.x)>1){ctx.fillStyle='#ffcb75';ctx.font=`bold ${Math.max(12,h*.035)}px sans-serif`;ctx.textAlign='center';ctx.fillText('OFF TRACK — EASE BACK ON',w/2,h*.43);}
}
