"use client";

import { useEffect, useSyncExternalStore } from "react";

import {
  progressTracks,
  totalTrackXp,
  type ProgressTrack,
  type TrackXp,
  type XpLedgerEntry,
  type XpTransactionSource,
} from "@/domain/progression";
import { xpHistoryEventTemplates } from "@/mocks/profile";

const storageKey = "statoz.next.games-web.xp-ledger.v1";

type StoredXpLedger = {
  version: 1;
  balances: TrackXp;
  entries: XpLedgerEntry[];
};

const emptyLedger: StoredXpLedger = Object.freeze({
  version: 1,
  balances: Object.freeze({}) as TrackXp,
  entries: Object.freeze([]) as unknown as XpLedgerEntry[],
});

let cachedRaw: string | null = null;
let cachedValue: StoredXpLedger = emptyLedger;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function nonNegativeInteger(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
}

function coerceBalances(value: unknown): TrackXp {
  if (typeof value !== "object" || value === null) return {};
  const record = value as Record<string, unknown>;
  const balances: TrackXp = {};
  for (const track of progressTracks) {
    const xp = nonNegativeInteger(record[track]);
    if (xp > 0) balances[track] = xp;
  }
  return balances;
}

function isTrack(value: unknown): value is ProgressTrack {
  return typeof value === "string" &&
    progressTracks.some((track) => track === value);
}

const sources: XpTransactionSource[] = [
  "openingBalance",
  "match",
  "shootout",
  "prediction",
  "pack",
  "dailyDrop",
  "streakReward",
  "cardUnlock",
  "quiz",
  "footballChess",
  "grandPrix",
  "superOver",
  "basketball",
  "tennis",
  "finalOver",
  "guessPlayer",
  "bingo",
];

function isSource(value: unknown): value is XpTransactionSource {
  return typeof value === "string" &&
    sources.some((source) => source === value);
}

function coerceEntries(value: unknown): XpLedgerEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const row = item as Partial<XpLedgerEntry>;
    if (
      typeof row.id !== "string" ||
      typeof row.timestamp !== "string" ||
      !Number.isFinite(Date.parse(row.timestamp)) ||
      typeof row.delta !== "number" ||
      typeof row.balanceAfter !== "number" ||
      !isTrack(row.track) ||
      typeof row.title !== "string" ||
      !isSource(row.source) ||
      (row.type !== "earn" &&
        row.type !== "loss" &&
        row.type !== "openingBalance")
    ) {
      return [];
    }
    return [row as XpLedgerEntry];
  });
}

function coerce(value: unknown): StoredXpLedger {
  if (typeof value !== "object" || value === null) return emptyLedger;
  const record = value as Record<string, unknown>;
  return {
    version: 1,
    balances: coerceBalances(record.balances),
    entries: coerceEntries(record.entries),
  };
}

function getSnapshot(): StoredXpLedger {
  const raw = readRaw();
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  if (raw === null) {
    cachedValue = emptyLedger;
    return cachedValue;
  }
  try {
    cachedValue = coerce(JSON.parse(raw));
  } catch {
    cachedValue = emptyLedger;
  }
  return cachedValue;
}

function getServerSnapshot(): StoredXpLedger {
  return emptyLedger;
}

const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function write(next: StoredXpLedger): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // The in-memory snapshot still lets this visit show the imported ledger.
  }
  cachedRaw = null;
  for (const listener of listeners) listener();
}

/**
 * Bridges the web's cumulative per-mode stores to the app's transaction ledger.
 * Existing totals enter as opening balances; later deltas become earned/lost
 * rows. XP calculation remains wholly owned by each game.
 */
function syncLedger(xpByTrack: TrackXp): void {
  const current = getSnapshot();
  const changedTracks = progressTracks.filter(
    (track) => (current.balances[track] ?? 0) !== (xpByTrack[track] ?? 0),
  );
  if (changedTracks.length === 0) return;

  const firstImport = current.entries.length === 0 &&
    totalTrackXp(current.balances) === 0;
  let runningBalance = totalTrackXp(current.balances);
  const now = Date.now();
  const additions: XpLedgerEntry[] = [];

  changedTracks.forEach((track, index) => {
    const before = current.balances[track] ?? 0;
    const after = xpByTrack[track] ?? 0;
    const delta = after - before;
    if (delta === 0) return;
    runningBalance = Math.max(0, runningBalance + delta);
    const template = xpHistoryEventTemplates[track];
    const timestamp = new Date(now + index).toISOString();
    additions.push({
      id: `xp-${now + index}-${track}`,
      timestamp,
      delta,
      balanceAfter: runningBalance,
      type: firstImport ? "openingBalance" : delta > 0 ? "earn" : "loss",
      source: template.source,
      track,
      title: firstImport ? template.title : template.title.replace("PROGRESS", "XP"),
      details: firstImport ? template.details : template.details.replace("Imported ", ""),
    });
  });

  write({
    version: 1,
    balances: { ...xpByTrack },
    entries: [...additions.reverse(), ...current.entries].slice(0, 250),
  });
}

export function useXpLedger(xpByTrack: TrackXp): XpLedgerEntry[] {
  const ledger = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const fingerprint = progressTracks
    .map((track) => `${track}:${xpByTrack[track] ?? 0}`)
    .join("|");

  useEffect(() => {
    syncLedger(xpByTrack);
    // The fingerprint is the stable semantic dependency; callers build a new
    // projection object whenever one of the underlying stores moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint]);

  return ledger.entries;
}
