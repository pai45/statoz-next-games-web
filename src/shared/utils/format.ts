/** Thousands-separated integer, for coins, streaks, and counters. */
export function formatInt(value: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

/** Compact Oz volume: 48200 becomes "48.2K". */
export function formatOzCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  })
    .format(value)
    .toUpperCase();
}

/**
 * Kick-off clock in 24-hour form. Formatted in UTC so the server and the
 * client agree — a locale-dependent render would mismatch on hydration.
 */
export function formatKickoffTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(iso));
}

/** Short kick-off date, for example "26 AUG". */
export function formatKickoffDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
    .format(new Date(iso))
    .toUpperCase();
}
