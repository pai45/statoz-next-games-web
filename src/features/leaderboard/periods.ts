import type { LeaderboardPeriod } from "./types";

const dayMs = 86_400_000;
export type LeaderboardWindow = {
  id: string;
  start: number;
  end: number;
  label: string;
};

export function leaderboardWindow(period: LeaderboardPeriod, now: number): LeaderboardWindow {
  const date = new Date(now);
  const year = date.getUTCFullYear();
  if (period === "season") {
    const quarter = Math.floor(date.getUTCMonth() / 3);
    return {
      id: `season:${year}-Q${quarter + 1}`,
      start: Date.UTC(year, quarter * 3, 1),
      end: Date.UTC(year, quarter * 3 + 3, 1),
      label: `${year} Season ${quarter + 1}`,
    };
  }
  const start = Date.UTC(year, date.getUTCMonth(), date.getUTCDate()) - ((date.getUTCDay() + 6) % 7) * dayMs;
  const monday = new Date(start).toISOString().slice(0, 10);
  return { id: `week:${monday}`, start, end: start + 7 * dayMs, label: `Week of ${new Date(start).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}` };
}

export function previousLeaderboardWindow(period: LeaderboardPeriod, current: LeaderboardWindow): LeaderboardWindow {
  return leaderboardWindow(period, current.start - 1);
}

export function leaderboardCountdown(end: number, now: number): string {
  const minutes = Math.max(0, Math.ceil((end - now) / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor(minutes / 60) % 24;
  return days > 0 ? `${days}d ${hours}h` : `${hours}h ${minutes % 60}m`;
}
