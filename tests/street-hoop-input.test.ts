import {test} from "node:test";
import assert from "node:assert/strict";
import {ARCADE, StreetHoopInput} from "../src/features/games/retro-hoops/street-hoop-input";

test("Pointer cancellation immediately releases even a pending minimum tap", async () => {
  const events:number[][]=[]; const input=new StreetHoopInput((...event)=>events.push(event),()=>0);
  input.down("finger",ARCADE.shoot); input.up("finger"); input.up("finger",true);
  assert.deepEqual(events,[[0,1],[0,0]]);
  await new Promise(resolve=>setTimeout(resolve,70)); assert.deepEqual(events,[[0,1],[0,0]]);
});

test("Arcade controls retain independent fingers and keyboard ownership", () => {
  const events: number[][] = []; let now = 0;
  const input = new StreetHoopInput((...event) => events.push(event), () => now);
  input.down("finger1", ARCADE.shoot); input.key("KeyJ", true); now = 100; input.up("finger1");
  assert.deepEqual(events, [[0,1]]); input.key("KeyJ", false); assert.deepEqual(events, [[0,1],[0,0]]);
});
test("Joystick emits eight-way diagonals, hysteresis and release without noisy repeats", () => {
  const events: number[][] = []; const input = new StreetHoopInput((...event) => events.push(event));
  input.stick("stick", .1, .1); assert.equal(events.length, 0);
  input.stick("stick", .8, -.8); input.stick("stick", .7, -.9);
  assert.deepEqual(events, [[7,1],[4,1]]);
  input.stick("stick", .2, 0); assert.ok(events.some(([button,value]) => button===4 && value===0));
  input.stick("stick", 0, 0); assert.deepEqual(events.at(-1), [7,0]);
});
test("A and B can be held while moving and all release immediately on interruption", () => {
  const events: number[][]=[];const input=new StreetHoopInput((...event)=>events.push(event));
  input.stick("stick",1,0);input.down("a",ARCADE.shoot);input.down("b",ARCADE.pass);input.clear();
  assert.deepEqual(events.filter(([,value])=>value===0).map(([button])=>button).sort((a,b)=>a-b),[0,7,8]);
  const length=events.length;input.clear();assert.equal(events.length,length);
});
test("Quick action taps span an emulator poll but directions release without delay", async () => {
  const events: number[][]=[];const input=new StreetHoopInput((...event)=>events.push(event),()=>0);
  input.down("a",ARCADE.shoot);input.up("a");assert.deepEqual(events,[[0,1]]);
  await new Promise(resolve=>setTimeout(resolve,70));assert.deepEqual(events,[[0,1],[0,0]]);
  input.key("ArrowRight",true);input.key("ArrowRight",false);assert.deepEqual(events.slice(-2),[[7,1],[7,0]]);
});
test("Pause cancels pending tap releases so a resumed press cannot be released by an old timer", async () => {
  const events:number[][]=[];const input=new StreetHoopInput((...event)=>events.push(event),()=>0);
  input.down("a",ARCADE.shoot);input.up("a");input.clear();input.down("a2",ARCADE.shoot);
  await new Promise(resolve=>setTimeout(resolve,70));assert.deepEqual(events,[[0,1],[0,0],[0,1]]);input.clear();
});
test("Coin and Start use native controls; unrelated keys and invalid joystick values do not latch",()=>{
  const events:number[][]=[];const input=new StreetHoopInput((...event)=>events.push(event));
  assert.equal(input.key("ShiftRight",true),true);assert.equal(input.key("Enter",true),true);assert.equal(input.key("Space",true),false);
  input.stick("stick",NaN,1);input.clear();assert.deepEqual(events,[[2,1],[3,1],[2,0],[3,0]]);
});
