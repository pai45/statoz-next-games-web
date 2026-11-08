import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { signInLocal, signOut } from "../src/features/auth/state/auth-session";
import { allGamesInFeedOrder, homeGameStrip, searchHomeGames } from "../src/features/games/home-catalog";
import { homeRecentsKey, isHomeGame, parseHomeRecents, withRecentGame } from "../src/features/games/state/home-recents-model";
import { recordHomeGame } from "../src/features/games/state/home-recents";
import { gameSportFor, homeSpotlights } from "../src/mocks/games";

test("recent records reject malformed, retired and duplicate games and sort by last launch", () => {
  for (const raw of [null, "broken", "{}", '{"version":2,"entries":[]}']) assert.deepEqual(parseHomeRecents(raw), []);
  const entries = parseHomeRecents(JSON.stringify({ version: 1, entries: [
    { gameId: "penalty-cup", lastPlayedAt: 5 }, { gameId: "hoop-legacy", lastPlayedAt: 20 },
    { gameId: "penalty-cup", lastPlayedAt: 30 }, { gameId: "football-quiz", lastPlayedAt: 40 },
    { gameId: "unknown", lastPlayedAt: 50 }, { gameId: "cricketer", lastPlayedAt: -1 },
    { gameId: "cricketer", lastPlayedAt: "100" }, null,
  ] }));
  assert.deepEqual(entries, [{ gameId: "penalty-cup", lastPlayedAt: 30 }, { gameId: "hoop-legacy", lastPlayedAt: 20 }]);
  assert.equal(isHomeGame("__proto__"), false);
});

test("recent history is limited to twelve and a replay moves a title to the front", () => {
  let records = [] as ReturnType<typeof parseHomeRecents>;
  const games = allGamesInFeedOrder();
  assert.ok(games.length > 12);
  games.forEach((game, i) => { records = withRecentGame(records, game, i + 1); });
  assert.equal(records.length, 12);
  records = withRecentGame(records, "penalty-cup", 100);
  assert.equal(records[0].gameId, "penalty-cup");
  assert.equal(new Set(records.map(entry => entry.gameId)).size, 12);
  assert.deepEqual(withRecentGame(records, "not-a-game", 200), records);
});

test("the lineup combines recent play with editorial fallback and respects sport filters", () => {
  assert.deepEqual(homeGameStrip([]).slice(0, 4), ["penalty-cup", "hoop-legacy", "portfolio-formula", "cricketer"]);
  const strip = homeGameStrip([{ gameId: "open-golf", lastPlayedAt: 100 }, { gameId: "penalty-cup", lastPlayedAt: 90 }]);
  assert.equal(strip[0], "open-golf"); assert.equal(strip.length, allGamesInFeedOrder().length);
  assert.deepEqual([...strip].sort(), [...allGamesInFeedOrder()].sort(), "every enabled game is present in the main scroll");
  assert.equal(new Set(strip).size, strip.length);
  assert.ok(homeGameStrip([], "football").every(game => gameSportFor(game) === "football"));
  assert.deepEqual(homeGameStrip([], "golf"), ["open-golf"]);
});

test("library search matches titles and sports without changing catalog order", () => {
  const games = allGamesInFeedOrder();
  assert.deepEqual(searchHomeGames(games, "   "), games);
  assert.deepEqual(searchHomeGames(games, "pEnAlTy CuP"), ["penalty-cup"]);
  assert.ok(searchHomeGames(games, "basketball").every(game => gameSportFor(game) === "basketball"));
  assert.deepEqual(searchHomeGames(games, "zzzz-no-match"), []);
});

test("recent play follows account switches, guest adoption and sign-out; blocked storage is harmless", () => {
  const records = new Map<string, string>();
  const savedWindow = Object.getOwnPropertyDescriptor(globalThis, "window"), savedEvent = Object.getOwnPropertyDescriptor(globalThis, "StorageEvent");
  const localStorage = { getItem: (key: string) => records.get(key) ?? null, setItem: (key: string, value: string) => { records.set(key, value); }, removeItem: (key: string) => { records.delete(key); } };
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage, dispatchEvent: () => true } });
  Object.defineProperty(globalThis, "StorageEvent", { configurable: true, value: class {} });
  try {
    recordHomeGame("open-golf", 5);
    signInLocal("console-one@example.test");
    assert.equal(parseHomeRecents(localStorage.getItem(homeRecentsKey))[0].gameId, "open-golf", "a new account adopts its guest session");
    recordHomeGame("penalty-cup", 10);
    signInLocal("console-two@example.test");
    assert.equal(localStorage.getItem(homeRecentsKey), null);
    recordHomeGame("hoop-legacy", 20);
    signInLocal("console-one@example.test");
    assert.equal(parseHomeRecents(localStorage.getItem(homeRecentsKey))[0].gameId, "penalty-cup");
    signOut();
    assert.equal(localStorage.getItem(homeRecentsKey), null);
    Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } });
    assert.doesNotThrow(() => recordHomeGame("penalty-cup", 50));
  } finally {
    if (savedWindow) Object.defineProperty(globalThis, "window", savedWindow); else Reflect.deleteProperty(globalThis, "window");
    if (savedEvent) Object.defineProperty(globalThis, "StorageEvent", savedEvent); else Reflect.deleteProperty(globalThis, "StorageEvent");
  }
});

test("spotlight assets are local, widescreen and match their recorded provenance", () => {
  const root = "public/assets/games/home/spotlights/";
  const manifest = JSON.parse(readFileSync(root + "PROVENANCE.json", "utf8"));
  assert.equal(manifest.assets.length, 4);
  for (const asset of manifest.assets) {
    assert.ok(homeSpotlights[asset.gameId]);
    assert.deepEqual([asset.width, asset.height], [1920, 1080]);
    const buffer = readFileSync(root + asset.file);
    assert.ok(buffer.length < 350_000);
    assert.equal(createHash("sha256").update(buffer).digest("hex"), asset.sha256);
    assert.ok(asset.prompt.length > 100);
  }
});
