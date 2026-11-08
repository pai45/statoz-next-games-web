"use client";

import { accentVar, Glyph, withAlpha, type GlyphName } from "@statoz/design-system/games";

import { startingLifelines } from "../constants";
import { campaignDayKeys, parseDayKey } from "../engine/day-keys";
import type { BingoArchive, BingoProgress } from "../types";

import { Label } from "./bingo-chrome";
import styles from "./football-bingo.module.css";

/**
 * The archive — the web port of `football_bingo_logs_screen.dart`.
 *
 * Two hundred days of the current season, newest first: what has been cleared,
 * what is still open, and what the calendar has not reached. A past day opens
 * read-only; a future one does not open at all.
 */

export type BingoLogsProps = {
  archive: BingoArchive;
  todayKey: string;
  now: Date;
  onOpenDay: (dayKey: string) => void;
  onBack: () => void;
};

const monthNames = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

function formatDate(dayKey: string): string {
  const date = parseDayKey(dayKey);
  if (date === null) return dayKey;
  return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function BingoLogs({
  archive,
  todayKey,
  now,
  onOpenDay,
  onBack,
}: BingoLogsProps) {
  const days = campaignDayKeys(archive.firstUnlockDayKey, now).slice().reverse();
  const completed = days.filter(
    (dayKey) => archive.progressByDay[dayKey]?.completed === true,
  ).length;
  const totalSolved = days.reduce(
    (sum, dayKey) => sum + (archive.progressByDay[dayKey]?.solvedCellIds.length ?? 0),
    0,
  );
  const clearRate = days.length === 0 ? 0 : Math.round((completed / days.length) * 100);
  const open = days.length - completed;

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Capped so the season does not run the full width of a large monitor,
          where a row of five near-empty tiles reads as a gap rather than a grid. */}
      <div className="mx-auto flex w-full max-w-320 flex-1 flex-col">
        <header className="flex items-center gap-2.5 px-4.5 pt-3.5">
          <span
            className="block h-5.5 w-[3px] shrink-0"
            style={{ background: accentVar("orange") }}
          />
          <h1
            className="flex-1 font-display font-black leading-compact"
            style={{
              fontSize: "var(--ds-text-lg)",
              letterSpacing: "var(--ds-tracking-ultra)",
            }}
          >
            BINGO LOGS
          </h1>
          <button
            type="button"
            onClick={onBack}
            aria-label="Close the archive"
            className={`${styles.link} grid size-11 shrink-0 cursor-pointer place-items-center`}
            style={{ color: accentVar("cyan") }}
          >
            <Glyph name="close" size={22} />
          </button>
        </header>

        <div className="flex items-end gap-2 px-4 pt-3.5">
          <StatBox label="DONE" value={String(completed)} accent={accentVar("lime")} />
          <StatBox label="OPEN" value={String(open)} accent={accentVar("cyan")} />
          <StatBox label="CELLS" value={String(totalSolved)} accent={accentVar("orange")} />
          <span className="flex-1" />
          <div className="text-right">
            <p
              className="font-display font-black leading-compact ds-tabular"
              style={{
                color: completed > 0 ? accentVar("lime") : "var(--ds-color-text-muted)",
                fontSize: "var(--ds-text-2xl)",
              }}
            >
              {clearRate}%
            </p>
            <Label tracking="var(--ds-tracking-mega)">CLEAR RATE</Label>
          </div>
        </div>

        {/* Cleared against outstanding, as one bar. */}
        <div className="flex h-1 gap-0 px-4 pb-3.5 pt-2.5">
          <span
            className="block h-1"
            style={{ background: accentVar("lime"), flexGrow: completed }}
          />
          <span
            className="block h-1"
            style={{ background: accentVar("cyan"), flexGrow: open }}
          />
        </div>

        <ul className="grid grid-cols-2 gap-3 px-4 pb-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {days.map((dayKey) => (
            <li key={dayKey}>
              <LogTile
                dayKey={dayKey}
                progress={archive.progressByDay[dayKey]}
                locked={dayKey > todayKey}
                onOpen={() => onOpenDay(dayKey)}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      className="grid h-10.5 w-13 place-items-center"
      style={{
        background: "var(--ds-color-background-secondary)",
        border: `1px solid ${withAlpha(accent, 0.45)}`,
      }}
    >
      <p
        className="font-display font-black leading-compact ds-tabular"
        style={{ color: accent, fontSize: "var(--ds-text-md)" }}
      >
        {value}
      </p>
      <Label tracking="var(--ds-tracking-mega)">{label}</Label>
    </div>
  );
}

function LogTile({
  dayKey,
  progress,
  locked,
  onOpen,
}: {
  dayKey: string;
  progress: BingoProgress | undefined;
  locked: boolean;
  onOpen: () => void;
}) {
  const done = progress?.completed === true;
  const accent = locked
    ? "var(--ds-color-text-muted)"
    : done
      ? accentVar("lime")
      : accentVar("cyan");
  const glyph: GlyphName = locked ? "lock" : done ? "verified" : "grid_view";
  const status = locked ? "LOCKED" : done ? "DONE" : "OPEN";
  const note = locked
    ? "UNLOCKS ON THIS DAY"
    : done
      ? "COMPLETED"
      : `${progress?.lifelines ?? startingLifelines} LIVES LEFT`;
  const action = locked ? "LOCKED" : done ? "CHECK ANSWER" : "PLAY GRID";

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={locked}
      aria-label={`${formatDate(dayKey)} — ${status}`}
      className={`${styles.plate} flex aspect-[1.15] w-full flex-col ${
        locked ? "cursor-not-allowed" : "cursor-pointer"
      }`}
      style={{
        border: `1px solid ${withAlpha(accent, 0.55)}`,
        background: `color-mix(in srgb, ${accent} 4.5%, var(--ds-color-background-secondary))`,
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col p-3 text-left">
        <div className="flex items-center">
          <span style={{ color: accent }}>
            <Glyph name={glyph} size={18} />
          </span>
          <span className="flex-1" />
          <Label color={accent}>{status}</Label>
        </div>
        <p
          className="mt-2.5 font-display font-black leading-tight"
          style={{ fontSize: "var(--ds-text-md)" }}
        >
          {formatDate(dayKey)}
        </p>
        <span className="flex-1" />
        <Label tracking="var(--ds-tracking-tight)">{note}</Label>
      </div>
      <div
        className="grid h-8 shrink-0 place-items-center px-1.5"
        style={{ background: "var(--ds-color-overlay-scrim)" }}
      >
        <Label color={accent} tracking="var(--ds-tracking-tight)">
          {action}
        </Label>
      </div>
    </button>
  );
}
