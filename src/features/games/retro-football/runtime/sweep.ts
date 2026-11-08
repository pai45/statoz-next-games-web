import type {World} from './contracts';
const distance=(a:World,b:World)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export function sweep(a:World,b:World,c:World,d:World,radius:number){
 const u={x:a.x-c.x,y:a.y-c.y,z:a.z-c.z},v={x:b.x-a.x-d.x+c.x,y:b.y-a.y-d.y+c.y,z:b.z-a.z-d.z+c.z};
 const aa=v.x*v.x+v.y*v.y+v.z*v.z,bb=2*(u.x*v.x+u.y*v.y+u.z*v.z),cc=u.x*u.x+u.y*u.y+u.z*u.z-radius*radius;
 let t:number;if(cc<=0)t=0;else{if(aa<1e-12)return null;const disc=bb*bb-4*aa*cc;if(disc<0)return null;t=(-bb-Math.sqrt(disc))/(2*aa);if(t<0||t>1)return null;}
 const lerp=(p:World,q:World):World=>({x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t,z:p.z+(q.z-p.z)*t});
 const anchor=lerp(a,b),ball=lerp(c,d);return{fraction:t,anchor,ball,distance:distance(anchor,ball)};
}
