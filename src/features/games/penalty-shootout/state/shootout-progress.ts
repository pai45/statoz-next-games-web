"use client";

import { useSyncExternalStore } from "react";

import { recordStreakActivity } from "@/features/streaks/activity";

/**
 * What this browser has done in the shootout, and the level the CPU is scaled
 * to because of it.
 *
 * Flutter reads this off a `PlayerProgression` track inside its global game
 * bloc, alongside coins, match history, and streaks. None of those exist on the
 * web yet, so the one part the game actually needs — the XP that sets the
 * difficulty — lives here, in the shape the packs feature already established
 * for browser-local state.
 */

const storageKey = "statoz.next.games-web.shootout.v1";

/** One finished shootout, as the lobby's Match History lists it. */
export type ShootoutHistoryEntry = {
  id: string;
  /** ISO timestamp. */
  playedAt: string;
  opponentName: string;
  playerScore: number;
  opponentScore: number;
  suddenDeath: boolean;
  xpEarned: number;
  runtimeVersion?: string;
};

export type ShootoutProgress = {
  xp: number;
  wins: number;
  played: number;
  /** Newest first, capped — this is a lobby list, not an archive. */
  history: ShootoutHistoryEntry[];
};

/** How many finished shootouts the lobby keeps. */
export const historyLimit = 25;

/** The snapshot before anything is known — and the one the server always sees. */
const nothingPlayed: ShootoutProgress = Object.freeze({
  xp: 0,
  wins: 0,
  played: 0,
  history: [],
});

/**
 * `useSyncExternalStore` compares snapshots by reference, so the parsed value
 * is cached and only replaced when the stored text actually changes. Returning
 * a fresh object every read would re-render forever.
 */
let cachedRaw: string | null = null;
let fallbackRaw: string | null = null;
let cachedValue: ShootoutProgress = nothingPlayed;

const listeners = new Set<() => void>();
const settledSessions = new Set<string>();

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return fallbackRaw;
  }
}

function coerce(value: unknown): ShootoutProgress {
  if (!value || typeof value !== "object") return nothingPlayed;
  const record = value as Record<string, unknown>;
  const read = (key: string) =>
    typeof record[key] === "number" && Number.isFinite(record[key])
      ? Math.max(0, Math.floor(record[key] as number))
      : 0;

  const history = Array.isArray(record.history)
    ? (record.history.filter(
        (entry): entry is ShootoutHistoryEntry =>
          !!entry && typeof entry === "object" && "id" in entry,
      ) as ShootoutHistoryEntry[])
    : [];

  return {
    xp: read("xp"),
    wins: read("wins"),
    played: read("played"),
    history: history.slice(0, historyLimit),
  };
}

function getSnapshot(): ShootoutProgress {
  const raw = readRaw();
  if (raw === cachedRaw) return cachedValue;

  cachedRaw = raw;
  if (!raw) {
    cachedValue = nothingPlayed;
    return cachedValue;
  }

  try {
    cachedValue = coerce(JSON.parse(raw));
  } catch {
    // Unreadable state is treated as no state rather than crashing the route.
    cachedValue = nothingPlayed;
  }
  return cachedValue;
}

function getServerSnapshot(): ShootoutProgress {
  return nothingPlayed;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // A shootout finished in another tab should settle this one too.
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function write(next: ShootoutProgress): void {
  const raw = JSON.stringify(next);
  fallbackRaw = raw;
  try {
    window.localStorage.setItem(storageKey, raw);
  } catch {
    // Storage may be full or blocked; the record is lost, the session is not.
  }
  cachedRaw = raw;
  cachedValue = next;
  for (const listener of listeners) listener();
}

/* ---- The XP curve ------------------------------------------------------ */

/**
 * The curve itself is shared with every other mode and with the profile that
 * levels their sum, so it lives in `domain/progression`. Re-exported here
 * because the lobby and the result reach for it through this store.
 */
export {
  levelFromXp,
  levelProgress,
  xpToReach,
  type LevelProgress,
} from "@/domain/progression";

/**
 * XP for one shootout: +8, +10, or +12 by winning margin, and nothing at all
 * for a loss. A quicker mode than a full match, so smaller stakes — and a loss
 * never subtracts.
 */
export function shootoutXp(won: boolean, margin: number): number {
  return won ? Math.min(12, 8 + (margin - 1) * 2) : 0;
}

/* ---- Hooks ------------------------------------------------------------- */

const neverChanges = () => () => {};

/** False on the server and through the first client render, true afterwards. */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    neverChanges,
    () => true,
    () => false,
  );
}

export function useShootoutProgress(): ShootoutProgress {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Reads progress without subscribing — for the beat a shootout is created. */
export function readShootoutProgress(): ShootoutProgress {
  if (typeof window === "undefined") return nothingPlayed;
  return getSnapshot();
}

export type ShootoutOutcome = {
  sessionId?: string;
  runtimeVersion?: string;
  won: boolean;
  margin: number;
  playerScore: number;
  opponentScore: number;
  opponentName: string;
  suddenDeath: boolean;
};

/**
 * Records a finished shootout. Call this exactly once per shootout, on the beat
 * the result is decided — Flutter dispatches `ShootoutFinished` there and
 * guards it with a flag for the same reason.
 */
export function recordShootout(outcome: ShootoutOutcome): number {
  const current = getSnapshot();
  if (outcome.sessionId && (settledSessions.has(outcome.sessionId) || current.history.some(entry => entry.id === outcome.sessionId))) return 0;
  if (outcome.sessionId) settledSessions.add(outcome.sessionId);
  const gained = shootoutXp(outcome.won, outcome.margin);

  const entry: ShootoutHistoryEntry = {
    id: outcome.sessionId ?? `shootout-${Date.now()}`,
    ...(outcome.runtimeVersion ? { runtimeVersion: outcome.runtimeVersion } : {}),
    playedAt: new Date().toISOString(),
    opponentName: outcome.opponentName,
    playerScore: outcome.playerScore,
    opponentScore: outcome.opponentScore,
    suddenDeath: outcome.suddenDeath,
    xpEarned: gained,
  };

  write({
    xp: current.xp + gained,
    wins: current.wins + (outcome.won ? 1 : 0),
    played: current.played + 1,
    history: [entry, ...current.history].slice(0, historyLimit),
  });

  recordStreakActivity("penaltyShootout", new Date(entry.playedAt));

  return gained;
}

/** Forgets every shootout. Exists so the difficulty ramp can be replayed. */
export function resetShootoutProgress(): void {
  settledSessions.clear();
  write({ xp: 0, wins: 0, played: 0, history: [] });
}
