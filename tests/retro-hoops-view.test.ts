import test from "node:test";
import assert from "node:assert/strict";
import {courtPoint,cameraOrigin,depthScale} from "../src/features/games/retro-hoops/view";
import {createMatch,anchor} from "../src/features/games/retro-hoops/simulation";

test("court widens toward the viewer with symmetric attacking directions",()=>{for(const y of [164,185,247,310,330]){const left=courtPoint(60,y),right=courtPoint(840,y);assert.ok(Math.abs(left.x+right.x-900)<1e-9);assert.ok(left.x>=0&&right.x<=900);}assert.ok(courtPoint(840,330).x>courtPoint(840,164).x);});
test("ball grip follows the same uniform player transform at every depth and direction",()=>{const a=createMatch().actors[0];for(const face of [-1,1] as const)for(const y of [164,247,330]){a.face=face;a.y=y;a.z=35;const ground=courtPoint(a.x,a.y),hand=anchor(a,"release"),projected=courtPoint(hand.x,hand.y,hand.z);assert.ok(Math.abs(projected.x-(ground.x+27*face*ground.scale))<1e-9);assert.ok(Math.abs(projected.y-(ground.y-(a.z+104)*ground.scale))<1e-9);}});
test("camera remains in bounds at either basket across supported viewport widths",()=>{for(const width of [320,514,640,900])for(const camera of [0,80,210,420])for(const y of [164,247,330]){const x=cameraOrigin({camera,ball:{y}},width);assert.ok(Number.isInteger(x)&&x>=0&&x<=900-width);}});
test("ground and aerial points preserve one foot anchor without changing world state",()=>{const s=createMatch(),before=structuredClone(s);for(const a of s.actors){const ground=courtPoint(a.x,a.y),air=courtPoint(a.x,a.y,70);assert.equal(ground.x,air.x);assert.ok(Math.abs(ground.y-air.y-70*depthScale(a.y))<1e-9);}assert.deepEqual(s,before);});
