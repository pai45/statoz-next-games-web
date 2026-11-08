import * as THREE from 'three';
import {Engine} from '../../src/features/games/hoop-legacy/source/src/game/engine/Engine';
import {Athlete} from '../../src/features/games/hoop-legacy/source/src/game/sim/Athlete';
import {PRO_TEAMS,jerseyFor} from '../../src/features/games/hoop-legacy/source/src/data/teams';
import {store} from '../../src/features/games/hoop-legacy/source/src/state/store';
import {preloadAthletes,authoredStats,readySet,loadSet} from '../../src/features/games/hoop-legacy/source/statoz/athletes/assets';
import {B} from '../../src/features/games/hoop-legacy/source/src/game/world/character/rig';
import {COURT} from '../../src/features/games/hoop-legacy/source/src/game/sim/court';

const baseline=new URLSearchParams(location.search).has('baseline');
await document.fonts.load('italic 900 64px "Barlow Condensed"');
await document.fonts.load('900 64px "Barlow Condensed"');
const quality=(new URLSearchParams(location.search).get('quality')||'medium') as 'low'|'medium'|'high';
store.set({settings:{...store.get().settings,quality,music:0,crowd:0,commentary:0}});
if(!baseline)await preloadAthletes();
const engine=new Engine(document.getElementById('root')!,{quality,resolutionScale:1,shake:false});
engine.paused=true;
const athletes:Athlete[]=[];
const read=()=>{
  const info=engine.renderer.info,autoReset=info.autoReset;info.autoReset=false;
  const timings:number[]=[];
  for(let i=0;i<9;i++){info.reset();const start=performance.now();engine.renderNow(0);timings.push(performance.now()-start);}
  info.autoReset=autoReset;
  return {authored:authoredStats,render:{...info.render},cpuSubmitMedianMs:timings.sort((a,b)=>a-b)[4],memory:{...info.memory},
  players:athletes.map(a=>({name:a.profile.firstName+' '+a.profile.lastName,authored:!!(a.char as unknown as {authored?:boolean}).authored,
    triangles:a.char.meshes.reduce((n,m)=>n+(m.geometry.index?.count||m.geometry.getAttribute('position').count)/3,0),
    calls:a.char.meshes.length,detail:a.char.mesh.userData.detail,hips:a.char.bones[0].position.toArray(),
    bounds:new THREE.Box3().setFromObject(a.char.group).getSize(new THREE.Vector3()).toArray()}))};};
async function show(options:{view?:string;index?:number;roster?:boolean;hair?:string;skin?:string;pose?:string;hero?:boolean}={}) {
  for(const a of athletes)a.dispose();athletes.length=0;
  const indices=options.roster?[0,1,2,3,4,5,6,7]:[options.index||0];
  for(const [i,index]of indices.entries()) {
    const team=PRO_TEAMS[index%PRO_TEAMS.length],p=structuredClone(team.roster[index%team.roster.length]);
    if(options.hair)p.appearance.hair=options.hair as typeof p.appearance.hair;
    if(options.skin)p.appearance.skin=options.skin;
    const a=new Athlete(p,0,0,jerseyFor(team,true),team);athletes.push(a);
    a.pos.set(options.roster?(i-3.5)*1.05:0,0,8);a.facing=options.view==='back'?Math.PI:options.view==='side'?Math.PI/2:0;
    engine.scene.add(a.char.group);a.dribbling=false;a.hasBall=false;
    if(options.hero!==false)await a.char.setDetail?.('hero');
    if(options.pose==='dribble'){a.hasBall=true;a.dribbling=true;}
    if(options.pose==='defense')a.defense=true;
    if(options.pose==='run'){a.moveDir.set(.1,1);a.sprint=true;}
    if(options.pose==='shoot')a.startAction('shoot',1.2);
    for(let t=0;t<45;t++)a.update(1/60);
    // Keep camera targets deterministic after simulating the requested pose.
    a.char.group.position.set(options.roster?(i-3.5)*1.05:0,a.jumpY,8);
  }
  const pos=new THREE.Vector3(.25,1.35,12.4),look=new THREE.Vector3(0,1.12,8);
  if(options.roster){pos.set(0,2.0,17.6);look.set(0,1.05,8);}
  if(options.view==='face'){pos.set(.15,1.93,9.05);look.set(0,1.78,8.05);}
  if(options.view==='feet'){pos.set(.36,.23,9.12);look.set(0,.14,8.09);}
  if(options.view==='broadcast'){pos.set(5.5,6,17.4);look.set(0,1,8);}
  engine.rig.targetFov=options.roster?39:32;engine.rig.fov=engine.rig.targetFov;
  engine.rig.targetPos.copy(pos);engine.rig.pos.copy(pos);engine.rig.targetLook.copy(look);engine.rig.look.copy(look);
  engine.shadowFocus.set(0,0,8);engine.key.target.position.set(0,0,8);
  await new Promise(resolve=>setTimeout(resolve,350));
  return read();
}
async function motion() {
  await show({hero:false});const a=athletes[0];
  const report={minimumHips:1,maxPalmGap:0,plantedDrift:0,finite:true,swapBoneError:0,samples:0};
  const previous=new Map<number,{x:number;z:number}>();
  for(const pose of ['idle','hold','dribble','defense','run']) {
    a.hasBall=pose==='hold'||pose==='dribble';a.dribbling=pose==='dribble';a.defense=pose==='defense';a.moveDir.set(0,pose==='run'?1:0);a.sprint=pose==='run';
    for(let frame=0;frame<240;frame++) {
      a.update(1/60);a.char.group.updateMatrixWorld(true);report.samples++;
      report.minimumHips=Math.min(report.minimumHips,a.char.bones[0].position.y);
      for(const bone of a.char.bones)report.finite&&=bone.matrixWorld.elements.every(Number.isFinite);
      if(pose==='hold'&&frame>90) {
        const ball=a.ballPosition(new THREE.Vector3()),right=a.char.handWorld(true,new THREE.Vector3()),left=a.char.handWorld(false,new THREE.Vector3());
        report.maxPalmGap=Math.max(report.maxPalmGap,Math.min(Math.abs(right.distanceTo(ball)-COURT.ballRadius),Math.abs(left.distanceTo(ball)-COURT.ballRadius)));
      }
      const feet=(a.anim as unknown as {feet:{side:number;planted:boolean;pitch:number}[]}).feet;
      for(const foot of feet) {
        const index=foot.side>0?B.footL:B.footR;
        const point=a.char.boneWorld(index,new THREE.Vector3()),last=previous.get(index);
        if(foot.planted&&Math.abs(foot.pitch)<.01) {
          if(last&&pose==='idle')report.plantedDrift=Math.max(report.plantedDrift,Math.hypot(point.x-last.x,point.z-last.z));
          previous.set(index,{x:point.x,z:point.z});
        }else previous.delete(index);
      }
    }
  }
  const before=a.char.bones.map(b=>b.matrixWorld.elements.slice());
  await a.char.setDetail?.('hero');a.char.group.updateMatrixWorld(true);
  for(let i=0;i<before.length;i++)for(let k=0;k<16;k++)report.swapBoneError=Math.max(report.swapBoneError,Math.abs(before[i][k]-a.char.bones[i].matrixWorld.elements[k]));
  return report;
}
function vertexBounds(a:Athlete) {
  a.char.group.updateMatrixWorld(true);
  const inverse=a.char.group.matrixWorld.clone().invert(),box=new THREE.Box3(),point=new THREE.Vector3();
  for(const mesh of a.char.meshes) {
    const count=mesh.geometry.getAttribute('position').count,stride=Math.max(1,Math.floor(count/1024));
    for(let i=0;i<count;i+=stride){mesh.getVertexPosition(i,point);point.applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);box.expandByPoint(point);}
  }
  return {min:box.min.toArray(),max:box.max.toArray(),size:box.getSize(new THREE.Vector3()).toArray()};
}
async function deformation() {
  await show({hero:false});const a=athletes[0];
  const cases=[];const uniformIds=new Set<string>();const started=performance.now();
  for(const action of ['idle','run','dunk','block','shoot'] as const) {
    a.endAction();a.moveDir.set(0,action==='run'?1:0);a.sprint=action==='run';
    if(!['idle','run'].includes(action))a.startAction(action as 'dunk'|'block'|'shoot',1.2);
    for(let i=0;i<24;i++)a.update(1/60);
    for(const [x,y,z,yaw]of [[0,0,0,0],[3,.8,8,.9],[-4,0,12,2.8],[4,.2,2,-1.7]]) {
      await a.char.setDetail?.('game');
      a.char.group.position.set(x,y,z);a.char.group.rotation.y=yaw;
      const before=vertexBounds(a);
      const start=performance.now();await a.char.setDetail?.('hero');
      const heroMs=performance.now()-start,hero=vertexBounds(a);
      await a.char.setDetail?.('game');const after=vertexBounds(a);
      const uniform=a.char.meshes.find(m=>m.name==='authored-uniform');if(uniform)uniformIds.add((uniform.material as THREE.Material).uuid);
      const error=Math.max(...before.min.map((v,i)=>Math.abs(v-after.min[i])),...before.max.map((v,i)=>Math.abs(v-after.max[i])));
      cases.push({action,x,y,z,yaw,before,hero,after,error,heroMs});
    }
  }
  await loadSet('lod1');
  const sets=['lod1','lod0','hero'] as const,geometry=[],allBuffers=new Set<ArrayBufferLike>();
  for(const level of sets){const buffers=new Set<ArrayBufferLike>();for(const asset of readySet(level)?.assets.values()||[])for(const part of asset.parts){const g=part.geometry;for(const att of [...Object.values(g.attributes),...Object.values(g.morphAttributes).flat(),...(g.index?[g.index]:[])])if('array'in att){buffers.add(att.array.buffer);allBuffers.add(att.array.buffer);}}geometry.push({level,bytes:[...buffers].reduce((n,b)=>n+b.byteLength,0)});}
  a.char.group.position.set(0,.2,8);a.char.group.rotation.y=.7;await a.char.setDetail?.('hero');
  await new Promise(resolve=>setTimeout(resolve,100));
  const sharedGameGeometry=[...readySet('lod0')!.assets].every(([name,asset])=>asset.parts.every((part,i)=>part.geometry===readySet('lod1')!.assets.get(name)?.parts[i].geometry));
  return {cases,geometry,sharedGameGeometry,uniqueGeometryBytes:[...allBuffers].reduce((n,b)=>n+b.byteLength,0),uniformMaterials:uniformIds.size,totalMs:performance.now()-started,maxRoundTripError:Math.max(...cases.map(c=>c.error)),maxExtent:Math.max(...cases.flatMap(c=>[...c.hero.size,...c.after.size])),maxCoordinate:Math.max(...cases.flatMap(c=>[...c.hero.min,...c.hero.max,...c.after.min,...c.after.max].map(Math.abs)))};
}
Object.assign(window,{review:{show,read,engine,athletes,B,motion,deformation}});
await show({view:'body'});
document.documentElement.dataset.ready='true';
