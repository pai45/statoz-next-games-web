import { test } from "node:test";
import assert from "node:assert/strict";
import { signInLocal } from "../src/features/auth/state/auth-session";
import { readShootoutProgress, recordShootout, resetShootoutProgress } from "../src/features/games/penalty-shootout/state/shootout-progress";
import { readEconomy, settleCoinReward } from "../src/features/economy";
import { ShootoutInput } from "../src/features/games/penalty-shootout/input";

test("Legacy results survive; session settlement is idempotent and account-scoped", () => {
  const records = new Map<string, string>(), oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window"), oldEvent = Object.getOwnPropertyDescriptor(globalThis, "StorageEvent");
  let unavailable = false;
  const localStorage = { getItem: (k: string) => { if (unavailable) throw Error("blocked"); return records.get(k) ?? null; }, setItem: (k: string, v: string) => { if (unavailable) throw Error("blocked"); records.set(k, v); }, removeItem: (k: string) => records.delete(k) };
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage, dispatchEvent: () => true } });
  Object.defineProperty(globalThis, "StorageEvent", { configurable: true, value: class {} });
  try {
    signInLocal("shootout-a@example.test");
    records.set("statoz.games.web.shootout.v1", JSON.stringify({ xp: 18, wins: 2, played: 3, history: [{ id: "legacy", playedAt: "2026-01-01T00:00:00Z", opponentName: "Old rival", playerScore: 5, opponentScore: 4, suddenDeath: false, xpEarned: 8 }] }));
    assert.equal(readShootoutProgress().xp, 18); assert.equal(readShootoutProgress().history[0].id, "legacy");
    const result = { sessionId: "shootout-test-unique-1", runtimeVersion: "vita-inspired-1", won: true, margin: 2, playerScore: 4, opponentScore: 2, opponentName: "Rival FC", suddenDeath: false };
    assert.equal(recordShootout(result), 10); assert.equal(recordShootout(result), 0); assert.equal(readShootoutProgress().xp, 28); assert.equal(readShootoutProgress().played, 4);
    const coins = readEconomy().coins;
    settleCoinReward({ id: result.sessionId, coins: 50, title: "PENALTY SHOOTOUT" }); settleCoinReward({ id: result.sessionId, coins: 50, title: "PENALTY SHOOTOUT" });
    assert.equal(readEconomy().coins, coins + 50);
    records.set("statoz.games.web.shootout.settings.v1", JSON.stringify({ muted: true }));
    signInLocal("shootout-b@example.test"); assert.equal(readShootoutProgress().xp, 0); assert.equal(localStorage.getItem("statoz.games.web.shootout.settings.v1"), null);
    signInLocal("shootout-a@example.test"); assert.equal(readShootoutProgress().xp, 28); assert.equal(JSON.parse(localStorage.getItem("statoz.games.web.shootout.settings.v1")!).muted, true);
    records.set("statoz.games.web.shootout.v1", "corrupt"); assert.equal(readShootoutProgress().played, 0);
    unavailable = true; resetShootoutProgress(); recordShootout({ ...result, sessionId: "in-memory-result" }); assert.equal(readShootoutProgress().played, 1); assert.equal(recordShootout({ ...result, sessionId: "in-memory-result" }), 0);
  } finally { if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow); else Reflect.deleteProperty(globalThis, "window"); if (oldEvent) Object.defineProperty(globalThis, "StorageEvent", oldEvent); else Reflect.deleteProperty(globalThis, "StorageEvent"); }
});

test("Keyboard, simultaneous touch and gamepad input converge; cancellation and disconnection clear holds", () => {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window"), oldNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator"), handlers = new Map<string, (e: KeyboardEvent) => void>();
  let pads: (Gamepad | null)[] = [], pauses = 0;
  Object.defineProperty(globalThis, "window", { configurable: true, value: { addEventListener: (name: string, fn: (e: KeyboardEvent) => void) => handlers.set(name, fn), removeEventListener: (name: string) => handlers.delete(name) } });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { getGamepads: () => pads } });
  const input = new ShootoutInput(() => pauses++);
  const key = (code: string, type = "keydown") => handlers.get(type)?.({ code, repeat: false, preventDefault() {}, target: null } as unknown as KeyboardEvent);
  try {
    key("KeyD"); key("Space"); assert.equal(input.sample().x, 1); assert.equal(input.sample().shoot, true);
    input.clear(); input.aim(-0.5, 0.25); input.shoot(true); assert.equal(input.sample().shoot, true); assert.equal(input.sample().x, -0.5);
    input.setPaused(true); assert.equal(input.sample().shoot, false); input.setPaused(false); assert.equal(input.sample().x, 0);
    // Screen-right maps to the simulation's retained behind-keeper convention.
    input.setRole("keeping"); key("ArrowRight"); key("ArrowUp"); assert.deepEqual(input.sample().dive, { x: -1, y: 1 });
    const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })); buttons[4].pressed = true;
    pads = [{ id: "test", mapping: "standard", connected: true, axes: [0.5, -0.5, -1, -1], buttons } as unknown as Gamepad];
    const frame = input.sample(); assert.deepEqual(frame.dive, { x: 1, y: 1 }); assert.equal(frame.style, "chip"); assert.equal(frame.x, -0.5);
    pads = []; input.sample(); assert.equal(pauses, 1); assert.equal(input.sample().shoot, false);
    input.shoot(true); handlers.get("blur")?.({} as KeyboardEvent); assert.equal(input.sample().shoot, false); assert.equal(pauses, 2);
  } finally { input.dispose(); if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow); else Reflect.deleteProperty(globalThis, "window"); if (oldNavigator) Object.defineProperty(globalThis, "navigator", oldNavigator); else Reflect.deleteProperty(globalThis, "navigator"); }
});
