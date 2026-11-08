/** Integer-cell drawing and lossless rectangle packing. No canvas/raster inputs. */
export class Pixels {
 constructor(w,h){this.w=w;this.h=h;this.cells=Array(w*h).fill(null);}
 set(x,y,c){x=Math.round(x);y=Math.round(y);if(x>=0&&y>=0&&x<this.w&&y<this.h)this.cells[y*this.w+x]=c;}
 rect(x,y,w,h,c){for(let yy=Math.round(y);yy<Math.round(y+h);yy++)for(let xx=Math.round(x);xx<Math.round(x+w);xx++)this.set(xx,yy,c);}
 polygon(points,c){
  const ps=points.map(([x,y])=>[Math.round(x),Math.round(y)]);
  const min=Math.max(0,Math.min(...ps.map(p=>p[1]))),max=Math.min(this.h-1,Math.max(...ps.map(p=>p[1])));
  for(let y=min;y<=max;y++){const xs=[];for(let i=0;i<ps.length;i++){const [a,b]=[ps[i],ps[(i+1)%ps.length]];if((a[1]<=y+.5&&b[1]>y+.5)||(b[1]<=y+.5&&a[1]>y+.5))xs.push(a[0]+(y+.5-a[1])*(b[0]-a[0])/(b[1]-a[1]));}xs.sort((a,b)=>a-b);for(let i=0;i<xs.length;i+=2)this.rect(Math.ceil(xs[i]-.5),y,Math.ceil(xs[i+1]-.5)-Math.ceil(xs[i]-.5),1,c);}
 }
 line(a,b,width,c){const dx=b[0]-a[0],dy=b[1]-a[1],steps=Math.max(Math.abs(dx),Math.abs(dy),1);for(let i=0;i<=steps;i++){const x=a[0]+dx*i/steps,y=a[1]+dy*i/steps;this.rect(Math.round(x-width/2),Math.round(y-width/2),Math.max(1,width),Math.max(1,width),c);}}
 ellipse(x,y,rx,ry,c){for(let yy=Math.floor(y-ry);yy<=y+ry;yy++)for(let xx=Math.floor(x-rx);xx<=x+rx;xx++)if(((xx-x)/rx)**2+((yy-y)/ry)**2<=1)this.set(xx,yy,c);}
 stamp(other,x,y){for(let yy=0;yy<other.h;yy++)for(let xx=0;xx<other.w;xx++){const c=other.cells[yy*other.w+xx];if(c)this.set(xx+x,yy+y,c);}}
 packed(){
  const rects=[],active=new Map();
  for(let y=0;y<this.h;y++){
   const next=new Map();
   for(let x=0;x<this.w;){const color=this.cells[y*this.w+x],start=x;while(x<this.w&&this.cells[y*this.w+x]===color)x++;if(!color)continue;const key=`${start}:${x-start}:${color}`,old=active.get(key);if(old){old.h++;next.set(key,old);}else{const item={x:start,y,w:x-start,h:1,color};rects.push(item);next.set(key,item);}}
   active.clear();for(const [key,value]of next)active.set(key,value);
  }
  return rects;
 }
}
export const fixed=k=>({a:0,k});
export const color=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).concat(1);
export function transform(){return {ty:'tr',p:fixed([0,0]),a:fixed([0,0]),s:fixed([100,100]),r:fixed(0),o:fixed(100),sk:fixed(0),sa:fixed(0)};}
export function shapes(pixel){
 const colors=new Map();for(const rect of pixel.packed()){if(!colors.has(rect.color))colors.set(rect.color,[]);colors.get(rect.color).push({ty:'rc',d:1,p:fixed([rect.x+rect.w/2,rect.y+rect.h/2]),s:fixed([rect.w,rect.h]),r:fixed(0)});}
 return [...colors].map(([c,rects])=>({ty:'gr',nm:`Pixel clusters ${c}`,it:[...rects,{ty:'fl',c:fixed(color(c)),o:fixed(100),r:1},transform()]}));
}
export function svg(pixel,label='Authored pixel cricket artwork'){
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${pixel.w}" height="${pixel.h}" viewBox="0 0 ${pixel.w} ${pixel.h}" shape-rendering="crispEdges" aria-label="${label}">${pixel.packed().map(r=>`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${r.color}"/>`).join('')}</svg>`;
}
