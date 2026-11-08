import { test } from "node:test";
import assert from "node:assert/strict";
import { prepareGuestData, signInLocal, signOut } from "../src/features/auth/state/auth-session";

test("guest progress transfers to new accounts; logout and existing accounts stay isolated", () => {
  const records = new Map<string, string>();
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const oldEvent = Object.getOwnPropertyDescriptor(globalThis, "StorageEvent");
  const storage = {
    get length() { return records.size; },
    key: (index: number) => [...records.keys()][index] ?? null,
    getItem: (key: string) => records.get(key) ?? null,
    setItem: (key: string, value: string) => { records.set(key, value); },
    removeItem: (key: string) => { records.delete(key); },
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: storage, dispatchEvent: () => true } });
  Object.defineProperty(globalThis, "StorageEvent", { configurable: true, value: class {} });
  const progress = "statoz.games.web.shootout.v1";
  const bundle = "statoz.games.web.bundle.retro-hoops.";
  const presentation = "statoz.games.web.retro.presentation.";
  try {
    records.set(progress, "guest-first-run");
    records.set("statoz.games.web.xp-ledger.v1", "guest-xp");
    records.set("statoz.games.web.footballbingo.v1", "guest-bingo");
    records.set(bundle + "guest", "guest-bundle");
    records.set(presentation + "guest", "guest-display");
    const session = signInLocal(" Player@Example.test ");
    assert.equal(session.email, "player@example.test");
    assert.equal(records.get(progress), "guest-first-run");
    assert.equal(records.get(bundle + "player%40example.test"), "guest-bundle");
    assert.equal(records.get(presentation + "player%40example.test"), "guest-display");
    assert.equal(records.has(bundle + "guest"), false);
    assert.equal(records.get("statoz.games.web.xp-ledger.v1"), "guest-xp");
    assert.equal(records.get("statoz.games.web.footballbingo.v1"), "guest-bingo");
    records.set(progress, "account-progress");
    signOut();
    assert.equal(records.has("statoz.games.web.auth.v2"), false);
    assert.equal(records.has(progress), false, "guests must not see signed-out account progress");
    assert.equal(records.has("statoz.games.web.xp-ledger.v1"), false);
    assert.equal(records.has("statoz.games.web.footballbingo.v1"), false);
    records.set(progress, "second-guest-run");
    signInLocal("player@example.test");
    assert.equal(records.get(progress), "account-progress", "existing accounts retain their own saves");
    signOut();
    assert.equal(records.get(progress), "second-guest-run", "guest saves survive signing in to an existing account");
    signInLocal("new@example.test");
    assert.equal(records.get(progress), "second-guest-run", "a new account adopts the current guest run");
    signOut();
    assert.equal(records.has(progress), false, "transferred progress no longer belongs to the guest");
    signInLocal("player@example.test");
    assert.equal(records.get(progress), "account-progress");
    signInLocal("new@example.test");
    assert.equal(records.get(progress), "second-guest-run");
    records.delete("statoz.games.web.auth.v2"); // The former logout only removed auth.
    prepareGuestData();
    assert.equal(records.has(progress), false, "legacy logout data is hidden before guest play");
    signInLocal("new@example.test");
    assert.equal(records.get(progress), "second-guest-run", "legacy account progress remains recoverable");
  } finally {
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow); else Reflect.deleteProperty(globalThis, "window");
    if (oldEvent) Object.defineProperty(globalThis, "StorageEvent", oldEvent); else Reflect.deleteProperty(globalThis, "StorageEvent");
  }
});
