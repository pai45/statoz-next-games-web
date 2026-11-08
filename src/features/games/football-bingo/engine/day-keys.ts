import { campaignLength } from "../constants";
import type { BingoProgress, BingoStatus } from "../types";

/**
 * Football Bingo's calendar — the day-key helpers from
 * `models/football_bingo.dart`.
 *
 * Days are local, keyed `yyyy-mm-dd`, and counted from the player's own first
 * open rather than from a shared launch date: whoever opens the game on a
 * Tuesday gets grid one on that Tuesday. Two players therefore see the same
 * 200-grid sequence offset to their own day one, not the same grid on the same
 * date.
 *
 * The arithmetic is deliberately the app's, down to the way a day offset is
 * added as an exact 24-hour span rather than a calendar step. That is what
 * `DateTime.add(Duration(days:))` does, it is what `difference().inDays`
 * measures against, and the two stay consistent with each other across a
 * daylight-saving shift precisely because both are ported the same way.
 */

const millisPerDay = 86_400_000;

/** Local midnight on the day a moment falls in. */
export function dateOnly(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** The `yyyy-mm-dd` key for a moment's local day. */
export function dayKeyFor(value: Date): string {
  const day = dateOnly(value);
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
}

/** Local midnight for a key, or null when it is not a day key. */
export function parseDayKey(value: string): Date | null {
  const parts = value.split("-");
  if (parts.length !== 3) return null;
  const year = Number.parseInt(parts[0], 10);
  const month = Number.parseInt(parts[1], 10);
  const day = Number.parseInt(parts[2], 10);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  return new Date(year, month - 1, day);
}

function elapsedDays(from: Date, to: Date): number {
  // `Duration.inDays` truncates; the clamp is the app's, and keeps a day key
  // from before the season opened out of the count.
  const days = Math.trunc((to.getTime() - from.getTime()) / millisPerDay);
  return Math.min(Math.max(days, 0), 100_000);
}

/** How far into the season a day sits. Day one is index zero. */
export function dayIndexFor(firstUnlockDayKey: string, dayKey: string): number {
  const first = parseDayKey(firstUnlockDayKey);
  const day = parseDayKey(dayKey);
  if (first === null || day === null) return 0;
  return elapsedDays(first, day);
}

/** Every day the player has reached, first to today. */
export function unlockedDayKeys(firstUnlockDayKey: string, now: Date): string[] {
  const first = parseDayKey(firstUnlockDayKey);
  if (first === null) return [dayKeyFor(now)];
  const count = elapsedDays(first, dateOnly(now));
  const keys: string[] = [];
  for (let offset = 0; offset <= count; offset += 1) {
    keys.push(dayKeyFor(new Date(first.getTime() + offset * millisPerDay)));
  }
  return keys;
}

/**
 * The two hundred days of the season the player is currently in, unlocked or
 * not. Day 201 rolls into a fresh season over the same authored order.
 */
export function campaignDayKeys(firstUnlockDayKey: string, now: Date): string[] {
  const first = parseDayKey(firstUnlockDayKey) ?? dateOnly(now);
  const index = elapsedDays(first, dateOnly(now));
  const seasonStart = Math.floor(index / campaignLength) * campaignLength;
  const keys: string[] = [];
  for (let offset = 0; offset < campaignLength; offset += 1) {
    keys.push(
      dayKeyFor(new Date(first.getTime() + (seasonStart + offset) * millisPerDay)),
    );
  }
  return keys;
}

/**
 * Whether the day is still playable. A finished grid locks until the local
 * midnight after the day it belongs to.
 */
export function bingoStatus(progress: BingoProgress, now: Date): BingoStatus {
  if (!progress.completed) return { ready: true, remainingMs: 0 };
  const completedDay = dateOnly(new Date(progress.startedAt));
  const unlockAt = new Date(
    completedDay.getFullYear(),
    completedDay.getMonth(),
    completedDay.getDate() + 1,
  );
  const remainingMs = unlockAt.getTime() - now.getTime();
  if (remainingMs <= 0) return { ready: true, remainingMs: 0 };
  return { ready: false, remainingMs };
}

/** `4h 12m`, or `12m` inside the last hour. Rounds a part-minute up. */
export function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.trunc(remainingMs / 1000);
  const totalMinutes = Math.trunc(remainingMs / 60_000) + (totalSeconds % 60 > 0 ? 1 : 0);
  const hours = Math.trunc(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours <= 0 ? `${minutes}m` : `${hours}h ${minutes}m`;
}

/** `mm:ss` for the time spent on the open grid. */
export function formatTimer(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${pad(minutes)}:${pad(seconds)}`;
}
