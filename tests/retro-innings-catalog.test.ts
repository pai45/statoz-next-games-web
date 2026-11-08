import { test } from "node:test";
import assert from "node:assert/strict";
import { gameForHref, gameRegistry, playableGameHrefs } from "../src/mocks/games/game-registry";
import { deckFor, sportForGame } from "../src/mocks/games/sport-decks";
import { signInLocal } from "../src/features/auth/state/auth-session";

test("Creasefire Six is retired while Stadium Cricket remains available", () => {
  assert.equal(gameForHref("/play/retro-innings"), null);
  assert.ok(!playableGameHrefs().includes("/play/retro-innings"));
  assert.equal(sportForGame("stadium-cricket"), "cricket");
  assert.ok(!deckFor("cricket").heroes.includes("retro-innings"));
  assert.equal(gameRegistry["retro-innings"].requiresDeck, undefined);
  assert.equal(gameForHref("/play/final-over"), null);
  assert.equal(gameForHref("/play/stadium-cricket")?.game, "stadium-cricket");
  assert.equal(gameRegistry["stadium-cricket"].requiresDeck, undefined);
});

test("Cricket local records follow the existing player account switch", () => {
  const records = new Map<string, string>();
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const oldEvent = Object.getOwnPropertyDescriptor(globalThis, "StorageEvent");
  const localStorage = {getItem:(k:string) => records.get(k) ?? null, setItem:(k:string,v:string) => records.set(k,v), removeItem:(k:string) => records.delete(k)};
  Object.defineProperty(globalThis, "window", {configurable:true,value:{localStorage,dispatchEvent:() => true}});
  Object.defineProperty(globalThis, "StorageEvent", {configurable:true,value:class {}});
  const key = "statoz.games.web.retro-innings:v1";
  try {
    signInLocal("cricket-a@example.test"); localStorage.setItem(key, "first-player");
    signInLocal("cricket-b@example.test"); assert.equal(localStorage.getItem(key), null);
    localStorage.setItem(key, "second-player");
    signInLocal("cricket-a@example.test"); assert.equal(localStorage.getItem(key), "first-player");
    signInLocal("cricket-b@example.test"); assert.equal(localStorage.getItem(key), "second-player");
  } finally {
    if(oldWindow) Object.defineProperty(globalThis,"window",oldWindow); else Reflect.deleteProperty(globalThis,"window");
    if(oldEvent) Object.defineProperty(globalThis,"StorageEvent",oldEvent); else Reflect.deleteProperty(globalThis,"StorageEvent");
  }
});
