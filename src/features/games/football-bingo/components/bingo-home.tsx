"use client";

import { DailyDrop } from "@/features/packs";

import { accentVar, Badge, Button, Glyph, withAlpha } from "@statoz/design-system/games";
import { GameLeaderboardCta } from "@/features/games/components/game-leaderboard-cta";

import { bingoStatus, formatCountdown } from "../engine/day-keys";
import type { BingoProgress } from "../types";

import { BingoHeader, enterAfter, Label, TelemetryStrip } from "./bingo-chrome";
import styles from "./football-bingo.module.css";

/**
 * The landing screen — the web port of `football_bingo_home_screen.dart`.
 *
 * Today's grid, what the season has come to, and a way into the archive. The
 * play button is the whole screen's point, so it carries the state: resume a
 * grid in progress, start a fresh one, or count down to the next when today's
 * is already logged.
 *
 * The app lays this over a photographic stadium plate. The web has no such
 * asset, so the arena gradient the rest of the product uses stands in — same
 * job, one fewer megabyte.
 */

export type BingoHomeProps = {
  todayProgress: BingoProgress;
  completedCount: number;
  unlockedCount: number;
  now: Date;
  onPlay: () => void;
  onOpenLogs: () => void;
  /** Leaving Football Bingo altogether. */
  onBack: () => void;
};

export function BingoHome({
  todayProgress,
  completedCount,
  unlockedCount,
  now,
  onPlay,
  onOpenLogs,
  onBack,
}: BingoHomeProps) {
  const orange = accentVar("orange");
  const status = bingoStatus(todayProgress, now);
  const coolingDown = todayProgress.completed && !status.ready;
  const label = coolingDown
    ? `NEXT GRID IN ${formatCountdown(status.remainingMs)}`
    : todayProgress.solvedCellIds.length > 0 && !todayProgress.completed
      ? "RESUME GRID"
      : "PLAY TODAY'S GRID";

  return (
    <div
      className="flex min-h-dvh flex-col"
      style={{ background: "var(--ds-gradient-arena-backdrop)" }}
    >
      <BingoHeader onBack={onBack} backLabel="Back to games" markGlyph="grid_view" />

      {/*
        * The app drops the content a proportional way down its stadium plate:
        * 27% of the space below the header, held between 120 and 238 pixels.
        * The same rule, with the header subtracted from the viewport rather
        * than measured — a short window keeps the lower bound and scrolls, as
        * the app's list does.
        */}
      <div
        className="flex flex-1 flex-col px-4 pb-7"
        style={{ paddingTop: "clamp(120px, calc(27dvh - 18px), 238px)" }}
      >
        <div className="mx-auto flex w-full max-w-107.5 flex-col">
          <div className={styles.enter} style={enterAfter(0)}>
            <TelemetryStrip />
          </div>

          <div
            className={`${styles.enter} mt-3 flex items-center gap-3.5`}
            style={enterAfter(80, 24)}
          >
            <IconBay />
            <div className="min-w-0">
              <h1
                className="truncate font-display font-black leading-compact"
                style={{
                  fontSize: "var(--ds-text-2xl)",
                  letterSpacing: "var(--ds-tracking-display)",
                  textShadow: `0 0 8px ${withAlpha(accentVar("cyan"), 0.3)}`,
                }}
              >
                FOOTBALL BINGO
              </h1>
              <Label className="mt-1.5">3X3 BINGO GAME</Label>
              <span className="mt-2 block">
                <Badge accent={accentVar("lime")} variant="outlined">
                  BINGO ONLINE
                </Badge>
              </span>
            </div>
          </div>

          <div className="mt-4.5 flex gap-3.5">
            <StatTile
              label="COMPLETE"
              value={String(completedCount)}
              delayMs={180}
            />
            <StatTile
              label="UNLOCKED"
              value={String(unlockedCount)}
              delayMs={265}
            />
          </div>

          <div className={`${styles.enter} mt-5`} style={enterAfter(390, 22)}>
            <Button
              accent={orange}
              variant="solid"
              size="lg"
              fullWidth
              glow={!coolingDown}
              disabled={coolingDown}
              leadingIcon={<Glyph name={coolingDown ? "lock" : "play_arrow"} size={20} />}
              onClick={onPlay}
            >
              {label}
            </Button>
            {coolingDown ? (
              <Label className="mt-2 text-center">UNLOCKS AT LOCAL MIDNIGHT</Label>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onOpenLogs}
            className={`${styles.enter} ${styles.plate} mt-3.5 flex h-12.5 w-full cursor-pointer items-center gap-2.5 px-3.5`}
            style={{
              ...enterAfter(470, 22),
              background: withAlpha("var(--ds-color-background-elevated)", 0.92),
              border: `1px solid ${withAlpha("var(--ds-color-border-default)", 0.45)}`,
            }}
          >
            <span style={{ color: orange }}>
              <Glyph name="history" size={18} />
            </span>
            <span
              className="flex-1 text-left font-display font-black leading-compact"
              style={{
                color: orange,
                fontSize: "var(--ds-text-md)",
                letterSpacing: "var(--ds-tracking-ultra)",
              }}
            >
              DAILY LOGS
            </span>
            <span style={{ color: accentVar("cyan") }}>
              <Glyph name="chevron_right" size={22} />
            </span>
          </button>
          <div className="mt-3.5"><GameLeaderboardCta gameId="football-bingo" /></div>
        </div>
      </div>
        <DailyDrop sport="football" />
    </div>
  );
}

/** The bracketed bay the grid mark sits in. */
function IconBay() {
  const orange = accentVar("orange");
  const cyan = accentVar("cyan");
  const corner = `1px solid ${withAlpha(orange, 0.75)}`;

  return (
    <span className="relative grid size-23 shrink-0 place-items-center" aria-hidden>
      <span
        className="absolute left-0 top-0 size-4.5"
        style={{ borderTop: corner, borderLeft: corner }}
      />
      <span
        className="absolute right-0 top-0 size-4.5"
        style={{ borderTop: corner, borderRight: corner }}
      />
      <span
        className="absolute bottom-0 left-0 size-4.5"
        style={{ borderBottom: corner, borderLeft: corner }}
      />
      <span
        className="absolute bottom-0 right-0 size-4.5"
        style={{ borderBottom: corner, borderRight: corner }}
      />
      <span
        className="grid size-16.5 place-items-center rounded-full"
        style={{
          background: withAlpha("var(--ds-color-background-elevated)", 0.95),
          border: `1px solid ${withAlpha(cyan, 0.12)}`,
          boxShadow: `0 0 24px 1px ${withAlpha(cyan, 0.12)}`,
          color: orange,
        }}
      >
        <Glyph name="grid_view" size={28} />
      </span>
    </span>
  );
}

function StatTile({
  label,
  value,
  delayMs,
}: {
  label: string;
  value: string;
  delayMs: number;
}) {
  return (
    <div
      className={`${styles.enter} flex h-12 flex-1 flex-col justify-center px-3.5`}
      style={{
        ...enterAfter(delayMs, 34),
        background: withAlpha("var(--ds-color-background-elevated)", 0.86),
        border: `1px solid ${withAlpha(accentVar("cyan"), 0.45)}`,
      }}
    >
      <p
        className="font-display font-black leading-compact ds-tabular"
        style={{ color: accentVar("orange"), fontSize: "var(--ds-text-lg)" }}
      >
        {value}
      </p>
      <Label className="mt-0.5">{label}</Label>
    </div>
  );
}
