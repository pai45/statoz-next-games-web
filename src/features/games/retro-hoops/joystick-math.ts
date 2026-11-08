/** Radial dead zone preserves every heading, with proportional speed outside it. */
export function joystickVector(dx:number,dy:number,radius:number){
  if(!Number.isFinite(dx)||!Number.isFinite(dy)||!Number.isFinite(radius)||radius<=0)return{x:0,y:0,thumbX:0,thumbY:0};
  const distance=Math.hypot(dx,dy),amount=Math.min(1,distance/radius),deadZone=.16;
  const speed=Math.max(0,(amount-deadZone)/(1-deadZone)),unitX=distance?dx/distance:0,unitY=distance?dy/distance:0;
  return{x:unitX*speed,y:unitY*speed,thumbX:unitX*amount*radius,thumbY:unitY*amount*radius};
}
