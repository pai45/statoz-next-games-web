import { isHomeGame, type RecentGame } from "./home-recents-model";
import type { GameId } from "../types";

export type ProfileGameMetric = { label: string; value: string };
export type ProfileGameRecord = { id: string; label: string; detail: string; at?: string };
export type ProfileGameSummary = {
  gameId: GameId;
  lastPlayedAt: number | null;
  hasSavedProgress: boolean;
  metrics: ProfileGameMetric[];
  records: ProfileGameRecord[];
};

type CountedCareer = { played: number; wins: number; xp: number };
export type ProfileGameSources = {
  recents: readonly RecentGame[];
  pitchDuel: CountedCareer & { goalsFor: number; history: { id: string; playedAt: string; playerScore: number; opponentScore: number; opponentName: string; result: string }[] };
  shootout: CountedCareer & { history: { id: string; playedAt: string; opponentName: string; playerScore: number; opponentScore: number }[] };
  tennis: { setsPlayed: number; setsWon: number; bestWinStreak: number };
  golf: { cleared: number; total: number; aces: number; bests: readonly (number | null)[] } | null;
  rally: string | null;
};

const metric = (label: string, value: number | string): ProfileGameMetric => ({ label, value: String(value) });
const object = (value: unknown): Record<string, unknown> | null => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const positive = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value > 0;
const stageName = (key: string) => key.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
const rallyStages = ["pine-ridge", "red-mesa", "frostvale", "harbour-hill", "mudbank-farm"];
export const profileTimeLabel = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(2).padStart(5, "0")}`;

/** A projection only. No migration, synthetic results, or writes to engine stores. */
export function rallyProfileRecords(raw: string | null): ProfileGameRecord[] {
  try {
    const save = object(JSON.parse(raw ?? "null"));
    if (save?.version !== 1 || save.rulesVersion !== 1) return [];
    const records = Object.entries(object(save.records) ?? {}).flatMap(([key, value]) => {
      const [stage, throttle, brake] = key.split(":"), row = object(value);
      if (key.split(":").length !== 3 || !rallyStages.includes(stage) || !["auto", "manual"].includes(throttle) || !["assist", "free"].includes(brake) || !positive(row?.best) || row.best <= 10) return [];
      const medal = ["gold", "silver", "bronze"].includes(String(row.medal)) ? `${row.medal} medal · ` : "";
      return [{ id: key, label: `${stageName(stage)} · ${profileTimeLabel(row.best)}`, detail: `${medal}${throttle === "auto" ? "Auto throttle" : "Manual throttle"} · ${brake === "assist" ? "Brake assist" : "No brake assist"}` }];
    });
    const recent: ProfileGameRecord[] = (Array.isArray(save.recent) ? save.recent : []).slice(0, 12).flatMap(value => {
      const result = object(value);
      if (!result || result.version !== 1 || result.rulesVersion !== 1 || typeof result.id !== "string" || !rallyStages.includes(String(result.stage)) || !["stage", "rallycross"].includes(String(result.mode)) || !["finished", "retired"].includes(String(result.status)) || !positive(result.elapsed)) return [];
      const position = positive(result.position) && positive(result.fieldSize) ? `Position ${result.position}/${result.fieldSize}` : "Finished";
      return [{ id: `result:${result.id}`, label: `${result.mode === "stage" ? "Stage attack" : "Rallycross"} · ${stageName(String(result.stage))}`, detail: `${result.status === "retired" ? "Retired" : position} · ${profileTimeLabel(result.elapsed)}` }];
    });
    return [...records, ...recent];
  } catch { return []; }
}

export function buildProfileGameSummaries(source: ProfileGameSources): ProfileGameSummary[] {
  const rows = new Map<GameId, ProfileGameSummary>();
  const add = (gameId: GameId, metrics: ProfileGameMetric[], records: ProfileGameRecord[], hasSavedProgress: boolean) => {
    if (isHomeGame(gameId) && hasSavedProgress) rows.set(gameId, { gameId, lastPlayedAt: null, hasSavedProgress, metrics, records });
  };
  const duel = source.pitchDuel;
  add("pitch-duel", [metric("Matches", duel.played), metric("Wins", duel.wins), metric("Goals", duel.goalsFor)], duel.history.map(row => ({ id: row.id, label: `${row.result} · ${row.playerScore}–${row.opponentScore}`, detail: `vs ${row.opponentName}`, ...(Number.isFinite(Date.parse(row.playedAt)) && Date.parse(row.playedAt) > 0 ? { at: row.playedAt } : {}) })), duel.played > 0);
  const shootout = source.shootout;
  add("penalty-shootout", [metric("Shootouts", shootout.played), metric("Wins", shootout.wins)], shootout.history.filter(row => typeof row.opponentName === "string" && Number.isFinite(row.playerScore) && Number.isFinite(row.opponentScore)).map(row => ({ id: row.id, label: `${row.playerScore > row.opponentScore ? "Victory" : "Defeat"} · ${row.playerScore}–${row.opponentScore}`, detail: `vs ${row.opponentName}`, ...(Number.isFinite(Date.parse(row.playedAt)) ? { at: row.playedAt } : {}) })), shootout.played > 0);
  add("tennis-rally", [metric("Sets", source.tennis.setsPlayed), metric("Sets won", source.tennis.setsWon), metric("Best streak", source.tennis.bestWinStreak)], [], source.tennis.setsPlayed > 0);
  if (source.golf) {
    const golf = source.golf;
    add("open-golf", [metric("Holes cleared", `${golf.cleared}/20`), metric("Best strokes total", golf.total), metric("Aces", golf.aces)], golf.bests.flatMap((best, index) => best === null ? [] : [{ id: `hole-${index + 1}`, label: `Hole ${index + 1}`, detail: `Personal best · ${best} ${best === 1 ? "stroke" : "strokes"}` }]), golf.cleared > 0);
  }
  const rally = rallyProfileRecords(source.rally);
  const stageRecords = rally.filter(row => !row.id.startsWith("result:"));
  add("grand-prix-dash", [metric("Stage records", stageRecords.length), metric("Stages medalled", new Set(stageRecords.filter(row => row.detail.includes("medal")).map(row => row.id.split(":")[0])).size)], rally, rally.length > 0);
  for (const recent of source.recents) {
    if (!isHomeGame(recent.gameId)) continue;
    const row = rows.get(recent.gameId) ?? { gameId: recent.gameId, lastPlayedAt: null, hasSavedProgress: false, metrics: [], records: [] };
    rows.set(recent.gameId, { ...row, lastPlayedAt: recent.lastPlayedAt });
  }
  return [...rows.values()].sort((a, b) => (b.lastPlayedAt ?? 0) - (a.lastPlayedAt ?? 0) || a.gameId.localeCompare(b.gameId));
}
