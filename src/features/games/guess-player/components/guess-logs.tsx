"use client";

import { accentVar, Glyph, Progress, withAlpha, type GlyphName } from "@statoz/design-system/games";

import {
  effectiveWon,
  solvedCount,
  tileOpens,
  tileStatusFor,
  type ArchiveTileStatus,
} from "../engine/archive";
import { archiveDayKeys, formatDayLabel } from "../engine/day-keys";
import type { GuessPlayerArchive, GuessPlayerDayRecord } from "../types";

import { GuessHeader, HeaderMark, Label, Panel } from "./guess-chrome";
import styles from "./guess-player.module.css";

/**
 * The archive — the web port of `guess_player_logs_screen.dart`.
 *
 * Thirty days back, newest first. The summary counts only days that actually
 * finished, which is why an expired day shows as no signal and leaves the win
 * rate alone.
 */

export type GuessLogsProps = {
  archive: GuessPlayerArchive;
  currentDayKey: string;
  now: Date;
  onOpenDay: (dayKey: string) => void;
  onBack: () => void;
};

export function GuessLogs({
  archive,
  currentDayKey,
  now,
  onOpenDay,
  onBack,
}: GuessLogsProps) {
  const days = archiveDayKeys(currentDayKey, now);
  const records = days
    .map((dayKey) => archive.resultsByDay[dayKey])
    .filter(
      (record): record is GuessPlayerDayRecord =>
        record !== undefined &&
        record.status !== "inProgress" &&
        record.status !== "expired",
    );
  const solved = records.filter(effectiveWon).length;
  const rate = records.length === 0 ? 0 : solved / records.length;

  return (
    <div className="flex min-h-dvh flex-col">
      <GuessHeader
        eyebrow="30-DAY INTEL ARCHIVE"
        title={`${solvedCount(archive)} ALL-TIME SOLVES`}
        onBack={onBack}
        backLabel="Back to mystery home"
        right={<HeaderMark name="collections_bookmark" />}
      />

      {/* Capped so thirty tiles do not stretch to five near-empty columns on a
          large monitor, where the row reads as a gap rather than a grid. */}
      <div className="mx-auto flex w-full max-w-300 flex-1 flex-col">
        <div className="px-4 pb-3 pt-4">
          <Panel accent={withAlpha(accentVar("pink"), 0.55)} className="mx-auto max-w-150">
            <div className="flex">
              <Metric label="SOLVED" value={String(solved)} accent="var(--ds-color-success)" />
              <Divider />
              <Metric label="PLAYED" value={String(records.length)} accent={accentVar("cyan")} />
              <Divider />
              <Metric
                label="WIN RATE"
                value={`${Math.round(rate * 100)}%`}
                accent={accentVar("gold")}
              />
            </div>
            <Progress
              className="mt-2.5"
              value={rate}
              height={7}
              accent={rate > 0 ? "var(--ds-color-success)" : "var(--ds-color-text-muted)"}
              label={`Win rate ${Math.round(rate * 100)} percent`}
            />
          </Panel>
        </div>

        <ul className="grid grid-cols-2 gap-2.5 px-4 pb-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {days.map((dayKey) => (
            <li key={dayKey}>
              <ArchiveTile
                dayKey={dayKey}
                isToday={dayKey === currentDayKey}
                record={archive.resultsByDay[dayKey]}
                onOpen={() => onOpenDay(dayKey)}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="flex-1 text-center">
      <p
        className="font-display font-black leading-compact ds-tabular"
        style={{ color: accent, fontSize: "var(--ds-text-lg)" }}
      >
        {value}
      </p>
      <Label className="mt-1" tracking="var(--ds-tracking-mega)">
        {label}
      </Label>
    </div>
  );
}

function Divider() {
  return (
    <span
      className="block w-px self-center"
      style={{ height: 32, background: "var(--ds-color-border-subtle)" }}
    />
  );
}

const tileAccents: Record<ArchiveTileStatus, string> = {
  solved: "var(--ds-color-success)",
  failed: "var(--ds-color-danger)",
  live: "var(--ds-color-accent-pink)",
  missed: "var(--ds-color-text-muted)",
};

const tileGlyphs: Record<ArchiveTileStatus, GlyphName> = {
  solved: "verified",
  failed: "dangerous",
  live: "radar",
  missed: "lock",
};

function tileLabel(status: ArchiveTileStatus, isToday: boolean): string {
  switch (status) {
    case "solved":
      return "SOLVED";
    case "failed":
      return "MISSED";
    case "live":
      return isToday ? "TODAY · LIVE" : "IN PROGRESS";
    case "missed":
      return "NO SIGNAL";
  }
}

function tileDetail(
  record: GuessPlayerDayRecord | undefined,
  status: ArchiveTileStatus,
): string {
  if (record === undefined || status === "missed") return "PAST DAYS LOCKED";
  if (record.legacy) return "LEGACY LOG";
  if (status === "live") {
    return record.startedAtEpochMs === 0
      ? "PLAY MYSTERY"
      : `${record.attemptsRemaining} TRIES LEFT`;
  }
  return `${record.score} PTS · +${record.xpEarned} XP`;
}

function ArchiveTile({
  dayKey,
  isToday,
  record,
  onOpen,
}: {
  dayKey: string;
  isToday: boolean;
  record: GuessPlayerDayRecord | undefined;
  onOpen: () => void;
}) {
  const status = tileStatusFor(record, isToday);
  const opens = tileOpens(record, isToday);
  const accent = tileAccents[status];
  const label = tileLabel(status, isToday);

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!opens}
      aria-label={`${formatDayLabel(dayKey)}, ${label}`}
      className={`${styles.plate} flex aspect-[1.28] w-full flex-col ${
        opens ? "cursor-pointer" : "cursor-not-allowed"
      }`}
      style={{
        border: `1px solid ${
          isToday ? withAlpha(accentVar("pink"), 0.65) : "var(--ds-color-border-default)"
        }`,
      }}
    >
      <div
        className="flex min-h-0 flex-1 flex-col p-2.5 text-left"
        style={{
          background: `color-mix(in srgb, ${accent} ${
            status === "missed" ? "2%" : "7%"
          }, var(--ds-color-background-secondary))`,
        }}
      >
        <div className="flex items-center">
          <span style={{ color: accent }}>
            <Glyph name={tileGlyphs[status]} size={18} />
          </span>
          <span className="flex-1" />
          {isToday ? (
            <Label color={accentVar("pink")} tracking="var(--ds-tracking-mega)">
              TODAY
            </Label>
          ) : null}
        </div>
        <p
          className="mt-2 font-display font-black leading-tight"
          style={{ fontSize: "var(--ds-text-sm)" }}
        >
          {formatDayLabel(dayKey)}
        </p>
        <span className="flex-1" />
        <Label color={accent} tracking="var(--ds-tracking-mega)">
          {label}
        </Label>
      </div>
      <div
        className="flex min-h-7.5 shrink-0 items-center gap-1 px-2.5 py-1.5"
        style={{ background: "var(--ds-color-background-muted)" }}
      >
        <Label className="min-w-0 flex-1 truncate text-left" tracking="var(--ds-tracking-mega)">
          {tileDetail(record, status)}
        </Label>
        {opens ? (
          <span className="shrink-0" style={{ color: accent }}>
            <Glyph name="chevron_right" size={15} />
          </span>
        ) : null}
      </div>
    </button>
  );
}
