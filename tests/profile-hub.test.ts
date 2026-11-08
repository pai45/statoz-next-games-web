import test from "node:test";
import assert from "node:assert/strict";
import { buildProfileGameSummaries, rallyProfileRecords, type ProfileGameSources } from "../src/features/games/state/profile-game-model";
import { hubAchievements, showcaseAchievements, showcaseSlots, earnedProfileTitle, nextHubAchievement } from "../src/features/profile/data/player-hub";
import { parseProfilePreferences } from "../src/features/profile/state/profile-preferences";
import { readProfileIdentity, saveHubPreferences } from "../src/features/profile/state/profile-identity";
import { signInLocal, signOut } from "../src/features/auth/state/auth-session";
import type { AchievementStats } from "../src/features/profile/types";

const emptySources = (): ProfileGameSources => ({ recents: [], pitchDuel: { played: 0, wins: 0, xp: 0, goalsFor: 0, history: [] }, shootout: { played: 0, wins: 0, xp: 0, history: [] }, tennis: { setsPlayed: 0, setsWon: 0, bestWinStreak: 0 }, golf: null, rally: null });
const stats = (overrides: Partial<AchievementStats> = {}): AchievementStats => ({ level: 1, totalXp: 0, matchesPlayed: 0, matchWins: 0, bestMatchStreak: 0, cleanSheets: 0, shootoutWins: 0, basketballWins: 0, tennisAchievements: [], predictionsMade: 0, correctPredictions: 0, picksPlaced: 0, picksWon: 0, pickStreak: 0, pickProfit: 0, ownedCards: 0, platinumOwned: 0, coins: 0, ...overrides });

test("launches remain launches, with no invented results or metrics; retired games stay absent", () => {
  const source = emptySources();
  source.recents = [{ gameId: "open-golf", lastPlayedAt: 20 }, { gameId: "penalty-cup", lastPlayedAt: 40 }, { gameId: "football-quiz", lastPlayedAt: 60 }];
  const summaries = buildProfileGameSummaries(source);
  assert.deepEqual(summaries.map(summary => summary.gameId), ["penalty-cup", "open-golf"]);
  for (const summary of summaries) { assert.equal(summary.hasSavedProgress, false); assert.deepEqual(summary.records, []); assert.deepEqual(summary.metrics, []); }
});

test("native game summaries preserve match scores and golf stroke units without modifying sources", () => {
  const source = emptySources();
  source.pitchDuel = { played: 2, wins: 1, xp: 100, goalsFor: 5, history: [{ id: "match-1", playedAt: "2026-11-06T10:00:00Z", playerScore: 3, opponentScore: 1, opponentName: "Local rival", result: "Victory" }] };
  source.golf = { cleared: 2, total: 4, aces: 1, bests: [1, 3, null] };
  const before = JSON.stringify(source), summaries = buildProfileGameSummaries(source);
  assert.equal(JSON.stringify(source), before);
  const duel = summaries.find(summary => summary.gameId === "pitch-duel")!;
  assert.equal(duel.records[0].label, "Victory · 3–1");
  assert.equal(duel.records[0].at, source.pitchDuel.history[0].playedAt);
  const golf = summaries.find(summary => summary.gameId === "open-golf")!;
  assert.deepEqual(golf.metrics.map(metric => metric.value), ["2/20", "4", "1"]);
  assert.equal(golf.records[0].detail, "Personal best · 1 stroke");
  assert.equal(golf.records[1].at, undefined, "hole bests have no invented match timestamps");
});

test("Rally personal bests keep stage and assist identity and reject incompatible saves", () => {
  const raw = JSON.stringify({ version: 1, rulesVersion: 1, records: {
    "pine-ridge:auto:assist": { best: 65.25, medal: "silver" },
    "pine-ridge:manual:free": { best: 69.5, medal: "bronze" },
    "unknown:auto:assist": { best: 10 }, "red-mesa:auto:free": { best: -1 },
  } });
  const records = rallyProfileRecords(raw);
  assert.equal(records.length, 2);
  assert.equal(records[0].label, "Pine Ridge · 1:05.25");
  assert.equal(records[0].detail, "silver medal · Auto throttle · Brake assist");
  assert.equal(records[1].detail, "bronze medal · Manual throttle · No brake assist");
  for (const invalid of [null, "broken", '{"version":2,"rulesVersion":1}', '{"version":1,"rulesVersion":2}']) assert.deepEqual(rallyProfileRecords(invalid), []);
});

test("game-only achievements exclude predictions, picks, purchasing and unsupported locked feats", () => {
  const fresh = stats();
  assert.ok(hubAchievements(fresh).every(achievement => ["matches", "progression"].includes(achievement.category)));
  assert.ok(!hubAchievements(fresh).some(achievement => ["clean_sheet", "first_bucket", "court_king"].includes(achievement.id)));
  assert.deepEqual(showcaseAchievements(fresh, undefined), []);
  assert.ok(nextHubAchievement(fresh));
  const earned = stats({ level: 25, matchWins: 3, basketballWins: 5 });
  assert.equal(showcaseAchievements(earned, undefined)[0].id, "legend");
  assert.equal(showcaseAchievements(earned, undefined).length, 3);
  assert.deepEqual(showcaseAchievements(earned, []), [], "empty showcases are intentional");
  assert.deepEqual(showcaseAchievements(earned, ["hat_trick", "legend", "hat_trick", "first_prediction"]).map(achievement => achievement.id), ["hat_trick", "legend"]);
  assert.equal(earnedProfileTitle(fresh, "legend"), "StatOz Player");
  assert.equal(earnedProfileTitle(earned, "legend"), "Legend");
  assert.equal(earnedProfileTitle(earned, "first_prediction"), "StatOz Player");
  const complete = stats({ level: 25, matchesPlayed: 100, matchWins: 100, bestMatchStreak: 10, shootoutWins: 5, basketballWins: 5, cleanSheets: 5, tennisAchievements: ["clean-hold", "break-through", "unbreakable", "ace-high", "rally-architect", "net-authority", "comeback-set", "tiebreak-nerve", "all-styles", "champion"] });
  assert.equal(nextHubAchievement(complete), undefined, "a completed catalog has no invented next goal");
});

test("Rallycross saved results appear without requiring a stage best or inventing dates", () => {
  const source = emptySources();
  source.rally = JSON.stringify({ version: 1, rulesVersion: 1, records: {}, recent: [{ version: 1, rulesVersion: 1, id: "race-1", mode: "rallycross", stage: "red-mesa", status: "finished", position: 2, fieldSize: 6, elapsed: 150.25 }] });
  const summary = buildProfileGameSummaries(source).find(summary => summary.gameId === "grand-prix-dash")!;
  assert.equal(summary.hasSavedProgress, true);
  assert.equal(summary.records[0].label, "Rallycross · Red Mesa");
  assert.equal(summary.records[0].detail, "Position 2/6 · 2:30.25");
  assert.equal(summary.records[0].at, undefined);
});

test("old identity records gain safe preferences and retain explicit empty pin selections", () => {
  assert.deepEqual(parseProfilePreferences({}), { featuredGameId: null, equippedTitleAchievementId: null });
  assert.deepEqual(parseProfilePreferences({ pinnedAchievementIds: [] }).pinnedAchievementIds, []);
  assert.deepEqual(parseProfilePreferences({ pinnedAchievementIds: ["legend", "legend", 1, "pro", "veteran", "on_fire"] }).pinnedAchievementIds, ["legend", "", ""]);
  const pins = parseProfilePreferences({ pinnedAchievementIds: ["", "", "legend"] }).pinnedAchievementIds;
  assert.deepEqual(showcaseSlots(stats({ level: 25 }), pins).map(trophy => trophy?.id), [undefined, undefined, "legend"]);
});

test("profile choices survive reload reads and account switches without changing XP, currency or game saves", () => {
  const records = new Map<string, string>();
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window"), previousEvent = Object.getOwnPropertyDescriptor(globalThis, "StorageEvent");
  const localStorage = { getItem: (key: string) => records.get(key) ?? null, setItem: (key: string, value: string) => { records.set(key, value); }, removeItem: (key: string) => { records.delete(key); }, key: (index: number) => [...records.keys()][index] ?? null, get length() { return records.size; } };
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage, dispatchEvent: () => true } });
  Object.defineProperty(globalThis, "StorageEvent", { configurable: true, value: class {} });
  try {
    signInLocal("hub-one@example.test");
    localStorage.setItem("statoz.games.web.pitch-duel.v4", '{"xp":600}');
    localStorage.setItem("statoz.games.web.economy.v1", '{"coins":123}');
    localStorage.setItem("statoz.games.web.xp-ledger.v1", '{"balances":{"pitchDuel":600}}');
    assert.equal(saveHubPreferences({ featuredGameId: "open-golf", pinnedAchievementIds: ["legend"], equippedTitleAchievementId: "legend" }), true);
    assert.equal(readProfileIdentity().featuredGameId, "open-golf");
    for (const [key, expected] of [["pitch-duel.v4", '{"xp":600}'], ["economy.v1", '{"coins":123}'], ["xp-ledger.v1", '{"balances":{"pitchDuel":600}}']]) assert.equal(localStorage.getItem(`statoz.games.web.${key}`), expected);
    signInLocal("hub-two@example.test");
    assert.equal(readProfileIdentity().featuredGameId, undefined);
    saveHubPreferences({ featuredGameId: "penalty-cup", pinnedAchievementIds: [] });
    signInLocal("hub-one@example.test");
    assert.equal(readProfileIdentity().featuredGameId, "open-golf");
    assert.deepEqual(readProfileIdentity().pinnedAchievementIds, ["legend"]);
    signOut();
    assert.notEqual(readProfileIdentity().featuredGameId, "open-golf");
    localStorage.setItem = () => { throw Error("Storage blocked"); };
    assert.equal(saveHubPreferences({ featuredGameId: "open-golf" }), false);
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow); else Reflect.deleteProperty(globalThis, "window");
    if (previousEvent) Object.defineProperty(globalThis, "StorageEvent", previousEvent); else Reflect.deleteProperty(globalThis, "StorageEvent");
  }
});
