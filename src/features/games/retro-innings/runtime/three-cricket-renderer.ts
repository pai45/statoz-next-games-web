/* eslint-disable @typescript-eslint/no-explicit-any -- Opaque preserved simulation/art bridge; rendering does not mutate match state. */
import * as THREE from 'three';
import { CricketGround } from './cricket-ground';
import { bowlingPose, runningPose } from './cricket-motion';
import { deliveryLandingMarker, landingArrowRows } from './cricket-delivery-cue';

// Pixel presentation only. Authoritative cricket state stays in simulation.mjs.
export class CricketPresentation {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(0,256,0,224,.1,2000);
  private planes = new Map<string,THREE.BufferGeometry>();
  private materials = new Map<string,THREE.MeshBasicMaterial>();
  private pool: THREE.Mesh[]=[];
  private used=0;
  private hud=document.createElement('canvas');
  private turf=document.createElement('canvas');
  private hudTexture: THREE.CanvasTexture<HTMLCanvasElement|HTMLImageElement>;
  private turfTexture: THREE.CanvasTexture<HTMLCanvasElement|HTMLImageElement>;
  private disposed=false;
  private ground = new CricketGround();
  private landingCue: {screen:{x:number;y:number};stage:string}|null = null;
  public canvas:HTMLCanvasElement;
  public frames=0;
  constructor(private images:Record<string,HTMLImageElement>,canvas?:HTMLCanvasElement){
    this.canvas=canvas||document.createElement('canvas');
    this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:false,alpha:false,preserveDrawingBuffer:true,powerPreference:'low-power'});
    this.renderer.setPixelRatio(1);this.renderer.setSize(256,224,false);this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.camera.position.z=1000;this.scene.background=new THREE.Color('#292a30');
    this.hud.width=this.turf.width=256;this.hud.height=this.turf.height=224;
    this.hudTexture=this.texture(this.hud);this.turfTexture=this.texture(this.turf);
    this.materials.set('hud',new THREE.MeshBasicMaterial({side:THREE.DoubleSide,map:this.hudTexture,transparent:true,depthTest:false,depthWrite:false}));
    this.materials.set('turf',new THREE.MeshBasicMaterial({side:THREE.DoubleSide,map:this.turfTexture,depthTest:false,depthWrite:false}));
    for(const [key,im]of Object.entries(images))this.materials.set(key,new THREE.MeshBasicMaterial({side:THREE.DoubleSide,map:this.texture(im),transparent:true,depthTest:false,depthWrite:false}));
    this.canvas.addEventListener('webglcontextlost',this.lost);this.canvas.addEventListener('webglcontextrestored',this.restored);
  }
  private lost=(e:Event)=>{e.preventDefault();window.dispatchEvent(new Event('retro-graphics-lost'));};
  private restored=()=>window.dispatchEvent(new Event('retro-graphics-restored'));
  private texture(image:HTMLCanvasElement|HTMLImageElement){const t=new THREE.CanvasTexture(image);t.minFilter=t.magFilter=THREE.NearestFilter;t.generateMipmaps=false;t.colorSpace=THREE.SRGBColorSpace;return t;}
  private plane(key:string,w:number,h:number,region?:number[],image?:HTMLImageElement){
    if(this.planes.has(key))return this.planes.get(key)!;const g=new THREE.PlaneGeometry(w,h),uv=g.getAttribute('uv');
    for(let i=0;i<uv.count;i++){const u=uv.getX(i),v=uv.getY(i);uv.setXY(i,region&&image?(region[0]+u*region[2])/image.naturalWidth:u,region&&image?1-(region[1]+v*region[3])/image.naturalHeight:1-v);}uv.needsUpdate=true;this.planes.set(key,g);return g;
  }
  private mesh(g:THREE.BufferGeometry,m:THREE.MeshBasicMaterial,x:number,y:number,sx=1,sy=1){let a=this.pool[this.used];if(!a){a=new THREE.Mesh(g,m);a.frustumCulled=false;this.pool.push(a);this.scene.add(a);}a.geometry=g;a.material=m;a.position.set(x,y,0);a.scale.set(sx,sy,1);a.renderOrder=this.used++;a.visible=true;}
  private rect(x:number,y:number,w:number,h:number,color:string){const key='color:'+color;if(!this.materials.has(key))this.materials.set(key,new THREE.MeshBasicMaterial({side:THREE.DoubleSide,color,depthTest:false,depthWrite:false}));this.mesh(this.plane('unit',1,1),this.materials.get(key)!,Math.round(x)+w/2,Math.round(y)+h/2,w,h);}
  render(s:any,data:any,view:any){
    if(this.disposed)return;this.used=0;
    const p=(a:any)=>({x:a.x-s.camera.x,y:a.y-s.camera.y-(a.z||0)}),c=this.turf.getContext('2d')!;c.imageSmoothingEnabled=false;
    this.ground.paint(c,s.camera,this.images.pitch);this.turfTexture.needsUpdate=true;this.mesh(this.plane('screen',256,224),this.materials.get('turf')!,128,112);
    const aiming=s.innings!==s.match.playerBatInnings&&s.status==='playing'&&['ready','dead'].includes(s.phase);
    if(aiming){const q=p({x:408,y:375});for(let x=0;x<=48;x+=3){this.rect(q.x+x,q.y,2,1,'#fff2d0');this.rect(q.x+x,q.y+41,2,1,'#fff2d0');}for(let y=0;y<=41;y+=3){this.rect(q.x,q.y+y,1,2,'#fff2d0');this.rect(q.x+48,q.y+y,1,2,'#fff2d0');}}
    this.landingCue=aiming&&s.bowlAim?{screen:p(s.bowlAim.landing),stage:'selected'}:deliveryLandingMarker(s,data.families);
    if(this.landingCue){const q=this.landingCue.screen;for(const [shade,color] of [[1,'#005a00'],[0,'#fff']] as const){landingArrowRows.forEach((row,y)=>{let begin=-1;for(let x=0;x<=row.length;x++){if(row[x]==='#'&&begin<0)begin=x;if(row[x]!=='#'&&begin>=0){this.rect(q.x+begin-3+shade,q.y+y+shade,x-begin,1,color);begin=-1;}}});}}
    const layers:{depth:number,draw:()=>void}[]=[],queue=(depth:number,draw:()=>void)=>layers.push({depth,draw});
    const sprite=(key:string,r:any,x:number,y:number)=>{const q=p({x,y}),a=r.atlas,w=a[2],h=a[3];this.mesh(this.plane(key+':'+a.join(','),w,h,a,this.images[key]),this.materials.get(key)!,Math.round(q.x-r.ground[0])+w/2,Math.round(q.y-r.ground[1])+h/2);};
    const actor=(id:string,x:number,y:number)=>{const r=data.actors[id];if(r)queue(y,()=>sprite(id.startsWith('keeper-receive')||id==='keeper-hold'?'keeper':'actors',r,x,y));};
    // Observed source frames use short far-end wickets and larger near-end wickets.
    // These are presentation dimensions; authoritative wicket/contact geometry is unchanged.
    for(const y of [350,475]){const a=p({x:400,y});this.rect(a.x,a.y,66,1,'#e6e5bb');this.rect(a.x+4,a.y-8,1,16,'#e6e5bb');this.rect(a.x+60,a.y-8,1,16,'#e6e5bb');queue(y,()=>{const q=p({x:434,y}),height=y===350?9:14,gap=y===350?2:3;for(const x of[-gap,0,gap])this.rect(q.x+x,q.y-height,1,height,'#fff2d0');this.rect(q.x-gap-1,q.y-height-1,gap*2+3,1,'#fff2d0');});}
    if(!s.ball?.hit)actor(view.keeperPose,s.fielders[0].x,s.fielders[0].y);
    for(const f of s.fielders){if(!s.ball?.hit&&(f.id===0||f.id===10)||f.id===10&&s.phase==='delivery')continue;actor(view.fieldPoses[f.id],f.x,f.y);if(s.ball?.hit&&f.id===s.selected)queue(f.y+.01,()=>{const q=p(f);this.rect(q.x-3,q.y-31,7,1,'#fff2d0');this.rect(q.x-3,q.y-30,1,4,'#fff2d0');this.rect(q.x+3,q.y-30,1,4,'#fff2d0');this.rect(q.x-2,q.y-30,5,4,'#142614');this.rect(q.x-1,q.y-29,3,3,'#fff5d9');this.rect(q.x-2,q.y-26,5,1,'#fff2d0');this.rect(q.x-1,q.y-25,3,1,'#fff2d0');this.rect(q.x,q.y-24,1,1,'#fff2d0');});}
    if(!s.run.departed){const r=view.batterPose,o=view.batterOrigin;queue(o.y+r.ground[1],()=>{const q=p(o),a=r.atlas;this.mesh(this.plane('bat:'+a.join(','),a[2],a[3],a,this.images.bat),this.materials.get('bat')!,Math.round(q.x)+a[2]/2,Math.round(q.y)+a[3]/2);});actor('non-striker',412,479);}
    actor('umpire',446,490);if(!s.ball?.hit||s.phase==='delivery'){actor(bowlingPose(s),view.bowlerPosition.x,view.bowlerPosition.y);}
    if(s.run.departed)for(const r of view.runnerPositions)actor(runningPose(s,r),r.x,r.y);
    const crease=p({x:400,y:370});this.rect(crease.x,crease.y,66,1,'#fff');
    // A small red leather ball replaces the oversized white square. Colour/size are
    // authored from the saved footage, not recovered ROM sprite or collision data.
    if(s.ball){const shadow=p({x:s.ball.x,y:s.ball.y});this.rect(shadow.x-1,shadow.y,3,1,'#182820');queue(s.ball.y+.05,()=>{const q=p(s.ball);this.rect(q.x-1,q.y-1,3,3,'#641d16');this.rect(q.x-1,q.y-1,2,2,'#af3221');this.rect(q.x-1,q.y-1,1,1,'#e67b50');});}
    layers.sort((a,b)=>a.depth-b.depth);for(const l of layers)l.draw();
    const h=this.hud.getContext('2d')!;h.clearRect(0,0,256,224);const b=view.broadcast;
    const plate=(x:number,y:number,w:number,height:number)=>{h.fillStyle='#182718c0';h.fillRect(x,y,w,height);};
    // The source broadcast places compact white score text over the outfield,
    // without the large dark plate used by the earlier prototype.
    if(b.box){const x=b.box.x+24,y=b.box.y+8,team=b.team.slice(0,3).toUpperCase();
      h.textAlign='start';h.font='7px "Courier New"';h.fillStyle='#203018';h.fillText(team,x+1,y+1);h.fillStyle='#fff';h.fillText(team,x,y);
      h.font='bold 8px "Courier New"';h.fillStyle='#203018';h.fillText(b.score,x+1,y+11);h.fillStyle='#fff';h.fillText(b.score,x,y+10);
      h.font='6px "Courier New"';h.fillStyle='#203018';h.fillText(b.overs+' OV',x+1,y+19);h.fillStyle='#fff';h.fillText(b.overs+' OV',x,y+18);
    }
    const inset=view.runningInset;if(inset){const q=inset.box;plate(q.x,q.y,q.w,q.h);h.fillStyle='#b4a977';h.fillRect(q.x+8,inset.ends.striker.y,20,46);for(const y of[inset.ends.striker.y,inset.ends.strikerCrease.y,inset.ends.bowler.y]){h.fillStyle='#fff';h.fillRect(q.x+6,Math.round(y),24,1);}for(const r of inset.runners){h.fillStyle=r.id===0?'#fff5d9':'#fff';h.fillRect(Math.round(r.x)-1,Math.round(r.y)-1,3,3);}h.font='7px "Courier New"';h.fillStyle='#fff';h.fillText('S',q.x+2,inset.ends.striker.y+3);h.fillText('B',q.x+2,inset.ends.bowler.y+3);h.fillText('RUN '+inset.completed+(inset.provisional?'*':''),q.x+5,q.y+71);}
    if(b.banner){plate(42,89,172,46);h.textAlign='center';h.fillStyle='#fff5d9';h.font='bold 10px monospace';h.fillText(b.banner.title,128,107,160);h.fillStyle='#fff';h.font='8px "Courier New"';h.fillText(b.banner.detail,128,123,160);h.textAlign='start';}
    if(s.paused){h.fillStyle='#142614dd';h.fillRect(0,0,256,224);h.fillStyle='#fff';h.font='12px monospace';h.fillText('PAUSED',105,110);}this.hudTexture.needsUpdate=true;this.mesh(this.plane('screen',256,224),this.materials.get('hud')!,128,112);
    for(let i=this.used;i<this.pool.length;i++)this.pool[i].visible=false;this.renderer.render(this.scene,this.camera);this.frames++;
  }
  dispose(){if(this.disposed)return;this.disposed=true;this.canvas.removeEventListener('webglcontextlost',this.lost);this.canvas.removeEventListener('webglcontextrestored',this.restored);for(const g of this.planes.values())g.dispose();for(const m of this.materials.values()){m.map?.dispose();m.dispose();}this.scene.clear();this.pool=[];this.renderer.dispose();this.renderer.forceContextLoss();}
  diagnostics(){return{frames:this.frames,pool:this.pool.length,geometries:this.planes.size,materials:this.materials.size,disposed:this.disposed,renderer:this.renderer.info.render,landingCue:this.landingCue};}
}
