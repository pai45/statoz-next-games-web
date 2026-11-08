import { archiveWindowDays } from "../constants";

/**
 * Guess The Player's calendar — `guessPlayerDayKey` and the archive window.
 *
 * Days are the player's own local days: the puzzle turns over at their
 * midnight, and the key is `yyyy-mm-dd` in local time. The step back through
 * the archive is an exact twenty-four-hour span rather than a calendar step,
 * because that is what `DateTime.subtract(Duration(days:))` does, and the
 * streak walk is measured the same way.
 */

const millisPerDay = 86_400_000;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** The `yyyy-mm-dd` key for a moment's local day. */
export function dayKeyFor(value: Date): string {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

/**
 * Local midnight for a key, or null when it is not a day key.
 *
 * Deliberately not `new Date(key)`, which reads a bare `yyyy-mm-dd` as UTC and
 * would land on the previous day for anyone west of Greenwich.
 */
export function parseDayKey(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  return date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

/** A day key shifted by whole days, the way the app shifts it. */
export function shiftDayKey(dayKey: string, days: number): string {
  const date = parseDayKey(dayKey);
  if (date === null) return dayKey;
  return dayKeyFor(new Date(date.getTime() + days * millisPerDay));
}

/** Today first, then back through the window. */
export function archiveDayKeys(
  currentDayKey: string,
  now: Date,
  days: number = archiveWindowDays,
): string[] {
  const start = parseDayKey(currentDayKey) ?? now;
  const keys: string[] = [];
  for (let index = 0; index < days; index += 1) {
    keys.push(dayKeyFor(new Date(start.getTime() - index * millisPerDay)));
  }
  return keys;
}

/** `hh:mm:ss` until the next local midnight, as the landing page counts down. */
export function formatResetCountdown(now: Date): string {
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );
  const remaining = Math.max(0, tomorrow.getTime() - now.getTime());
  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const seconds = totalSeconds % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

const monthNames = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

/** `AUG 31`, for an archive tile. */
export function formatDayLabel(dayKey: string): string {
  const date = parseDayKey(dayKey);
  if (date === null) return dayKey;
  return `${monthNames[date.getMonth()]} ${date.getDate()}`;
}

/** `AUG 31, 2026`, where the tile has room for the year. */
export function formatDayLabelWithYear(dayKey: string): string {
  const date = parseDayKey(dayKey);
  if (date === null) return dayKey;
  return `${formatDayLabel(dayKey)}, ${date.getFullYear()}`;
}
