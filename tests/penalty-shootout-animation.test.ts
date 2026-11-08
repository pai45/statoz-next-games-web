import { before, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { CharacterAnimator, applyCharacterPose, motion } from "../src/features/games/penalty-shootout/animation/character";
import { ShootoutSimulation, initializePhysics } from "../src/features/games/penalty-shootout/engine/simulation";
import { emptyInput, STEP, type Style } from "../src/features/games/penalty-shootout/game-types";
import type * as THREE from "three";
before(initializePhysics);
function world(actor: CharacterAnimator, pose: ReturnType<CharacterAnimator["evaluate"]>, bone: string) { applyCharacterPose(actor.group, new Map<string, THREE.Object3D>(actor.nodes.map(n => [n.name, n])), pose, undefined, 1); return actor.point(bone); }
test("Anatomical rig, detail levels, equipment, presets and motion markers are exported", () => {
  const root = "public/assets/games/penalty-shootout/", metadata = JSON.parse(fs.readFileSync(root + "movement.json", "utf8"));
  assert.ok(metadata.bones <= 64); assert.equal(metadata.ballContactSeconds, 1); assert.equal(metadata.aimLockSeconds, .9);
  for (const file of ["athlete.glb", "athlete-low.glb"]) {
    const bytes=fs.readFileSync(root+file), data=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
    for (const prefix of ["Jersey", "Shorts", "Boot", "Sole", "Glove_L", "Glove_R", "HandSkin_L", "HandSkin_R", "HairPreset_0", "HairPreset_1", "HairPreset_2", "HairPreset_3"]) assert.ok(data.nodes.some((n:{name:string}) => n.name.startsWith(prefix)),prefix);
    for (const bone of ["clavicle_L", "toe_R", "forearm_twist_L", "finger_4_2_R"]) assert.ok(data.nodes.some((n:{name:string})=>n.name===bone));
  }
  for (const name of ["kick_driven", "kick_placed", "kick_chip"]) assert.deepEqual(metadata.clips.find((c:{name:string})=>c.name===name).markers.contact,[1]);
  for (const level of ["low","mid","high"]) for (const side of ["left","right"]) assert.ok(motion.clips[`dive_${level}_${side}`]);
});
test("Shot styles have distinct poses and the support foot remains planted within 2 cm", () => {
  const results=[];
  for (const style of ["driven","placed","chip"] as Style[]) {
    const sim=new ShootoutSimulation("shooting",1,42), actor=new CharacterAnimator();
    try {
      sim.step({...emptyInput(),shoot:true,style});for(let i=0;i<50;i++)sim.step({...emptyInput(),shoot:true,style});sim.step({...emptyInput(),style});
      let anchor:ReturnType<typeof actor.point>|undefined, maxDrift=0;
      for(let i=0;i<143;i++) {sim.step(emptyInput());const frame=sim.frame();if(frame.shooterTime >= .85 && frame.shooterTime <= 1.14){const p=world(actor,frame.shooterPose,"foot_L");anchor??=p;maxDrift=Math.max(maxDrift,Math.hypot(p.x-anchor.x,p.y-anchor.y,p.z-anchor.z));}if(i===135)results.push([...frame.shooterPose.rotations]);}
      assert.ok(maxDrift <= .02,`${style} foot drift ${maxDrift}`);
    }finally{sim.dispose();}
  }
  assert.notDeepEqual(results[0],results[1]);assert.notDeepEqual(results[1],results[2]);
});
test("Keeper lands and recovers in place, shuffle responds to movement, and final poses are replayed", () => {
  const sim=new ShootoutSimulation("keeping",6,77);
  try {
    sim.step({...emptyInput(),x:1});assert.equal(sim.frame().keeperClip,"keeper_shuffle_left");
    sim.step({...emptyInput(),dive:{x:1,y:1}});
    const frames=[];for(let i=0;i<330;i++){sim.step(emptyInput());frames.push(sim.frame());}
    assert.ok(frames.some(f=>f.keeperClip==="dive_high_left"));assert.ok(frames.some(f=>f.keeperClip==="recovery_left"));
    const actor=new CharacterAnimator(),landed=world(actor,frames[130].keeperPose,"hips"),recovered=world(actor,frames[325].keeperPose,"hips");
    assert.ok(landed.y<.55);assert.ok(recovered.y>.8);assert.ok(Math.abs(recovered.x)>1.4);
    const settled=frames[329].keeperPose;
    for(const side of ["L","R"]) { const foot=world(actor,settled,"foot_"+side);assert.ok(Math.abs(foot.y-.12)<.02);assert.ok(Math.abs(foot.x-recovered.x)<.4,"Recovery feet return beneath the hips"); }
    while(sim.phase!=="resolution")sim.step(emptyInput());const before=structuredClone(sim.kicks),first=sim.frames[0];sim.replay();assert.deepEqual(sim.frame().keeperPose,first.keeperPose);for(let i=0;i<20;i++)sim.step(emptyInput());assert.deepEqual(sim.kicks,before);
  }finally{sim.dispose();}
});
test("Replay storage is bounded at sixteen seconds and poses remain invariant across rendering rates", () => {
  const run=(fps:number)=>{const sim=new ShootoutSimulation("keeping",6,65);let accumulator=0;try{for(let i=0;i<fps*7;i++){accumulator+=1/fps;while(accumulator+1e-10>=STEP){sim.step({...emptyInput(),dive:sim.tick===220?{x:1,y:-1}:null});accumulator-=STEP;}}assert.ok(sim.frames.length<=1920);return {result:sim.result,frame:sim.frame()};}finally{sim.dispose();}};
  assert.deepEqual(run(30),run(60));assert.deepEqual(run(60),run(144));
});
test("Slow reachable glove contacts catch; torso and fast contacts remain parries", () => {
  for (const kind of ["catch", "torso", "fast"] as const) {
    const sim=new ShootoutSimulation("keeping",1,22);
    try {
      for(let i=0;i<400 && sim.phase!=="flight";i++)sim.step(emptyInput());assert.equal(sim.phase,"flight");
      const hand=sim.keeperPose().leftHand;
      sim.ball.setTranslation(kind==="torso"?{x:0,y:1.18,z:.95}:{...hand,z:hand.z+.55},true);
      sim.ball.setLinvel({x:0,y:0,z:kind==="fast"?-24:-8},true);
      for(let i=0;i<1000 && sim.phase==="flight";i++)sim.step(emptyInput());
      assert.ok(sim.result?.contactFacts?.length,kind);
      const facts=sim.result!.contactFacts!;
      if(kind==="catch") { assert.ok(facts.some(f=>f.caught && f.bodyPart.startsWith("hand")));for(let i=0;i<60;i++)sim.step(emptyInput());const p=sim.ball.translation(),k=sim.keeperPose();assert.ok(Math.min(...[k.leftHand,k.rightHand].map(h=>Math.hypot(p.x-h.x,p.y-h.y,p.z-h.z)))<.28); }
      else assert.ok(facts.every(f=>!f.caught),kind);
    }finally{sim.dispose();}
  }
});
test("Clip transitions start from the preceding pose and finish on authored motion", () => {
  const actor=new CharacterAnimator(),options={root:{x:0,y:0,z:0},tick:100,preset:0};
  const first=actor.evaluate("prepare",1,options),transition=actor.evaluate("celebrate",.4,{...options,tick:101});
  assert.ok(first.rotations.every((value,i)=>Math.abs(value-transition.rotations[i])<.03));
  const finished=actor.evaluate("celebrate",.6,{...options,tick:120});assert.notDeepEqual(first.rotations,finished.rotations);
});
test("Cosmetic identity is fixed for a kick through its result, recovery and replay", () => {
  const sim=new ShootoutSimulation("shooting",1,21);const preset=sim.frame().shooterPose.preset;
  try {
    sim.step({...emptyInput(),shoot:true});for(let i=0;i<50;i++)sim.step({...emptyInput(),shoot:true});sim.step(emptyInput());
    for(let i=0;i<1100 && sim.phase!=="resolution";i++){sim.step(emptyInput());assert.equal(sim.frame().shooterPose.preset,preset);}
    assert.equal(sim.phase,"resolution");for(let i=0;i<360;i++){sim.step(emptyInput());assert.equal(sim.frame().shooterPose.preset,preset);}
    sim.replay();assert.equal(sim.frame().shooterPose.preset,preset);sim.next();assert.equal(sim.frame().shooterPose.preset,(preset+1)%4);
  }finally{sim.dispose();}
});

test("Keeper anticipation is seeded, reaches visible gestures and yields immediately to a dive", () => {
  for (const [seed, clip] of [[21, "keeper_wave"], [22, "keeper_crouch"]] as const) {
    const sim = new ShootoutSimulation("keeping", 1, seed), actor = new CharacterAnimator();
    try {
      for (let i = 0; i < 85; i++) sim.step(emptyInput());
      const frame = sim.frame(); assert.equal(frame.keeperClip, clip);
      const hand = world(actor, frame.keeperPose, "hand_L");
      assert.ok(Math.hypot(hand.x-frame.keeper.leftHand.x, hand.y-frame.keeper.leftHand.y, hand.z-frame.keeper.leftHand.z) < .001);
      if (clip === "keeper_wave") assert.ok(hand.y > 1.45, `Raised glove ${hand.y}`);
      sim.step({ ...emptyInput(), dive: { x: 1, y: 0 } });
      assert.equal(sim.frame().keeperClip, "dive_mid_left");
      assert.equal(sim.kicks.length, 0);
    } finally { sim.dispose(); }
  }
});

test("Approach stance feet stay anchored while the taker advances toward contact", () => {
  const sim = new ShootoutSimulation("shooting", 1, 42), actor = new CharacterAnimator();
  try {
    sim.step({ ...emptyInput(), shoot: true }); for (let i = 0; i < 50; i++) sim.step({ ...emptyInput(), shoot: true }); sim.step(emptyInput());
    const windows = [{ start: .04, end: .15, bone: "foot_L" }, { start: .22, end: .35, bone: "foot_R" }, { start: .42, end: .57, bone: "foot_L" }, { start: .66, end: .71, bone: "foot_R" }];
    const anchors = new Map<string, ReturnType<typeof actor.point>>(); let max = 0, worst = "";
    for (let i = 0; i < 100; i++) { sim.step(emptyInput()); const frame = sim.frame(); for (const w of windows) if (frame.shooterTime >= w.start && frame.shooterTime <= w.end) {
      const key = w.bone + w.start, p = world(actor, frame.shooterPose, w.bone); if (!anchors.has(key)) anchors.set(key, p); const a = anchors.get(key)!; const drift = Math.hypot(p.x-a.x,p.y-a.y,p.z-a.z); if (drift > max) { max = drift; worst = `${key} at ${frame.shooterTime}`; }
    } }
    assert.equal(anchors.size, 4); assert.ok(max <= .02, `Approach foot drift ${max}: ${worst}`);
  } finally { sim.dispose(); }
});


test("Surface refinement keeps face maps, layered scalp shapes and the shared skeleton in both detail levels", () => {
  for (const file of ["athlete.glb", "athlete-low.glb"]) {
    const bytes=fs.readFileSync("public/assets/games/penalty-shootout/"+file),data=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
    assert.equal(data.skins[0].joints.length,60);
    const face=data.materials.find((m:{name:string})=>m.name==="SkinFace");
    assert.ok(face?.pbrMetallicRoughness.baseColorTexture,"Pigment texture is exported");
    assert.ok(face.normalTexture,"Fine facial normals are exported");
    assert.ok(face.pbrMetallicRoughness.metallicRoughnessTexture,"Regional roughness is exported");
    for (let preset=0;preset<4;preset++) {
      const node=data.nodes.find((n:{name:string})=>n.name.startsWith("HairPreset_"+preset)),mesh=data.meshes[node.mesh];
      assert.ok(mesh.primitives[0].attributes.COLOR_0!==undefined,"Hair lock colours survive export");
      assert.ok(mesh.extras.targetNames.includes("FacePreset_1"),"Scalp follows the facial preset");
    }
  }
});
