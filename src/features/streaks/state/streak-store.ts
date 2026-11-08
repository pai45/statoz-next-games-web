"use client";

import { useSyncExternalStore } from "react";

import { streakMilestones } from "../data/milestones";
import {
  streakActivities,
  streakCategories,
  type StreakActivity,
  type StreakCategory,
  type StreakCelebration,
  type StreakRecordResult,
  type StreakSnapshot,
} from "../types";

export const streakStorageKey = "statoz.next.games-web.streaks.v1";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedValue: StreakSnapshot | null = null;
let memoryValue: StreakSnapshot | null = null;
let midnightTimer: ReturnType<typeof setTimeout> | null = null;

function emptyDays(): Record<StreakCategory, string[]> {
  return {
    overall: [],
    predict: [],
    pick: [],
    games: [],
    pitchDuel: [],
    penaltyShootout: [],
  };
}

const serverSnapshot: StreakSnapshot = Object.freeze({
  version: 1,
  activeDays: Object.freeze(emptyDays()) as Record<StreakCategory, string[]>,
  activities: Object.freeze({}) as Record<string, StreakActivity[]>,
  claimedMilestones: Object.freeze([]) as unknown as number[],
  announcedMilestones: Object.freeze([]) as unknown as number[],
  celebrationQueue: Object.freeze([]) as unknown as StreakCelebration[],
});

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function localDateFromKey(key: string): Date | null {
  if (!datePattern.test(key)) return null;
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  return localDateKey(date) === key ? date : null;
}

export function addLocalCalendarDays(date: Date, amount: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  next.setDate(next.getDate() + amount);
  return next;
}

function keyDaysAgo(amount: number, now = new Date()): string {
  return localDateKey(addLocalCalendarDays(now, -amount));
}

function addActivity(
  map: Record<string, StreakActivity[]>,
  key: string,
  activity: StreakActivity,
): void {
  map[key] = [...new Set([...(map[key] ?? []), activity])];
}

export function createSeededStreakSnapshot(now = new Date()): StreakSnapshot {
  const activeDays = emptyDays();
  activeDays.overall = [6, 5, 4, 3, 2, 1].map((days) => keyDaysAgo(days, now));
  activeDays.predict = [5, 4, 3, 2, 1].map((days) => keyDaysAgo(days, now));
  activeDays.games = [3, 2, 1].map((days) => keyDaysAgo(days, now));
  activeDays.pitchDuel = [2, 1].map((days) => keyDaysAgo(days, now));
  activeDays.penaltyShootout = [3, 2, 1].map((days) => keyDaysAgo(days, now));
  activeDays.pick = [keyDaysAgo(6, now)];

  const activities: Record<string, StreakActivity[]> = {};
  for (const key of activeDays.predict) addActivity(activities, key, "predict");
  for (const key of activeDays.pick) addActivity(activities, key, "pick");
  for (const key of activeDays.pitchDuel) addActivity(activities, key, "pitchDuel");
  for (const key of activeDays.penaltyShootout)
    addActivity(activities, key, "penaltyShootout");

  return {
    version: 1,
    activeDays,
    activities,
    claimedMilestones: [],
    announcedMilestones: [],
    celebrationQueue: [],
  };
}

function uniqueDateList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string" && localDateFromKey(item) !== null))].sort();
}

function integerList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is number => typeof item === "number" && Number.isInteger(item) && item > 0))].sort((a, b) => a - b);
}

function isActivity(value: unknown): value is StreakActivity {
  return typeof value === "string" && streakActivities.some((item) => item === value);
}

function coerceCelebration(value: unknown): StreakCelebration | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.kind === "daily" && typeof record.id === "string" && typeof record.date === "string" && localDateFromKey(record.date) && typeof record.streak === "number" && isActivity(record.activity)) {
    return { id: record.id, kind: "daily", date: record.date, streak: Math.max(1, Math.floor(record.streak)), activity: record.activity };
  }
  if (record.kind === "milestone" && typeof record.id === "string" && typeof record.days === "number" && streakMilestones.some((item) => item.days === record.days)) {
    return { id: record.id, kind: "milestone", days: record.days };
  }
  return null;
}

export function coerceStreakSnapshot(value: unknown, now = new Date()): StreakSnapshot {
  if (!value || typeof value !== "object") return createSeededStreakSnapshot(now);
  const record = value as Record<string, unknown>;
  const rawDays = record.activeDays && typeof record.activeDays === "object" ? record.activeDays as Record<string, unknown> : {};
  const activeDays = emptyDays();
  for (const category of streakCategories) activeDays[category] = uniqueDateList(rawDays[category]);

  const activities: Record<string, StreakActivity[]> = {};
  if (record.activities && typeof record.activities === "object") {
    for (const [key, entries] of Object.entries(record.activities as Record<string, unknown>)) {
      if (!localDateFromKey(key) || !Array.isArray(entries)) continue;
      const safe = [...new Set(entries.filter(isActivity))];
      if (safe.length) activities[key] = safe;
    }
  }
  const queue = Array.isArray(record.celebrationQueue)
    ? record.celebrationQueue.map(coerceCelebration).filter((item): item is StreakCelebration => item !== null)
    : [];
  return {
    version: 1,
    activeDays,
    activities,
    claimedMilestones: integerList(record.claimedMilestones),
    announcedMilestones: integerList(record.announcedMilestones),
    celebrationQueue: [...new Map(queue.map((item) => [item.id, item])).values()],
  };
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(streakStorageKey);
  } catch {
    return null;
  }
}

function getSnapshot(): StreakSnapshot {
  const raw = readRaw();
  if (raw === cachedRaw && cachedValue) return cachedValue;
  cachedRaw = raw;
  if (raw === null) {
    cachedValue = memoryValue ?? createSeededStreakSnapshot();
    memoryValue = cachedValue;
    try {
      window.localStorage.setItem(streakStorageKey, JSON.stringify(cachedValue));
      cachedRaw = JSON.stringify(cachedValue);
    } catch {
      // The in-memory seed remains usable when storage is blocked.
    }
    return cachedValue;
  }
  try {
    cachedValue = coerceStreakSnapshot(JSON.parse(raw));
  } catch {
    cachedValue = createSeededStreakSnapshot();
  }
  memoryValue = cachedValue;
  return cachedValue;
}

function notify(): void {
  cachedRaw = undefined;
  for (const listener of listeners) listener();
}

function scheduleMidnight(): void {
  if (midnightTimer) clearTimeout(midnightTimer);
  if (!listeners.size) return;
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 50);
  midnightTimer = setTimeout(() => {
    notify();
    scheduleMidnight();
  }, Math.max(50, next.getTime() - now.getTime()));
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === streakStorageKey || event.key === null) notify();
  };
  window.addEventListener("storage", onStorage);
  if (listeners.size === 1) scheduleMidnight();
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
    if (!listeners.size && midnightTimer) {
      clearTimeout(midnightTimer);
      midnightTimer = null;
    }
  };
}

function write(snapshot: StreakSnapshot): StreakSnapshot {
  const safe = coerceStreakSnapshot(snapshot);
  memoryValue = safe;
  try {
    window.localStorage.setItem(streakStorageKey, JSON.stringify(safe));
  } catch {
    // Keep the session value when localStorage is unavailable.
  }
  cachedValue = safe;
  notify();
  return safe;
}

export function readStreakSnapshot(): StreakSnapshot {
  if (typeof window === "undefined") return serverSnapshot;
  return getSnapshot();
}

export function useStreakSnapshot(): StreakSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
}

export function useIsStreakHydrated(): boolean {
  return useSyncExternalStore(() => () => {}, () => true, () => false);
}

export function currentStreak(snapshot: StreakSnapshot, category: StreakCategory, now = new Date()): number {
  const days = new Set(snapshot.activeDays[category]);
  const today = localDateKey(now);
  const yesterday = localDateKey(addLocalCalendarDays(now, -1));
  const anchor = days.has(today) ? today : days.has(yesterday) ? yesterday : null;
  if (!anchor) return 0;
  let count = 0;
  let cursor = localDateFromKey(anchor);
  while (cursor && days.has(localDateKey(cursor))) {
    count += 1;
    cursor = addLocalCalendarDays(cursor, -1);
  }
  return count;
}

export function bestStreak(snapshot: StreakSnapshot, category: StreakCategory): number {
  const days = snapshot.activeDays[category].map(localDateFromKey).filter((date): date is Date => date !== null).sort((a, b) => a.getTime() - b.getTime());
  let best = 0;
  let run = 0;
  let previous: Date | null = null;
  for (const date of days) {
    run = previous && localDateKey(addLocalCalendarDays(previous, 1)) === localDateKey(date) ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  }
  return best;
}

function categoriesFor(activity: StreakActivity): StreakCategory[] {
  if (activity === "pitchDuel") return ["overall", "games", "pitchDuel"];
  if (activity === "penaltyShootout") return ["overall", "games", "penaltyShootout"];
  if (activity === "guessPlayer") return ["overall", "games"];
  return ["overall", activity];
}

export function recordStreakActivity(activity: StreakActivity, date = new Date()): StreakRecordResult {
  const current = readStreakSnapshot();
  if (Number.isNaN(date.getTime())) return { ok: false, reason: "invalid-date", snapshot: current };
  const dateKey = localDateKey(date);
  if (dateKey > localDateKey()) return { ok: false, reason: "future", snapshot: current };
  if ((current.activities[dateKey] ?? []).includes(activity)) return { ok: true, changed: false, snapshot: current };

  const oldOverall = currentStreak(current, "overall");
  const firstOverallToday = !current.activeDays.overall.includes(dateKey);
  const activeDays = { ...current.activeDays };
  for (const category of categoriesFor(activity)) {
    activeDays[category] = [...new Set([...activeDays[category], dateKey])].sort();
  }
  const activities = { ...current.activities, [dateKey]: [...new Set([...(current.activities[dateKey] ?? []), activity])] };
  let announcedMilestones = current.announcedMilestones;
  let celebrationQueue = current.celebrationQueue;
  const draft: StreakSnapshot = { ...current, activeDays, activities, announcedMilestones, celebrationQueue };

  if (firstOverallToday) {
    const nextOverall = currentStreak(draft, "overall");
    celebrationQueue = [...celebrationQueue, { id: `daily:${dateKey}`, kind: "daily", date: dateKey, streak: nextOverall, activity }];
    const crossed = streakMilestones.filter((milestone) => oldOverall < milestone.days && nextOverall >= milestone.days && !announcedMilestones.includes(milestone.days));
    if (crossed.length) {
      announcedMilestones = [...new Set([...announcedMilestones, ...crossed.map((item) => item.days)])].sort((a, b) => a - b);
      celebrationQueue = [...celebrationQueue, ...crossed.map((item): StreakCelebration => ({ id: `milestone:${item.days}`, kind: "milestone", days: item.days }))];
    }
  }

  return { ok: true, changed: true, snapshot: write({ ...draft, announcedMilestones, celebrationQueue }) };
}

export function consumeStreakCelebration(id?: string): StreakSnapshot {
  const current = readStreakSnapshot();
  const target = id ?? current.celebrationQueue[0]?.id;
  if (!target) return current;
  return write({ ...current, celebrationQueue: current.celebrationQueue.filter((item) => item.id !== target) });
}

export function markStreakMilestoneClaimed(days: number): StreakSnapshot | null {
  const current = readStreakSnapshot();
  if (!current.announcedMilestones.includes(days) || current.claimedMilestones.includes(days)) return null;
  return write({
    ...current,
    claimedMilestones: [...current.claimedMilestones, days].sort((a, b) => a - b),
    celebrationQueue: current.celebrationQueue.filter((item) => !(item.kind === "milestone" && item.days === days)),
  });
}

