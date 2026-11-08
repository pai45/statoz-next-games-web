import {paintStartGantry} from './start-gantry-art';
import {gantryPresentation} from './gantry-presentation';
import {finishPresentation} from './finish-presentation';
import {paintHiroshimaPanorama} from './hiroshima-art';
import {hiroshimaPalette} from './hiroshima-presentation';
import * as THREE from "three";
import {poses,carPixels,farCarPixels,overheadCarPixels,paintPixels,turnAmountFor,carPoseAnchors,carFamilyMetadata,type CarPose} from './car-family';
import {displayFor,sequenceFor} from './fidelity';
import { sampleTrack, vehicles, biomeFor, propSpacing, roadsideProp,modulo } from "./data";
import { projectedCar, roadProjection, CAMERA_TRAIL, cameraDistance, mapPoints, type ProjectionCalibration } from "./projection";
import {drawRaceHud,pixelText} from "./presentation";
import type { CarState, RaceSnapshot, TrackDefinition } from "./types";
import {paintEnhancedPanorama,paintEnhancedProp,paintObstacle} from './environment-art';

/** One production renderer for live play and deterministic review captures. */
export class CircuitRenderer {
  readonly renderer:THREE.WebGLRenderer;
  private scene=new THREE.Scene();
  private camera=new THREE.OrthographicCamera(0,480,0,270,-100,100);
  private road:THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>;
  private positions=new Float32Array(80*24*6*3);
  private colors=new Float32Array(80*24*6*3);
  private textures:THREE.Texture[]=[];
  private materials=new Map<string,THREE.MeshBasicMaterial>();
  private cars:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>[]=[];
  private scenery:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>[]=[];
  private sceneryMaterials:THREE.MeshBasicMaterial[]=[];
  private propMaterials:THREE.MeshBasicMaterial[]=[];
  private geometry=new THREE.PlaneGeometry(1,1);
  private disposed=false;
  private onLost:(event:Event)=>void;
  private scratchColor=new THREE.Color();
  private billboardMaterials:THREE.MeshBasicMaterial[]=[];
  private daylightPanorama?:THREE.MeshBasicMaterial;
  private panorama:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>;
  private hudCanvas=document.createElement('canvas');
  private hudTexture:THREE.CanvasTexture;
  private map;
  private display;
  private overhead=new Map<string,HTMLCanvasElement>();
  private shadows:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>[]=[];
  private obstacles:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>[]=[];
  private obstacleMaterials=new Map<string,THREE.MeshBasicMaterial>();
  private gantry?:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>;
  private gantryLegs?:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>;
  private gantryGeometries:THREE.PlaneGeometry[]=[];
  private gantryFrame:ReturnType<typeof gantryPresentation>=null;
  private playerFrame:Record<string,number|boolean|string>|null=null;
  inspection=false;
  calibration:Partial<ProjectionCalibration>={};
  constructor(canvas:HTMLCanvasElement,readonly track:TrackDefinition,onError:(message:string)=>void){
    this.display=displayFor(track);this.camera=new THREE.OrthographicCamera(0,480,0,this.display.height,-100,100);
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:"low-power",preserveDrawingBuffer:true});
    this.renderer.setPixelRatio(1);this.renderer.setSize(480,this.display.height,false);this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.localClippingEnabled=true;
    this.scene.background=new THREE.Color(track.sky);
    const geom=new THREE.BufferGeometry();geom.setAttribute("position",new THREE.BufferAttribute(this.positions,3).setUsage(THREE.DynamicDrawUsage));geom.setAttribute("color",new THREE.BufferAttribute(this.colors,3).setUsage(THREE.DynamicDrawUsage));
    this.road=new THREE.Mesh(geom,new THREE.MeshBasicMaterial({vertexColors:true,depthTest:false,side:THREE.DoubleSide}));this.road.frustumCulled=false;this.road.renderOrder=2;this.scene.add(this.road);
    const panoramaCanvas=document.createElement('canvas');panoramaCanvas.width=1024;panoramaCanvas.height=140;const pc=panoramaCanvas.getContext('2d')!;pc.imageSmoothingEnabled=false;paintEnhancedPanorama(pc,track);
    const panoramaTexture=new THREE.CanvasTexture(panoramaCanvas);panoramaTexture.magFilter=panoramaTexture.minFilter=THREE.NearestFilter;panoramaTexture.colorSpace=THREE.SRGBColorSpace;panoramaTexture.wrapS=THREE.RepeatWrapping;this.textures.push(panoramaTexture);
    const panoramaMaterial=new THREE.MeshBasicMaterial({map:panoramaTexture,depthTest:false,side:THREE.DoubleSide});this.sceneryMaterials.push(panoramaMaterial);this.panorama=new THREE.Mesh(this.geometry,panoramaMaterial);this.panorama.position.set(240,this.display.ground/2,0);this.panorama.scale.set(1024,-this.display.ground,1);this.panorama.renderOrder=1;this.scene.add(this.panorama);
    if(track.id==='night'){
      const day=document.createElement('canvas');day.width=1024;day.height=140;paintHiroshimaPanorama(day.getContext('2d')!,true);
      const texture=new THREE.CanvasTexture(day);texture.magFilter=texture.minFilter=THREE.NearestFilter;texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=THREE.RepeatWrapping;this.textures.push(texture);
      this.daylightPanorama=new THREE.MeshBasicMaterial({map:texture,depthTest:false,side:THREE.DoubleSide});this.sceneryMaterials.push(this.daylightPanorama);
    }
    this.rect(0,this.display.ground,480,this.display.height-this.display.ground,track.ground,0);
    this.hudCanvas.width=480;this.hudCanvas.height=this.display.height;this.hudTexture=new THREE.CanvasTexture(this.hudCanvas);this.hudTexture.magFilter=this.hudTexture.minFilter=THREE.NearestFilter;this.hudTexture.colorSpace=THREE.SRGBColorSpace;this.textures.push(this.hudTexture);
    const hudMaterial=new THREE.MeshBasicMaterial({map:this.hudTexture,transparent:true,depthTest:false,side:THREE.DoubleSide});this.sceneryMaterials.push(hudMaterial);const hud=new THREE.Mesh(this.geometry,hudMaterial);hud.position.set(240,this.display.height/2,0);hud.scale.set(480,-this.display.height,1);hud.renderOrder=10000;this.scene.add(hud);this.map=mapPoints(track);
    for(const vehicle of vehicles){
      for(const pose of [...poses,'soft-left','soft-right'] as const)for(let frame=0;frame<2;frame++){
        const c=document.createElement('canvas');c.width=80;c.height=40;paintPixels(c.getContext('2d')!,carPixels(vehicle.id,pose==='soft-left'?'left':pose==='soft-right'?'right':pose,frame,pose.startsWith('soft-')?.5:1));
        const texture=new THREE.CanvasTexture(c);texture.magFilter=texture.minFilter=THREE.NearestFilter;texture.colorSpace=THREE.SRGBColorSpace;this.textures.push(texture);
        this.materials.set(vehicle.id+'/'+pose+'/'+frame,new THREE.MeshBasicMaterial({map:texture,transparent:true,depthTest:false,side:THREE.DoubleSide}));
      }
      const far=document.createElement('canvas');far.width=80;far.height=40;const fc=far.getContext('2d')!;const native=document.createElement('canvas');native.width=24;native.height=14;paintPixels(native.getContext('2d')!,farCarPixels(vehicle.id));fc.imageSmoothingEnabled=false;fc.drawImage(native,10,34-carFamilyMetadata.far.anchor[1]*2.5,60,35);
      const ft=new THREE.CanvasTexture(far);ft.magFilter=ft.minFilter=THREE.NearestFilter;ft.colorSpace=THREE.SRGBColorSpace;this.textures.push(ft);this.materials.set(vehicle.id+'/far',new THREE.MeshBasicMaterial({map:ft,transparent:true,depthTest:false,side:THREE.DoubleSide}));
      const overhead=document.createElement('canvas');overhead.width=48;overhead.height=80;paintPixels(overhead.getContext('2d')!,overheadCarPixels(vehicle.id));this.overhead.set(vehicle.id,overhead);
    }
    const shadowCanvas=document.createElement('canvas');shadowCanvas.width=80;shadowCanvas.height=12;const sc=shadowCanvas.getContext('2d')!;sc.fillStyle='#111318';sc.beginPath();sc.ellipse(40,6,26,4,0,0,Math.PI*2);sc.fill();const shadowTexture=new THREE.CanvasTexture(shadowCanvas);shadowTexture.magFilter=shadowTexture.minFilter=THREE.NearestFilter;this.textures.push(shadowTexture);
    for(let i=0;i<20;i++){const material=this.materials.get('vector/straight/0')!.clone();material.clippingPlanes=[new THREE.Plane(new THREE.Vector3(0,-1,0),270)];this.billboardMaterials.push(material);const mesh=new THREE.Mesh(this.geometry,material);mesh.frustumCulled=false;this.cars.push(mesh);this.scene.add(mesh);const sm=new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,opacity:.6,depthTest:false,side:THREE.DoubleSide});sm.clippingPlanes=[new THREE.Plane(new THREE.Vector3(0,-1,0),270)];this.billboardMaterials.push(sm);const shadow=new THREE.Mesh(this.geometry,sm);this.shadows.push(shadow);this.scene.add(shadow);}
    for(let kind=0;kind<8;kind++)this.propMaterials.push(this.makeScenery(kind));
    for(let i=0;i<44;i++){const material=this.propMaterials[0].clone();material.clippingPlanes=[new THREE.Plane(new THREE.Vector3(0,-1,0),270)];this.billboardMaterials.push(material);const mesh=new THREE.Mesh(this.geometry,material);mesh.frustumCulled=false;this.scenery.push(mesh);this.scene.add(mesh);}
    for(const kind of ['cone','barrel','barrier','rock'] as const){const c=document.createElement('canvas');c.width=c.height=64;paintObstacle(c.getContext('2d')!,kind);const t=new THREE.CanvasTexture(c);t.magFilter=t.minFilter=THREE.NearestFilter;t.colorSpace=THREE.SRGBColorSpace;this.textures.push(t);const m=new THREE.MeshBasicMaterial({map:t,transparent:true,depthTest:false,side:THREE.DoubleSide});this.obstacleMaterials.set(kind,m);}
    for(const obstacle of track.obstacles){const m=this.obstacleMaterials.get(obstacle.kind)!.clone();m.clippingPlanes=[new THREE.Plane(new THREE.Vector3(0,-1,0),270)];this.billboardMaterials.push(m);const mesh=new THREE.Mesh(this.geometry,m);mesh.frustumCulled=false;this.obstacles.push(mesh);this.scene.add(mesh);}
    if(track.profile==='reference'){
      const c=document.createElement('canvas');c.width=256;c.height=96;paintStartGantry(c.getContext('2d')!);
      const texture=new THREE.CanvasTexture(c);texture.magFilter=texture.minFilter=THREE.NearestFilter;texture.colorSpace=THREE.SRGBColorSpace;this.textures.push(texture);
      const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthTest:false,side:THREE.DoubleSide});material.clippingPlanes=[new THREE.Plane(new THREE.Vector3(0,-1,0),this.display.height)];this.billboardMaterials.push(material);
      const header=new THREE.PlaneGeometry(1,1),legs=new THREE.PlaneGeometry(1,1);
      for(const [geometry,upper]of [[header,true],[legs,false]]as const){const uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setY(i,upper?2/3+uv.getY(i)/3:uv.getY(i)*2/3);this.gantryGeometries.push(geometry);}
      this.gantry=new THREE.Mesh(header,material);this.gantryLegs=new THREE.Mesh(legs,material);
      for(const mesh of [this.gantry,this.gantryLegs]){mesh.frustumCulled=false;mesh.visible=false;this.scene.add(mesh);}
    }
    this.onLost=event=>{event.preventDefault();onError("Graphics interrupted. Return to the garage and retry.");};canvas.addEventListener("webglcontextlost",this.onLost);
  }
  private rect(x:number,y:number,w:number,h:number,color:string,order=0){const material=new THREE.MeshBasicMaterial({color,depthTest:false,side:THREE.DoubleSide});this.sceneryMaterials.push(material);const mesh=new THREE.Mesh(this.geometry,material);mesh.position.set(x+w/2,y+h/2,0);mesh.scale.set(w,h,1);mesh.renderOrder=order;this.scene.add(mesh);}
  private makeScenery(kind:number){
    const c=document.createElement('canvas');c.width=64;c.height=96;const ctx=c.getContext('2d')!;ctx.imageSmoothingEnabled=false;paintEnhancedProp(ctx,this.track,kind);
    const texture=new THREE.CanvasTexture(c);texture.magFilter=texture.minFilter=THREE.NearestFilter;texture.colorSpace=THREE.SRGBColorSpace;this.textures.push(texture);return new THREE.MeshBasicMaterial({map:texture,transparent:true,depthTest:false,side:THREE.DoubleSide});
  }

  render(state:RaceSnapshot,previous?:readonly CarState[],alpha=1,inputSteer=0,braking=false){
    if(this.disposed)return;
    void inputSteer; // Host signature retained; pose steering comes from simulation.
    const lerp=(a:number,b:number)=>a+(b-a)*alpha;
    const player=state.phase==='finished'&&this.track.profile==='reference'?{...state.player}:previous?{...state.player,distance:lerp(previous[0].distance,state.player.distance),x:lerp(previous[0].x,state.player.x),steering:lerp(previous[0].steering,state.player.steering)}:{...state.player};
    if(state.phase==='finished'&&this.track.profile!=='reference'&&state.sequenceTime>0)player.distance+=Math.min(85,state.sequenceTime*35);
    const darkRoad=this.track.id==='night'&&player.distance<this.track.length;
    const palette=this.track.id==='night'?hiroshimaPalette(player.distance,this.track.length):this.track;
    if(this.track.id==='night'){
      this.panorama.material=player.distance>=this.track.length?this.daylightPanorama!:this.sceneryMaterials[0];
      (this.scene.background as THREE.Color).set(palette.sky);
    }
    const view={...state,player},departure=finishPresentation(view,this.track,this.calibration),points=departure?.points??roadProjection(view,this.track,this.calibration);let vertex=0;
    const quad=(a:{x:number;y:number;half:number},b:{x:number;y:number;half:number},left:number,right:number,color:string)=>{
      const c=this.scratchColor.set(color),xy=[a.x+a.half*left,a.y,a.x+a.half*right,a.y,b.x+b.half*right,b.y,a.x+a.half*left,a.y,b.x+b.half*right,b.y,b.x+b.half*left,b.y];
      for(let i=0;i<6;i++){const k=vertex++*3;this.positions[k]=xy[i*2];this.positions[k+1]=xy[i*2+1];this.positions[k+2]=0;this.colors[k]=c.r;this.colors[k+1]=c.g;this.colors[k+2]=c.b;}
    };
    for(let i=points.length-2;i>=0;i--){let a=points[i];const b=points[i+1],clip=Math.min(this.display.height,points[i].nearClip);
      if(b.y>=a.y||b.y>=clip)continue;
      if(a.y>clip){const t=(clip-a.y)/(b.y-a.y);a={...a,x:a.x+(b.x-a.x)*t,y:clip,half:a.half+(b.half-a.half)*t};}
      const ground=a.stripe?palette.ground:palette.verge;
      quad(a,b,-40,40,ground);quad(a,b,-1.045,1.045,darkRoad?(a.stripe?"#625e51":"#3e1710"):a.stripe?"#efebe2":"#bd2319");quad(a,b,-1,1,palette.road[Number(a.stripe)]);
      if(this.track.id==='night'&&player.distance<this.track.length&&a.distance>=96&&a.distance<144){const spread=.20+a.distance/700;quad(a,b,player.x-spread,player.x+spread,a.stripe?'#596761':'#52615a');}
      for(const lane of [-.333,.333])quad(a,b,lane-.022,lane+.022,a.stripe?(darkRoad?"#77796b":"#e6e8df"):palette.road[1]);
      // LA retains both alternating curbs. The pit shoulder starts outside the curb;
      // an ordinary verge must not paint over its positive-side edge.
      if(['harbour','night'].includes(this.track.id)){
        if(a.pit){quad(a,b,1.045,1.5,"#586f72");quad(a,b,1.055,1.075,"#d9c488");}
      }else{quad(a,b,1,1.5,a.pit?"#586f72":this.track.ground);quad(a,b,1.015,1.035,a.pit?"#d9c488":this.track.ground);}
      // Narrow shoulder paint, a worn centre strip and stable roadside tufts.
      // These use road-distance segments, so detail advances with the road.
      quad(a,b,-.985,-.974,darkRoad?'#20251f':'#9eaaa0');quad(a,b,.974,.985,darkRoad?'#20251f':'#9eaaa0');
      if(!darkRoad)quad(a,b,-.10,.10,biomeFor(this.track)==='city'?(a.stripe?'#303542':'#3b414e'):(a.stripe?'#384b50':'#405256'));
      if(!darkRoad&&biomeFor(this.track)!=='desert'){quad(a,b,-1.29,-1.26,a.stripe?'#c3c7be':'#788a8a');quad(a,b,1.26,1.29,a.pit?this.track.ground:a.stripe?'#c3c7be':'#788a8a');}
      const world=modulo(player.distance-CAMERA_TRAIL+a.distance,this.track.length);
      if(world<28){for(let square=0;square<18;square++)quad(a,b,-1+square/9,-1+(square+1)/9,(square+Math.floor(world/14))%2?'#f1eee2':'#111b24');}
      if(i<24&&!darkRoad){const patch=(Math.floor((player.distance-CAMERA_TRAIL+a.distance)/24)*17)%7/13;
        quad(a,b,-1.55-patch,-1.53-patch,biomeFor(this.track)==='coast'?'#4e9b51':biomeFor(this.track)==='desert'?'#e3b58a':'#697080');
        quad(a,b,1.7+patch,1.73+patch,biomeFor(this.track)==='coast'?'#1e6e3c':biomeFor(this.track)==='desert'?'#a87c60':'#30364d');}
    }
    this.road.geometry.setDrawRange(0,vertex);this.road.geometry.attributes.position.needsUpdate=true;this.road.geometry.attributes.color.needsUpdate=true;
    this.gantryFrame=this.gantry?gantryPresentation(view,this.track,points):null;
    if(this.gantry){const arch=this.gantryFrame;this.gantry.visible=!!arch&&arch.visible;this.gantryLegs!.visible=this.gantry.visible;
      if(arch){this.gantry.material.clippingPlanes![0].constant=arch.clip;this.gantry.position.set(Math.round(arch.x),arch.headerY+Math.round(arch.y)-arch.y,0);this.gantry.scale.set(arch.width,-arch.headerHeight,1);this.gantryLegs!.position.set(Math.round(arch.x),arch.legsY+Math.round(arch.y)-arch.y,0);this.gantryLegs!.scale.set(arch.width,-arch.legsHeight,1);this.gantry.renderOrder=this.gantryLegs!.renderOrder=3000-Math.floor(arch.distance)+.05;}
    }
    for(const car of state.cars){
      const mesh=this.cars[car.id],prior=previous?.[car.id],distance=car.id===0?(departure?.distance??CAMERA_TRAIL+(state.phase==='finished'?state.sequenceTime*75:0)):cameraDistance(lerp(prior?.distance??car.distance,car.distance)+(departure?car.speed*state.sequenceTime:0),player.distance,this.track.length);
      const x=car.id===0?player.x:lerp(prior?.x??car.x,car.x),p=car.id===0&&departure?departure.ego:projectedCar(distance,x,points);mesh.visible=!!p&&p.y-78*p.scale<p.occlusion&&distance>=0&&(!departure||car.id!==0||p.visible)&&!(departure&&this.inspection&&car.id!==0)&&(car.id===0||(!car.dnf&&car.finishedAt===null));
      const shadow=this.shadows[car.id];shadow.visible=mesh.visible;if(!p)continue;
      let pose:CarPose=car.collisionCooldown>0?"contact":car.boost>0?"boost":(car.id===0&&braking)||(car.id!==0&&!!prior&&car.speed<prior.speed-.08)?"brake":car.id===0&&player.steering<-.18?"left":car.id===0&&player.steering>.18?"right":"straight";
      if(car.id===0&&departure)pose=car.steering<-.18?'left':car.steering>.18?'right':'straight';
      if(car.id!==0&&['straight','left','right'].includes(pose))pose=car.steering<-.18?'left':car.steering>.18?'right':Math.abs(sampleTrack(this.track,car.distance).curve)>.25?(sampleTrack(this.track,car.distance).curve>0?'right':'left'):'straight';
      const steering=car.id===0?player.steering:lerp(prior?.steering??car.steering,car.steering);
      const roadTurn=sampleTrack(this.track,car.distance).curve;
      const visualSteering=car.id!==0&&Math.abs(steering)<.18&&Math.abs(roadTurn)>.25?Math.sign(roadTurn)*.5:steering;
      const turn=turnAmountFor(visualSteering);
      // Brake lights and boost plumes are separate effects: they must not mask steering.
      const poseKey=!departure&&car.collisionCooldown<=0&&turn!==0?(Math.abs(turn)===.5?'soft-':'')+(turn<0?'left':'right'):car.id===0&&pose==='boost'?'straight':pose;
      mesh.material.map=((car.id===0&&departure?departure.distant:distance>300)&&this.materials.has(car.vehicle+'/far')?this.materials.get(car.vehicle+'/far'):this.materials.get(`${car.vehicle}/${poseKey}/${Math.floor(state.elapsed*12)%2}`))!.map;mesh.material.clippingPlanes![0].constant=p.occlusion;
      const scale=p.scale*2.1;
      const contact=car.collisionCooldown>0&&!(car.id===0&&departure)?(Math.floor(state.elapsed*25)%2?2:-2):0;
      if(car.id===0)this.playerFrame={x:p.x,y:p.y,scale:p.scale,clip:p.occlusion,visible:mesh.visible,distant:departure?.distant??distance>300,pose:poseKey,steering:player.steering};
      // Native art proportions are preserved on both axes.
      const verticalScale=scale;mesh.scale.set(80*scale,-40*verticalScale,1);mesh.position.set(Math.round(p.x)+contact,Math.round(p.y-14*verticalScale),1);mesh.renderOrder=3000-Math.floor(distance);
      shadow.visible=mesh.visible&&p.visible;shadow.position.set(Math.round(p.x),Math.round(p.y+1),0);shadow.scale.set(80*scale,-12*scale,1);shadow.renderOrder=mesh.renderOrder-.1;shadow.material.clippingPlanes![0].constant=p.occlusion;
    }
    for(let i=0;i<this.scenery.length;i++){
      const spacing=propSpacing(this.track),index=Math.floor((player.distance-CAMERA_TRAIL)/spacing)+i+1,d=cameraDistance(index*spacing,player.distance,this.track.length),prop=roadsideProp(this.track,index);
      const p=projectedCar(d,prop.x,points),mesh=this.scenery[i];mesh.visible=!departure&&!!p&&p.y-104*p.scale<p.occlusion;if(!p)continue;
      mesh.material.map=this.propMaterials[prop.kind].map;mesh.material.clippingPlanes![0].constant=p.occlusion;
      mesh.position.set(p.x,p.y-72*p.scale,0);mesh.scale.set(100*p.scale,-150*p.scale,1);mesh.renderOrder=3000-Math.floor(d);
    }
    for(let i=0;i<this.track.obstacles.length;i++){const o=this.track.obstacles[i],d=cameraDistance(o.s,player.distance,this.track.length),p=projectedCar(d,o.x,points),mesh=this.obstacles[i];mesh.visible=!departure&&!!p&&d>0&&p.y-100*p.scale<p.occlusion;if(!p)continue;const opaqueWidth={cone:45,barrel:30,barrier:52,rock:48}[o.kind],s=p.scale*(o.radius*740/opaqueWidth);mesh.position.set(Math.round(p.x),Math.round(p.y-28*s),0);mesh.scale.set(64*s,-64*s,1);mesh.renderOrder=3000-Math.floor(d);mesh.material.clippingPlanes![0].constant=p.occlusion;}
    this.panorama.material.map!.offset.x=state.player.distance/30000+sampleTrack(this.track,player.distance).curve*.045+(state.phase==='racing'?player.steering*Math.min(1,player.speed/35)*.035:0);
    const ctx=this.hudCanvas.getContext('2d')!;drawRaceHud(ctx,state,this.track,this.map);
    if(!this.inspection||state.phase!=='finished')this.drawSequence(ctx,state);
    if(state.player.inPit&&state.player.speed<.8){this.drawPit(ctx,state);this.hudTexture.needsUpdate=true;this.renderer.render(this.scene,this.camera);return;}
    const ego=departure?.ego??projectedCar(CAMERA_TRAIL,player.x,points);if(ego){const s=ego.scale*2.1,x=Math.round(ego.x),y=Math.round(ego.y);
      const anchors=carPoseAnchors(player.vehicle,turnAmountFor(player.steering));
      const screen=(a:readonly[number,number])=>({x:Math.round(x+(a[0]-40)*s),y:Math.round(y+(a[1]-34)*s)});
      if(state.phase==='racing'&&player.boost>0){for(const anchor of anchors.exhausts){const jet=screen(anchor),radius=Math.floor(state.elapsed*12)%2?4:3;ctx.fillStyle='#d93438';ctx.fillRect(jet.x-radius,jet.y-2,radius*2+1,5);ctx.fillRect(jet.x-2,jet.y-radius,5,radius*2+1);ctx.fillStyle='#fff0c4';ctx.fillRect(jet.x-1,jet.y-3,3,7);ctx.fillRect(jet.x-3,jet.y-1,7,3);}}
      if(state.phase==='racing'&&braking&&player.speed>20){ctx.fillStyle='#ff5c52';for(const anchor of anchors.lamps){const lamp=screen(anchor);ctx.fillRect(lamp.x-2,lamp.y,Math.round(4*s),Math.max(1,Math.round(s)));}}
      if(state.phase==='racing'&&state.player.collisionCooldown>0&&Math.floor(state.elapsed*20)%2){ctx.fillStyle='#fff0ae';ctx.fillRect(x-52,y-20,5,2);ctx.fillRect(x+48,y-25,3,4);}
      if(this.inspection){ctx.strokeStyle='#53dcef';ctx.lineWidth=1;const l=departure?{x:x-20*s}:projectedCar(CAMERA_TRAIL,player.x-.125,points)!,r=departure?{x:x+20*s}:projectedCar(CAMERA_TRAIL,player.x+.125,points)!;ctx.strokeRect(Math.round(l.x),y-5,Math.round(r.x-l.x),10);ctx.fillStyle='#ffed91';ctx.fillRect(x-2,y-2,5,5);}
    }
    this.hudTexture.needsUpdate=true;
    this.renderer.render(this.scene,this.camera);
  }
  private drawPit(c:CanvasRenderingContext2D,s:RaceSnapshot){
    const h=this.display.height;c.clearRect(0,0,480,h);c.fillStyle='#74706d';c.fillRect(0,0,480,h);
    for(let y=0;y<h;y+=12){c.fillStyle=y%24?'#827d75':'#6e6966';c.fillRect(0,y,480,1);}c.fillStyle='#37383d';c.fillRect(152,0,176,h);
    c.fillStyle='#e8bf42';for(const x of [144,330]){c.fillRect(x,0,5,h);for(let y=4;y<h;y+=18)c.fillRect(x-14,y,14,5);}
    c.fillStyle='#2d3335';c.fillRect(52,50,45,60);c.fillStyle='#d14c39';c.fillRect(58,55,33,27);c.fillStyle='#f3e6bf';c.fillRect(64,59,21,13);c.fillStyle='#161c25';c.fillRect(64,76,21,4);
    c.strokeStyle='#24272c';c.lineWidth=4;c.beginPath();c.moveTo(94,77);c.lineTo(135,77);c.lineTo(170,112);c.stroke();
    const car=this.overhead.get(s.player.vehicle)!;c.imageSmoothingEnabled=false;c.drawImage(car,190,Math.round((h-128)/2),77,128);
    c.fillStyle='#13151d';c.fillRect(0,0,480,26);c.fillRect(0,h-30,480,30);pixelText(c,'PIT / '+s.player.vehicle.toUpperCase(),12,9,1,'#fff0b5');pixelText(c,'ACCEL TO LEAVE',302,9,1);
    pixelText(c,'FUEL '+Math.ceil(s.player.fuel),12,h-21,2,'#f8e993');c.fillStyle='#363a32';c.fillRect(154,h-20,304,12);c.fillStyle='#7bc657';c.fillRect(156,h-18,Math.round(s.player.fuel*3),8);
  }
  private drawSequence(c:CanvasRenderingContext2D,s:RaceSnapshot){
    const h=this.display.height,ref=this.track.profile==='reference',timing=sequenceFor(this.track);
    if(s.phase==='countdown'){
      if(ref){if(s.countdown>3.4){pixelText(c,'PLAYER',146,h-74,2,'#fff2d2');pixelText(c,'COMPUTER',300,h-103,1,'#df8bd6');}if(s.countdown<=3)pixelText(c,String(Math.max(1,Math.ceil(s.countdown))),225,70,4,'#ffe779');}
      else {c.fillStyle='#191622df';c.fillRect(106,87,268,48);pixelText(c,this.track.name,119,99,2,'#fff0b5');pixelText(c,String(Math.ceil(s.countdown)),225,150,4,'#ffe779');}
    }else if(s.phase==='racing'&&s.elapsed<timing.go){pixelText(c,'GO',215,ref?78:119,4,'#f9e9bc');}
    if(s.phase==='finished'){
      const t=s.sequenceTime,size=Math.min(8,2+Math.floor(t*3)),rank=String(s.position)+(s.position===1?'ST':s.position===2?'ND':s.position===3?'RD':'TH');pixelText(c,rank,240-rank.length*3*size,h*.65-Math.min(28,t*15),size,'#fff2bd');
      if(t>timing.fade){c.fillStyle='rgba(0,0,0,'+Math.min(1,(t-timing.fade)/(timing.finish-timing.fade))+')';c.fillRect(0,0,480,h);}
    }else if(s.phase==='dnf'){c.fillStyle='#151520dd';c.fillRect(94,h/2-24,292,47);pixelText(c,'OUT OF FUEL',109,h/2-10,3,'#ffca8b');}
  }
  diagnostics(){return {gantry:this.gantryFrame,playerFrame:this.playerFrame,inspection:this.inspection,visibleCars:this.cars.filter(c=>c.visible).length,visibleObstacles:this.obstacles.filter(c=>c.visible).length,playerVisible:!!this.cars[0]?.visible,calls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,textures:this.renderer.info.memory.textures,geometries:this.renderer.info.memory.geometries,disposed:this.disposed};}
  dispose(){if(this.disposed)return;this.disposed=true;this.renderer.domElement.removeEventListener("webglcontextlost",this.onLost);this.road.geometry.dispose();this.road.material.dispose();this.geometry.dispose();for(const g of this.gantryGeometries)g.dispose();for(const t of this.textures)t.dispose();for(const m of this.materials.values())m.dispose();for(const m of this.obstacleMaterials.values())m.dispose();for(const m of [...this.sceneryMaterials,...this.propMaterials,...this.billboardMaterials])m.dispose();this.scene.clear();this.renderer.dispose();this.renderer.forceContextLoss();}
}
