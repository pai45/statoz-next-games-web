import {test} from "node:test";
import assert from "node:assert/strict";
import {defaultPresentation, presentationKey, readPresentation} from "../src/features/games/shared/retro/presentation";
test("new retro preferences expand the screen and enable fullscreen", () => {
  assert.deepEqual(defaultPresentation(), {schemaVersion:1, layout:"onscreen", fullscreen:true});
});
test("presentation bridge accepts only supported complete preferences", () => {
  for (const v of [null, {}, {schemaVersion:2,layout:"onscreen",fullscreen:true}, {schemaVersion:1,layout:"other",fullscreen:true}, {schemaVersion:1,layout:"handheld",fullscreen:1}]) assert.equal(readPresentation(v), null);
  assert.deepEqual(readPresentation({...defaultPresentation(),layout:"handheld",extra:"discard"}), {schemaVersion:1,layout:"handheld",fullscreen:true});
});
test("display preferences are shared by game and isolated by account", () => {
  assert.equal(presentationKey(null), presentationKey(undefined));
  assert.notEqual(presentationKey("one@example.test"),presentationKey("two@example.test"));
  assert.notEqual(presentationKey(null),presentationKey("one@example.test"));
});
