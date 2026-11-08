import * as THREE from 'three';
import {ballAt,clamp,FootballEngine} from './engine';
import {loadRecoveredAthlete,type RecoveredAthlete} from './recovered-athlete';

export function createStadium(container:HTMLElement,engine:FootballEngine){
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x9dc8dc);renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-label','3D football pitch');container.appendChild(renderer.domElement);
  const scene=new THREE.Scene();scene.fog=new THREE.Fog(0xb5d3db,38,100);
  const camera=new THREE.PerspectiveCamera(48,1,.1,120);camera.position.set(0,3.7,8.8);
  scene.add(new THREE.HemisphereLight(0xe9f5ff,0x607448,2.3));
  const sun=new THREE.DirectionalLight(0xffe4b6,3.1);sun.position.set(-12,25,12);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-14;sun.shadow.camera.right=14;sun.shadow.camera.top=20;sun.shadow.camera.bottom=-20;sun.shadow.normalBias=.03;scene.add(sun);
  const materials:THREE.Material[]=[];const geometries:THREE.BufferGeometry[]=[];const textures:THREE.Texture[]=[];
  const mat=(color:number,extra:THREE.MeshStandardMaterialParameters={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.8,...extra});materials.push(m);return m};
  const white=mat(0xf2f3e7),dark=mat(0x1c2533),skin=mat(0xc88d64),blue=mat(0x1557a8),orange=mat(0xff792e),gloves=mat(0xfaf3c9);
  function mesh(geometry:THREE.BufferGeometry,material:THREE.Material,parent:THREE.Object3D=scene){geometries.push(geometry);const object=new THREE.Mesh(geometry,material);object.castShadow=true;object.receiveShadow=true;parent.add(object);return object}
  function box(x:number,y:number,z:number,w:number,h:number,d:number,material:THREE.Material,parent:THREE.Object3D=scene){const o=mesh(new THREE.BoxGeometry(w,h,d),material,parent);o.position.set(x,y,z);return o}
  function tube(a:THREE.Vector3,b:THREE.Vector3,r:number,material:THREE.Material,parent:THREE.Object3D=scene){const delta=b.clone().sub(a),o=mesh(new THREE.CylinderGeometry(r,r,delta.length(),8),material,parent);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return o}
  for(let i=0;i<16;i++)box(0,-.08,14-i*4,64,.12,4,mat(i%2?0x438447:0x4c914e));
  const paint=mat(0xd7e8c8);
  box(0,.002,-14,7.5,.014,.065,paint);box(-10,.003,-5,.065,.014,18,paint);box(10,.003,-5,.065,.014,18,paint);box(0,.003,4,20,.014,.065,paint);
  box(-4.6,.003,-10,.055,.014,8,paint);box(4.6,.003,-10,.055,.014,8,paint);box(0,.003,-6,9.25,.014,.055,paint);
  const spot=mesh(new THREE.CircleGeometry(.12,24),white);spot.rotation.x=-Math.PI/2;spot.position.set(0,.012,0);
  const arc=mesh(new THREE.RingGeometry(7.92,7.98,64,1,.78,1.58),paint);arc.rotation.x=-Math.PI/2;arc.rotation.z=Math.PI;arc.position.set(0,.01,-3);
  const stand=mat(0x334c61),seat=mat(0x366a83),trim=mat(0xf7c678);
  for(let row=0;row<7;row++){box(0,.4+row*.7,-20-row*.9,60,.7,1.2,row%2?stand:seat);box(-21-row*.9,.4+row*.7,-4,1.2,.7,35,row%2?stand:seat);box(21+row*.9,.4+row*.7,-4,1.2,.7,35,row%2?stand:seat)}
  const crowdGeo=new THREE.SphereGeometry(.13,5,4);geometries.push(crowdGeo);const crowdMat=mat(0xffffff);const crowd=new THREE.InstancedMesh(crowdGeo,crowdMat,1470);scene.add(crowd);const dummy=new THREE.Object3D();let index=0;
  const colors=[0xf4c589,0xf9e9d5,0x19394c,0xe07151,0x62b1b5,0x244b88];
  for(let row=0;row<7;row++)for(let col=0;col<70;col++)for(let side=0;side<3;side++){
    const q=(col-34.5)*.7;dummy.position.set(side===0?q:side===1?-21-row*.9:21+row*.9,1+row*.7,side===0?-20-row*.9:q/1.5-4);dummy.scale.set(1,1.7,1);dummy.updateMatrix();crowd.setMatrixAt(index,dummy.matrix);crowd.setColorAt(index,new THREE.Color(colors[(col*7+row*11+side)%colors.length]));index++;
  }
  box(0,.5,-17.8,48,1,.16,stand);box(0,1.03,-17.8,48,.08,.18,trim);
  const bannerCanvas=document.createElement('canvas');bannerCanvas.width=1024;bannerCanvas.height=128;const ctx=bannerCanvas.getContext('2d')!;ctx.fillStyle='#193b4b';ctx.fillRect(0,0,1024,128);ctx.fillStyle='#f6d58d';ctx.font='bold 52px Arial';ctx.textAlign='center';ctx.fillText('FOOTBALL SHOOTING',512,84);const texture=new THREE.CanvasTexture(bannerCanvas);textures.push(texture);const banner=mesh(new THREE.PlaneGeometry(12,1.5),mat(0xffffff,{map:texture}));banner.position.set(0,4.9,-26.5);
  for(const x of [-17,17]){tube(new THREE.Vector3(x,0,-23),new THREE.Vector3(x,15,-23),.12,stand);box(x,15,-23,3.5,1,.3,white);for(let n=0;n<5;n++)box(x-1.4+n*.7,15,-22.8,.45,.65,.1,mat(0xfff8d3,{emissive:0xffedc0,emissiveIntensity:.5}))}
  // Regulation-sized goal, with side, roof and rear netting.
  for(const x of [-3.66,3.66]){tube(new THREE.Vector3(x,0,-14),new THREE.Vector3(x,2.44,-14),.065,white);tube(new THREE.Vector3(x,2.44,-14),new THREE.Vector3(x,2.44,-15.7),.04,white);tube(new THREE.Vector3(x,0,-15.7),new THREE.Vector3(x,2.44,-15.7),.04,white)}
  tube(new THREE.Vector3(-3.66,2.44,-14),new THREE.Vector3(3.66,2.44,-14),.065,white);
  const vertices:number[]=[];function netLine(a:number[],b:number[]){vertices.push(...a,...b)}
  for(let x=-3.66;x<=3.67;x+=.245){netLine([x,0,-15.7],[x,2.44,-15.7]);netLine([x,2.44,-14],[x,2.44,-15.7])}
  for(let y=0;y<=2.45;y+=.244){netLine([-3.66,y,-15.7],[3.66,y,-15.7]);for(const x of [-3.66,3.66])netLine([x,y,-14],[x,y,-15.7])}
  for(let z=-14;z>=-15.71;z-=.24){netLine([-3.66,2.44,z],[3.66,2.44,z]);for(const x of [-3.66,3.66])netLine([x,0,z],[x,2.44,z])}
  const netGeo=new THREE.BufferGeometry();netGeo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometries.push(netGeo);const netMat=new THREE.LineBasicMaterial({color:0xeff8eb,transparent:true,opacity:.48});materials.push(netMat);scene.add(new THREE.LineSegments(netGeo,netMat));
  function person(kit:THREE.Material){
    const root=new THREE.Group();scene.add(root);box(0,1.12,0,.54,.62,.28,kit,root);box(0,.73,0,.5,.25,.3,dark,root);
    const head=mesh(new THREE.SphereGeometry(.19,12,10),skin,root);head.position.set(0,1.64,0);box(0,1.77,.025,.31,.13,.27,dark,root);
    const limbs:THREE.Group[]=[];
    for(const x of [-1,1]){const arm=new THREE.Group();arm.position.set(x*.32,1.36,0);root.add(arm);tube(new THREE.Vector3(),new THREE.Vector3(x*.12,-.46,0),.085,kit,arm);const hand=mesh(new THREE.SphereGeometry(.105,8,6),kit===orange?gloves:skin,arm);hand.position.set(x*.12,-.49,0);limbs.push(arm)}
    for(const x of [-1,1]){const leg=new THREE.Group();leg.position.set(x*.145,.69,0);root.add(leg);tube(new THREE.Vector3(),new THREE.Vector3(0,-.48,0),.09,skin,leg);box(0,-.44,0,.16,.27,.17,white,leg);box(0,-.62,-.06,.2,.13,.35,dark,leg);limbs.push(leg)}
    const number=box(0,1.15,.15,.08,.24,.008,white,root);number.rotation.z=.02;return {root,limbs};
  }
  const keeper=person(orange),striker=person(blue);keeper.root.position.z=-13.6;striker.root.position.set(-.65,0,1.1);striker.root.rotation.y=.18;
  let originalStriker:RecoveredAthlete|undefined,originalKeeper:RecoveredAthlete|undefined;
  const kit=(event:Event)=>{const color=(event as CustomEvent<string>).detail;if(/^#[0-9a-f]{6}$/i.test(color))originalStriker?.setTint(color);};window.addEventListener('football-local-kit',kit);
  void Promise.all([loadRecoveredAthlete(),loadRecoveredAthlete(true)]).then(([a,b])=>{if(disposed){a.dispose();b.dispose();return;}originalStriker=a;originalKeeper=b;striker.root.clear();keeper.root.clear();striker.root.add(a.root);keeper.root.add(b.root);striker.root.rotation.y=Math.PI;keeper.root.rotation.y=0;try{a.setTint(localStorage.getItem('football-shooting.jersey.v1')||'#1669bb');}catch{}container.dataset.characterSource='football-strike';}).catch(()=>{container.dataset.characterSource='fallback';});
  const ball=new THREE.Group();scene.add(ball);mesh(new THREE.SphereGeometry(.22,16,12),white,ball);
  const directions=[[0,1,0],[0,-1,0],[1,.4,0],[-1,.4,0],[0,.4,1],[0,.4,-1],[.7,-.5,.7],[-.7,-.5,.7],[.7,-.5,-.7],[-.7,-.5,-.7]];
  for(const dir of directions){const patch=mesh(new THREE.CircleGeometry(.087,5),dark,ball);patch.position.fromArray(dir).normalize().multiplyScalar(.222);patch.lookAt(patch.position.clone().multiplyScalar(2))}
  const ringMat=mat(0xffd36b,{emissive:0xffb52c,emissiveIntensity:.45,side:THREE.DoubleSide,transparent:true,opacity:.9});const target=mesh(new THREE.RingGeometry(.59,.66,48),ringMat);target.position.z=-13.85;
  const cue=mesh(new THREE.RingGeometry(.25,.33,32),mat(0xffe7a3,{emissive:0xffc244,emissiveIntensity:1,side:THREE.DoubleSide}));cue.position.z=-13.45;
  const trailMat=new THREE.LineBasicMaterial({color:0xffe4a5,transparent:true,opacity:.7});materials.push(trailMat);const trailGeo=new THREE.BufferGeometry();geometries.push(trailGeo);const trail=new THREE.Line(trailGeo,trailMat);scene.add(trail);
  const resize=()=>{const w=container.clientWidth,h=container.clientHeight;if(w<1||h<1)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=camera.aspect<.65?53:camera.aspect>1.6?39:48;camera.updateProjectionMatrix()};const observer=new ResizeObserver(resize);observer.observe(container);resize();
  let frame=0,previous=performance.now(),disposed=false;
  function draw(now:number){
    if(disposed)return;const dt=Math.min((now-previous)/1000,.05);previous=now;engine.step(dt);
    const p=engine.flightProgress,flight=engine.phase==='flight',after=engine.phase==='verdict'||engine.phase==='finished';
    const pos=ballAt(engine.shot,p);ball.position.set(pos.x,pos.y,pos.z);if(flight&&!engine.paused){ball.rotation.x-=dt*14;ball.rotation.z+=dt*engine.shot.curve*4}
    if(after&&engine.lastOutcome==='save'){ball.position.z+=Math.min(engine.elapsed,1.3)*3;ball.position.y=Math.max(.22,ball.position.y-engine.elapsed*.9)}
    else if(after&&['goal','target','conceded'].includes(engine.lastOutcome)){ball.position.z-=Math.min(engine.elapsed,.45)*2.6;ball.position.y=Math.max(.22,ball.position.y-engine.elapsed*1.8)}
    keeper.root.visible=engine.mode!=='training';keeper.root.position.set(engine.keeper.x,Math.max(0,engine.keeper.y-1),-13.6);keeper.root.rotation.z=clamp(-engine.keeper.x*.3,-.9,.9);
    keeper.limbs[0].rotation.z=-.45-(engine.dive?.y??1)*.25;keeper.limbs[1].rotation.z=.45+(engine.dive?.y??1)*.25;
    keeper.limbs[2].rotation.x=Math.sin(engine.clock*3)*.06;keeper.limbs[3].rotation.x=-Math.sin(engine.clock*3)*.06;
    striker.root.visible=engine.attacking;striker.root.position.z=flight?1.1-Math.min(engine.elapsed*4,1.4):after?-.3:1.1;
    striker.limbs[3].rotation.x=flight?-Math.sin(Math.min(1,engine.elapsed*5)*Math.PI)*1.4:0;striker.limbs[0].rotation.x=flight?-.6:Math.sin(engine.clock*2)*.05;striker.limbs[1].rotation.x=flight?.5:0;
    originalStriker?.sample(flight?'Shot_893':engine.phase==='finished'&&engine.won?'Victory':'Idle_1004',flight?engine.elapsed+.65:engine.clock);
    originalKeeper?.sample(flight&&engine.dive?'SaveMiddle':'Idle_1134',flight?engine.elapsed:engine.clock);
    target.visible=engine.mode==='training'&&engine.phase!=='menu';target.position.x=engine.target.x;target.position.y=engine.target.y;target.scale.setScalar(1+Math.sin(engine.clock*3)*.035);
    cue.visible=engine.cueVisible;cue.position.x=engine.shot.x;cue.position.y=engine.shot.y;
    trail.visible=flight&&p>.05;const points=[];for(let i=0;i<12;i++){const v=ballAt(engine.shot,Math.max(0,p-i*.012));points.push(new THREE.Vector3(v.x,v.y,v.z))}trailGeo.setFromPoints(points);
    camera.lookAt(0,1,-10);renderer.render(scene,camera);frame=requestAnimationFrame(draw);
  }
  frame=requestAnimationFrame(draw);
  return {canvas:renderer.domElement,dispose(){disposed=true;window.removeEventListener('football-local-kit',kit);originalStriker?.dispose();originalKeeper?.dispose();cancelAnimationFrame(frame);observer.disconnect();scene.clear();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove()}};
}
