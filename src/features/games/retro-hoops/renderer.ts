import {drawContactArm} from "./contact-arm";
import {REFERENCE_TUNING as T} from "./reference-tuning";
import {courtPoint,cameraOrigin,cameraTop,BASKET_ART,VIEW} from "./view";
import * as THREE from "three";
import { COURT, type Match } from "./simulation";
import { poseFor,overlayFor,headLayer,pictureAtlas,characterAnchors,characterMarkerHeight, type Pictures } from "./presentation";

/** Reference-style checkerboard shadow: every other pixel inside the ellipse, hard edges. */
export function drawDitherShadow(c:CanvasRenderingContext2D,w:number,h:number,color="#000000b0"){c.clearRect(0,0,w,h);c.fillStyle=color;const rx=w/2-1,ry=h/2-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const dx=(x+.5-w/2)/rx,dy=(y+.5-h/2)/ry;if(dx*dx+dy*dy<=1&&(x+y)%2===0)c.fillRect(x,y,1,1);}}
/** Three owns presentation only. No outcome or possession changes occur here. */
export function createRenderer(canvas:HTMLCanvasElement,pictures:Pictures) {
  const renderer=new THREE.WebGLRenderer({canvas,alpha:false,antialias:false,powerPreference:"low-power"});
  let width=canvas.width;renderer.setPixelRatio(1);renderer.setSize(width,VIEW.window,false);renderer.setClearColor(0x111c30);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(0,width,360,360-VIEW.window,-1000,1000);
  camera.position.z=500;
  const textures:Record<string,THREE.Texture>={},materials:Record<string,THREE.SpriteMaterial>={};
  const atlas=pictureAtlas(pictures),atlasTextures=new Map<HTMLImageElement,THREE.Texture>();
  for(const image of atlas?.images??[]){const tex=new THREE.Texture(image);tex.needsUpdate=true;tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.NearestFilter;tex.generateMipmaps=false;tex.colorSpace=THREE.SRGBColorSpace;atlasTextures.set(image,tex);}
  for(const [key,img] of Object.entries(pictures)) {
    const region=atlas?.regions[key],tex=region?atlasTextures.get(img)!.clone():new THREE.Texture(img);if(region){tex.repeat.set(region[2]/img.width,region[3]/img.height);tex.offset.set(region[0]/img.width,1-(region[1]+region[3])/img.height);}tex.needsUpdate=true;tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.NearestFilter;tex.colorSpace=THREE.SRGBColorSpace;textures[key]=tex;
    materials[key]=new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false,depthWrite:false});
  }
  const sprite=(key:string,w:number,h:number)=>{const sp=new THREE.Sprite(materials[key]);sp.scale.set(w,h,1);scene.add(sp);return sp;};
  const floor=sprite("court",900,360);floor.position.set(450,180,0);floor.renderOrder=-100;
  const actors=Array.from({length:6},()=>sprite("navy-s-ready-source",144,128));
  const heads=Array.from({length:6},()=>sprite("navy-head-0-side-source",32,32));
  const arms=Array.from({length:6},()=>sprite("navy-dribble-arm-00-source",144,128));
  const gripCanvas=document.createElement("canvas");gripCanvas.width=144;gripCanvas.height=128;const gripTexture=new THREE.CanvasTexture(gripCanvas);gripTexture.magFilter=gripTexture.minFilter=THREE.NearestFilter;gripTexture.colorSpace=THREE.SRGBColorSpace;const gripMaterial=new THREE.SpriteMaterial({map:gripTexture,transparent:true,depthTest:false,depthWrite:false}),gripSprite=new THREE.Sprite(gripMaterial);scene.add(gripSprite);
  const ball=sprite("ball",13,13),left=sprite("left",47,75),right=sprite("right",92,75);
  left.position.set(85-31+47/2,360-(COURT.rimY-COURT.rimZ-48+75/2),0);right.position.set(815-13+46,360-(COURT.rimY-COURT.rimZ-48+37.5),0);
  left.renderOrder=right.renderOrder=1000;
  const glowCanvas=document.createElement("canvas");glowCanvas.width=glowCanvas.height=32;const gc=glowCanvas.getContext("2d")!;gc.fillStyle="#ffb34377";gc.beginPath();gc.arc(16,16,14,0,Math.PI*2);gc.fill();gc.fillStyle="#fff2bd99";gc.beginPath();gc.arc(16,16,9,0,Math.PI*2);gc.fill();const glowTexture=new THREE.CanvasTexture(glowCanvas),glowMaterial=new THREE.SpriteMaterial({map:glowTexture,transparent:true,depthTest:false,depthWrite:false}),glow=new THREE.Sprite(glowMaterial);scene.add(glow);

  const ringCanvas=document.createElement("canvas");ringCanvas.width=48;ringCanvas.height=16;
  const ctx=ringCanvas.getContext("2d")!;ctx.font="bold 10px monospace";ctx.textAlign="center";ctx.fillStyle="#191810";ctx.fillText("1P",25,11);ctx.fillStyle="#ef3c27";ctx.fillText("1P",24,10);ctx.beginPath();ctx.moveTo(20,12);ctx.lineTo(28,12);ctx.lineTo(24,16);ctx.fill();
  const ringTexture=new THREE.CanvasTexture(ringCanvas),ringMaterial=new THREE.SpriteMaterial({map:ringTexture,depthTest:false,transparent:true});
  const ring=new THREE.Sprite(ringMaterial);ring.scale.set(48,16,1);scene.add(ring);
  const shadowCanvas=document.createElement("canvas");shadowCanvas.width=40;shadowCanvas.height=12;
  const shadowContext=shadowCanvas.getContext("2d")!;drawDitherShadow(shadowContext,40,12);
  const shadowTexture=new THREE.CanvasTexture(shadowCanvas);shadowTexture.magFilter=THREE.NearestFilter;
  const shadowMaterial=new THREE.SpriteMaterial({map:shadowTexture,transparent:true,depthTest:false,depthWrite:false});
  const shadows=Array.from({length:7},()=>{const sp=new THREE.Sprite(shadowMaterial);scene.add(sp);return sp;});
  let disposed=false;
  return {
    draw(s:Match){if(disposed)return;floor.material=materials["court-"+(Math.floor(s.tick/T.crowdFrameTicks)%T.crowdFrames)]??materials.court;camera.left=cameraOrigin(s,width);camera.right=camera.left+width;const top=cameraTop(s);camera.top=360-top;camera.bottom=360-top-VIEW.window;camera.updateProjectionMatrix();
      for(const a of s.actors){
        const p=courtPoint(a.x,a.y,a.z+52),scale=p.scale,sp=actors[a.id];
        sp.material=materials[poseFor(s,a)];sp.scale.set(144*scale,128*scale,1);sp.position.set(Math.round(p.x),360-Math.round(p.y),0);sp.renderOrder=a.y;
        const layer=headLayer(pictures,a,poseFor(s,a)),head=heads[a.id];head.visible=!!layer;
        if(layer){head.material=materials[layer.key];head.scale.set(32*scale,32*scale,1);head.position.set(sp.position.x+(layer.x-72)*scale,sp.position.y+(64-layer.y)*scale,0);head.renderOrder=a.y+(layer.underBody?-.01:.005);}
        const overlay=overlayFor(s,a),arm=arms[a.id];arm.visible=!!overlay;
        if(overlay){arm.material=materials[overlay.key];arm.scale.copy(sp.scale);arm.position.copy(sp.position);arm.position.y-=overlay.y*scale;arm.renderOrder=a.y+.01;}
        const ground=courtPoint(a.x,a.y),shadow=shadows[a.id],size=Math.max(.55,1-a.z/250)*scale;
        shadow.position.set(Math.round(ground.x),360-Math.round(ground.y),0);shadow.scale.set(40*size,12*size,1);shadow.renderOrder=a.y-.3;
      }
      const grip=drawContactArm(gripCanvas,s,characterAnchors(pictures,poseFor(s,s.actors[s.ball.owner??0])));gripSprite.visible=!!grip;if(grip){const body=actors[grip.actor];gripTexture.needsUpdate=true;gripSprite.position.copy(body.position);gripSprite.scale.copy(body.scale);gripSprite.renderOrder=s.actors[grip.actor].y+.02;}
      const b=courtPoint(s.ball.x,s.ball.y,s.ball.z);ball.scale.set(13*b.scale,13*b.scale,1);ball.position.set(Math.round(b.x),360-Math.round(b.y),0);ball.renderOrder=s.ball.y+.1;
      glow.visible=s.ball.super&&s.ball.kind==="shot";glow.position.copy(ball.position);glow.scale.set(30*b.scale,30*b.scale,1);glow.renderOrder=ball.renderOrder-.01;
      const ground=courtPoint(s.ball.x,s.ball.y),ballShadow=shadows[6];ballShadow.position.set(ground.x,360-ground.y,0);ballShadow.scale.set(14*ground.scale,5*ground.scale,1);ballShadow.renderOrder=s.ball.y-.2;
      for(const [sp,x,key] of [[left,85,"left"],[right,815,"right"]] as const){const p=courtPoint(x,COURT.rimY),art=BASKET_ART[key];sp.scale.set(art.width*p.scale,art.height*p.scale,1);sp.position.set(p.x+(art.width/2-art.rimX)*p.scale,360-(p.y-(COURT.rimZ+art.rimY-art.height/2)*p.scale),0);}
      const a=s.actors[s.selected],marker=courtPoint(a.x,a.y,a.z+characterMarkerHeight(pictures,poseFor(s,a)));ring.scale.set(48*marker.scale,16*marker.scale,1);ring.position.set(marker.x,360-marker.y,0);ring.renderOrder=a.y+.05;
      renderer.render(scene,camera);
    },
    resize(nextWidth:number){if(disposed||!Number.isFinite(nextWidth))return;width=Math.max(320,Math.min(900,Math.round(nextWidth)));renderer.setSize(width,VIEW.window,false);},
    info:()=>({drawCalls:renderer.info.render.calls,textures:renderer.info.memory.textures}),
    dispose(){if(disposed)return;disposed=true;for(const tex of Object.values(textures))tex.dispose();for(const m of Object.values(materials))m.dispose();gripTexture.dispose();gripMaterial.dispose();glowTexture.dispose();glowMaterial.dispose();ringTexture.dispose();ringMaterial.dispose();shadowTexture.dispose();shadowMaterial.dispose();for(const tex of atlasTextures.values())tex.dispose();scene.clear();renderer.dispose();renderer.forceContextLoss();}
  };
}
