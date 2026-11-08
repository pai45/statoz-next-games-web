import { before, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { initializePhysics, ShootoutSimulation } from "../src/features/games/penalty-shootout/engine/simulation";
import { accuracy, anticipate, crossesGoal, launch, matchStatus, seeded } from "../src/features/games/penalty-shootout/engine/rules";
import { emptyInput, STEP, TAKER, GOAL, type InputFrame, type Style } from "../src/features/games/penalty-shootout/game-types";

before(async () => {
  // CPU geometry checks do not decode texture pixels; browser journeys verify them.
  Object.assign(globalThis, { self: globalThis, createImageBitmap: async () => ({ width: 512, height: 512, close() {} }) });
  await initializePhysics();
});
const advance = (sim: ShootoutSimulation, steps: number, input = emptyInput()) => { for (let i = 0; i < steps; i++) sim.step(input); };
function toFlight(sim: ShootoutSimulation, style: Style = "driven", x = 0) {
  if (x) advance(sim, 50, { ...emptyInput(), style, x });
  sim.step({ ...emptyInput(), style, shoot: true }); advance(sim, 50, { ...emptyInput(), style, shoot: true });
  sim.step({ ...emptyInput(), style });
  for (let i = 0; i < 125 && sim.phase !== "flight"; i++) sim.step(emptyInput());
  assert.equal(sim.phase, "flight");
}
function finish(sim: ShootoutSimulation) { for (let i = 0; i < 1000 && sim.phase === "flight"; i++) sim.step(emptyInput()); assert.equal(sim.phase, "resolution"); return sim.result!; }

test("Aim is chosen before shooting and stays locked through charge, run-up and release", () => {
  const sim = new ShootoutSimulation("shooting", 1, 42);
  try {
    advance(sim, 30, { ...emptyInput(), x: 1, y: .5 });
    const aimed = sim.snapshot().aim;
    assert.equal(sim.phase, "preparation"); assert.equal(sim.snapshot().power, 0);
    assert.ok(aimed.x > 1); assert.ok(aimed.y > 1.4);
    assert.ok(!sim.consumeEvents().some(e => e.type === "kick"));
    sim.step({ ...emptyInput(), shoot: true }); const captured = sim.snapshot().composure;
    advance(sim, 20, { ...emptyInput(), shoot: true, x: -1, y: -1 });
    assert.deepEqual(sim.snapshot().aim, aimed); assert.ok(sim.snapshot().power > .1);
    assert.equal(sim.snapshot().composure, captured);
    sim.step(emptyInput()); advance(sim, 110, { ...emptyInput(), x: 1, y: 1 });
    assert.deepEqual(sim.snapshot().aim, aimed);
    advance(sim, 20, { ...emptyInput(), x: -1, y: -1 });
    assert.deepEqual(sim.snapshot().aim, aimed);
    assert.ok(sim.consumeEvents().some(e => e.type === "kick"));
  } finally { sim.dispose(); }
});

test("Aiming can wait without starting a shot; cancelling charge restores aiming at the same target", () => {
  const sim = new ShootoutSimulation("shooting", 1, 42);
  try {
    advance(sim, 45, { ...emptyInput(), x: 1 }); const aimed = sim.snapshot().aim;
    advance(sim, 600); assert.equal(sim.phase, "preparation"); assert.deepEqual(sim.snapshot().aim, aimed);
    sim.step({ ...emptyInput(), shoot: true }); advance(sim, 10, { ...emptyInput(), shoot: true });
    sim.cancelInput(); assert.equal(sim.phase, "preparation"); assert.deepEqual(sim.snapshot().aim, aimed);
    advance(sim, 20, { ...emptyInput(), x: -1 }); assert.ok(sim.snapshot().aim.x < aimed.x);
  } finally { sim.dispose(); }
});
test("All shot styles launch through physics with distinct speed and spread", () => {
  const command = { target: { x: 2, y: 1.5 }, power: 0.6, composure: 0.8 };
  const driven = launch({ ...command, style: "driven" }, seeded(5)), placed = launch({ ...command, style: "placed" }, seeded(5)), chip = launch({ ...command, style: "chip" }, seeded(5));
  assert.ok(-driven.velocity.z > -placed.velocity.z); assert.ok(-placed.velocity.z > -chip.velocity.z);
  assert.ok(accuracy({ ...command, style: "placed" }) < accuracy({ ...command, style: "driven" }));
  assert.ok(accuracy({ ...command, power: 1, style: "driven" }) > accuracy({ ...command, style: "driven" }));
  for (const style of ["driven", "placed", "chip"] as Style[]) { const sim = new ShootoutSimulation("shooting", 1, 9); try { toFlight(sim, style, 1); assert.equal(finish(sim).style, style); } finally { sim.dispose(); } }
});
test("Full-ball line crossing excludes partial, wide and high crossings", () => {
  assert.equal(crossesGoal({ x: 2, y: 1, z: 0.2 }, { x: 2, y: 1, z: -0.2 }), true);
  assert.equal(crossesGoal({ x: 2, y: 1, z: 0.2 }, { x: 2, y: 1, z: -0.05 }), false);
  assert.equal(crossesGoal({ x: 3.6, y: 1, z: 0.2 }, { x: 3.6, y: 1, z: -0.2 }), false);
  assert.equal(crossesGoal({ x: 0, y: 2.4, z: 0.2 }, { x: 0, y: 2.4, z: -0.2 }), false);
});
test("Rapier resolves actual goal, wide, high, post and keeper contacts", () => {
  const cases = [
    { point: { x: 2.3, y: 1.2, z: 0.6 }, velocity: { x: 0, y: 0, z: -22 }, outcome: "goal" },
    { point: { x: 5, y: 1.2, z: 0.6 }, velocity: { x: 0, y: 0, z: -22 }, outcome: "wide" },
    { point: { x: 1, y: 3.2, z: 0.6 }, velocity: { x: 0, y: 0, z: -22 }, outcome: "over" },
  ];
  for (const c of cases) { const sim = new ShootoutSimulation("shooting", 1, 77); try { toFlight(sim); sim.ball.setTranslation(c.point, true); sim.ball.setLinvel(c.velocity, true); assert.equal(finish(sim).outcome, c.outcome); } finally { sim.dispose(); } }
  for (const kind of ["frame", "keeper"] as const) { const sim = new ShootoutSimulation("shooting", 1, 5); try { toFlight(sim); const k = sim.keeperPose(); sim.ball.setTranslation(kind === "frame" ? { x: 3.72, y: 1.2, z: 0.8 } : { ...k.rightHand, z: 0.95 }, true); sim.ball.setLinvel({ x: 0, y: 0, z: -10 }, true); assert.ok(finish(sim).contacts.includes(kind)); } finally { sim.dispose(); } }
});
test("Keeper positions and dive directions map to the behind-keeper camera; timing changes reach", () => {
  const early = new ShootoutSimulation("keeping", 1, 4), late = new ShootoutSimulation("keeping", 1, 4);
  try {
    advance(early, 40, { ...emptyInput(), x: 1 }); assert.ok(early.keeperPose().root.x < 0);
    advance(early, 200); advance(late, 240); early.step({ ...emptyInput(), dive: { x: 1, y: 1 } });
    advance(early, 20); advance(late, 20); late.step({ ...emptyInput(), dive: { x: 1, y: 1 } });
    assert.ok(early.keeperPose().root.x < late.keeperPose().root.x); assert.ok(early.keeperPose().rightHand.y > late.keeperPose().rightHand.y);
  } finally { early.dispose(); late.dispose(); }
});
test("AI anticipation has no pending-input interface and CPU shot is committed before a player dive", () => {
  assert.deepEqual(anticipate([], 6, seeded(1)), anticipate([], 6, seeded(1)));
  const first = new ShootoutSimulation("keeping", 6, 33), second = new ShootoutSimulation("keeping", 6, 33);
  try {
    advance(first, 180); advance(second, 180); first.step({ ...emptyInput(), dive: { x: 1, y: 1 } }); second.step({ ...emptyInput(), dive: { x: -1, y: -1 } });
    advance(first, 160); advance(second, 160); assert.deepEqual(first.snapshot().aim, second.snapshot().aim);
    assert.deepEqual(first.ball.linvel(), second.ball.linvel());
  } finally { first.dispose(); second.dispose(); }
});
test("Seeded simulation is invariant under 30/60/144-Hz rendering schedules", () => {
  const run = (fps: number) => {
    const sim = new ShootoutSimulation("shooting", 6, 2026); let accumulator = 0;
    try { for (let frame = 0; frame < fps * 5; frame++) { accumulator += 1 / fps; while (accumulator + 1e-10 >= STEP) { const tick = sim.tick; const input: InputFrame = { ...emptyInput(), shoot: tick >= 89 && tick < 145, x: tick >= 89 && tick < 151 ? 0.8 : 0 }; sim.step(input); accumulator -= STEP; } } return { result: sim.result, frames: sim.frames }; } finally { sim.dispose(); }
  };
  assert.deepEqual(run(30), run(60)); assert.deepEqual(run(60), run(144));
});
test("Early finish and sudden death wait for the mathematically decisive kick", () => {
  const kick = (role: "shooting" | "keeping", scored: boolean) => ({ role, outcome: scored ? "goal" as const : "saved" as const });
  const a = [kick("shooting", true), kick("keeping", false), kick("shooting", true), kick("keeping", false), kick("shooting", true), kick("keeping", false)];
  assert.equal(matchStatus(a).winner, "player");
  const tie = Array.from({ length: 10 }, (_, i) => kick(i % 2 ? "keeping" : "shooting", true));
  assert.equal(matchStatus(tie).winner, null); assert.equal(matchStatus(tie).suddenDeath, true);
  tie.push(kick("shooting", true)); assert.equal(matchStatus(tie).winner, null);
  tie.push(kick("keeping", false)); assert.equal(matchStatus(tie).winner, "player");
});
test("Replay and skipping do not resimulate outcomes; cancel clears a charged shot", () => {
  const sim = new ShootoutSimulation("shooting", 1, 5);
  try { sim.step({ ...emptyInput(), shoot: true }); advance(sim, 20, { ...emptyInput(), shoot: true }); sim.cancelInput(); assert.equal(sim.phase, "preparation"); assert.equal(sim.snapshot().power, 0); toFlight(sim); finish(sim); const kicks = structuredClone(sim.kicks), frame = sim.frame(); sim.replay(); advance(sim, 25); assert.deepEqual(sim.kicks, kicks); assert.equal(sim.tick, frame.tick); sim.next(); assert.equal(sim.phase, "preparation"); assert.equal(sim.kicks.length, 1); } finally { sim.dispose(); }
});
test("Runtime model has a skin, required clips and a complete hashed asset manifest", () => {
  const root = "public/assets/games/penalty-shootout/", data = fs.readFileSync(root + "athlete.glb"), json = JSON.parse(data.subarray(20, 20 + data.readUInt32LE(12)).toString());
  assert.ok(json.skins.length); for (const name of ["kick_driven", "kick_placed", "kick_chip", "keeper_ready", "dive_low", "dive_mid", "dive_high", "centre_block", "recovery"]) assert.ok(json.animations.some((a: { name: string }) => a.name === name));
  const manifest = JSON.parse(fs.readFileSync(root + "manifest.json", "utf8")); assert.equal(manifest.model.license, "CC0-1.0"); assert.ok(manifest.files.reduce((s: number, f: { bytes: number }) => s + f.bytes, 0) < 15 * 1024 * 1024);
  for (const file of manifest.files) assert.equal(createHash("sha256").update(fs.readFileSync(root + file.path)).digest("hex"), file.sha256);
});

test("The exported skinned boots reach the ball for every shot style on the contact frame", async () => {
  const THREE = await import("three"), { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const bytes = fs.readFileSync("public/assets/games/penalty-shootout/athlete.glb"), model = await new GLTFLoader().parseAsync(Uint8Array.from(bytes).buffer, "");
  const group = new THREE.Group(); group.add(model.scene); group.rotation.y = Math.PI; group.position.set(TAKER.x, 0, GOAL.spot + TAKER.contactOffset);
  const mixer = new THREE.AnimationMixer(model.scene);
  for (const style of ["driven", "placed", "chip"]) {
  mixer.stopAllAction(); mixer.setTime(0); mixer.clipAction(model.animations.find(a => a.name === "kick_" + style)!).reset().play(); mixer.setTime(1); group.updateMatrixWorld(true);
  let nearest = Infinity;
  model.scene.traverse(object => {
    const mesh = object as import("three").SkinnedMesh;
    if (!mesh.isSkinnedMesh || Array.isArray(mesh.material) || mesh.material.name !== "Boots") return;
    mesh.skeleton.update();
    for (let i = 0; i < mesh.geometry.attributes.position.count; i++) { const p = mesh.getVertexPosition(i, new THREE.Vector3()).applyMatrix4(mesh.matrixWorld); nearest = Math.min(nearest, p.distanceTo(new THREE.Vector3(0, 0.11, 11))); }
  });
  assert.ok(nearest < 0.14, `${style} boot must meet the ball, nearest distance was ${nearest}`);
  }
});

test("Complete physical shootouts reach wins, losses and paired sudden death", () => {
  for (const scenario of ["win", "loss", "sudden-death"] as const) {
    const sim = new ShootoutSimulation("shootout", 6, 65);
    try {
      for (let i = 0; i < 14 && sim.phase !== "summary"; i++) {
        if (sim.role === "shooting") toFlight(sim); else { for (let j = 0; j < 500 && sim.phase !== "flight"; j++) sim.step(emptyInput()); }
        const goal = scenario === "sudden-death" && i < 10 || (scenario === "loss" ? sim.role === "keeping" : sim.role === "shooting");
        const x = -Math.sign(sim.keeperPose().root.x || 1) * 2.3;
        sim.ball.setTranslation({ x: goal ? x : 6, y: 1.2, z: 0.7 }, true); sim.ball.setLinvel({ x: 0, y: 0, z: -22 }, true);
        assert.equal(finish(sim).outcome, goal ? "goal" : "wide"); sim.next();
      }
      assert.equal(sim.phase, "summary"); assert.equal(sim.snapshot().winner, scenario === "loss" ? "opponent" : "player");
      assert.equal(sim.kicks.length, scenario === "sudden-death" ? 12 : 6); assert.equal(sim.snapshot().suddenDeath, scenario === "sudden-death");
    } finally { sim.dispose(); }
  }
});

test("Recorded keeper hands agree with the visible bone pose throughout dives and recovery", async () => {
  const THREE = await import("three"), { CharacterAnimator, applyCharacterPose } = await import("../src/features/games/penalty-shootout/animation/character");
  for (const dive of [null, { x: 0, y: 0 }, { x: -1, y: -1 }, { x: 1, y: 0 }, { x: -1, y: 1 }]) {
    const sim = new ShootoutSimulation("keeping", 6, 17), actor = new CharacterAnimator();
    const nodes = new Map<string, import("three").Object3D>(actor.nodes.map(n => [n.name, n]));
    try {
      sim.step({ ...emptyInput(), dive });
      for (let i = 0; i < 330; i++) {
        sim.step(emptyInput()); const frame = sim.frame(); applyCharacterPose(actor.group, nodes, frame.keeperPose, undefined, 1);
        for (const [bone, target] of [["hand_L", frame.keeper.leftHand], ["hand_R", frame.keeper.rightHand]] as const) {
          const p = actor.point(bone); assert.ok(new THREE.Vector3(p.x,p.y,p.z).distanceTo(new THREE.Vector3(target.x,target.y,target.z)) < .00001);
        }
        assert.ok([...frame.keeperPose.rotations].every(Number.isFinite));
      }
    } finally { sim.dispose(); }
  }
});

test("The diagonal approach reaches the measured contact position and records its lateral path", () => {
  const sim = new ShootoutSimulation("shooting", 1, 77);
  try {
    assert.ok(sim.frame().shooterX < TAKER.x - 1);
    toFlight(sim); assert.equal(sim.frame().shooterX, TAKER.x);
    const run = sim.frames.filter(f => f.shooterTime > 0 && f.shooterTime < 1);
    assert.ok(run.length > 80); assert.ok(run[0].shooterX < run.at(-1)!.shooterX);
    assert.ok(run.every((f, i) => !i || f.shooterX >= run[i - 1].shooterX));
    finish(sim); const first = structuredClone(sim.frames[0]); sim.replay(); assert.equal(sim.frame().shooterX, first.shooterX);
  } finally { sim.dispose(); }
});

test("Broadcast framing retains the goal, ball and taker in desktop and both phone orientations", async () => {
  const THREE = await import("three"), { broadcastCamera } = await import("../src/features/games/penalty-shootout/rendering/camera");
  for (const mode of ["shooting", "keeping"] as const) {
    const sim = new ShootoutSimulation(mode, 6, 41);
    try {
      for (const [width, height] of [[1280, 800], [915, 412], [412, 685]]) {
        const frame = sim.frame(), view = broadcastCamera(frame, sim.snapshot(), width / height, true);
        const camera = new THREE.PerspectiveCamera(view.fov, width / height, 0.08, 240);
        camera.position.set(view.position.x, view.position.y, view.position.z); camera.lookAt(view.look.x, view.look.y, view.look.z); camera.updateMatrixWorld(true);
        for (const point of [[-GOAL.halfWidth, 0, 0], [GOAL.halfWidth, GOAL.height, 0], [0, GOAL.ballRadius, GOAL.spot], [frame.shooterX, 0, frame.shooterZ], [frame.shooterX, 1.82, frame.shooterZ]]) {
          const ndc = new THREE.Vector3(...point as [number, number, number]).project(camera);
          assert.ok(Math.abs(ndc.x) < 0.99 && Math.abs(ndc.y) < 0.99, `${mode} ${width}x${height}: ${ndc.toArray()}`);
        }
      }
    } finally { sim.dispose(); }
  }
});
