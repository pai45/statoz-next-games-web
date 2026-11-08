"use client";

import type { Sport } from "@/domain/sports";
import { DailyDrop } from "@/features/packs";

import { accentVar, Button, Glyph, withAlpha } from "@statoz/design-system/games";
import { GameLeaderboardCta } from "@/features/games/components/game-leaderboard-cta";
import type { GameId } from "@/features/games/types";

import {
  averageAttempts,
  completedCount,
  solvedCount,
  solveStreak,
  winRate,
} from "../engine/archive";
import { formatResetCountdown } from "../engine/day-keys";
import type { GuessPlayerArchive, GuessPlayerDayRecord } from "../types";

import {
  Chip,
  enterAfter,
  GuessHeader,
  HeaderMark,
  Label,
  Panel,
} from "./guess-chrome";
import styles from "./guess-player.module.css";

/**
 * The landing screen — the web port of `guess_player_home_screen.dart`.
 *
 * Today's mystery, what the archive has come to, and a way into it. The one
 * button carries the state: play a day not yet opened, resume one part-way
 * through, or review one already settled.
 *
 * The app lays this over a photographic stadium plate. The web has no such
 * asset, so the arena gradient the rest of the product uses stands in.
 */

export type GuessHomeProps = {
  archive: GuessPlayerArchive;
  todayRecord: GuessPlayerDayRecord | undefined;
  currentDayKey: string;
  now: Date;
  onOpenToday: () => void;
  onOpenLogs: () => void;
  /** Leaving the game altogether. */
  onBack: () => void;
  /** What the mode is called for this sport, e.g. `DAILY FOOTBALL MYSTERY`. */
  sportLabel: string;
  sport: Sport;
};

export function GuessHome({
  archive,
  todayRecord,
  currentDayKey,
  now,
  onOpenToday,
  onOpenLogs,
  onBack,
  sportLabel,
  sport,
}: GuessHomeProps) {
  const pink = accentVar("pink");
  const streak = solveStreak(archive, currentDayKey);
  const rate = Math.round(winRate(archive) * 100);
  const average = averageAttempts(archive);
  const leaderboardMode: GameId = sport === "football" ? "guess-player" : sport === "cricket" ? "cricket-guess-player" : sport === "basketball" ? "basketball-guess-player" : sport === "motorsport" ? "guess-driver" : "tennis-guess-winner";

  const ctaLabel =
    todayRecord?.status !== "inProgress"
      ? "REVIEW"
      : todayRecord.startedAtEpochMs > 0
        ? "RESUME"
        : "PLAY";

  return (
    <div
      className="flex min-h-dvh flex-col"
      style={{ background: "var(--ds-gradient-arena-backdrop)" }}
    >
      <GuessHeader
        eyebrow="DAILY CAREER INTEL"
        title="GUESS THE PLAYER"
        onBack={onBack}
        backLabel="Back to games"
        right={<HeaderMark />}
      />

      <div className="flex flex-1 flex-col overflow-y-auto px-4 pb-7 pt-5">
        <div className="mx-auto flex w-full max-w-107.5 flex-col">
          <div className={styles.enter} style={enterAfter(0)}>
            <HeroPanel dayKey={currentDayKey} now={now} sportLabel={sportLabel} />
          </div>

          <div
            className={`${styles.enter} mt-5 flex gap-2`}
            style={enterAfter(100, 24)}
          >
            <StatTile
              label="SOLVE STREAK"
              value={String(streak)}
              accent={streak > 0 ? "var(--ds-color-success)" : "var(--ds-color-text-muted)"}
            />
            <StatTile label="WIN RATE" value={`${rate}%`} accent={accentVar("cyan")} />
            <StatTile
              label="AVG TRIES"
              value={average === 0 ? "—" : average.toFixed(1)}
              accent={accentVar("gold")}
            />
          </div>

          <div
            className={`${styles.enter} mt-3 flex items-center gap-2 px-3 py-2.5`}
            style={{
              ...enterAfter(170, 22),
              background: withAlpha("var(--ds-color-background-secondary)", 0.88),
              border: "1px solid var(--ds-color-border-subtle)",
            }}
          >
            <span className="text-muted">
              <Glyph name="collections_bookmark" size={15} />
            </span>
            <Label>CAREER ARCHIVE</Label>
            <span className="flex-1" />
            <p
              className="font-display font-black leading-compact ds-tabular"
              style={{ color: accentVar("cyan"), fontSize: "var(--ds-text-2xs)" }}
            >
              {solvedCount(archive)} SOLVED &nbsp;//&nbsp; {completedCount(archive)} PLAYED
            </p>
          </div>

          <div className={`${styles.enter} mt-5`} style={enterAfter(240, 22)}>
            <Button
              accent={pink}
              variant="solid"
              size="lg"
              fullWidth
              glow
              leadingIcon={<Glyph name="radar" size={20} />}
              onClick={onOpenToday}
            >
              {ctaLabel}
            </Button>
          </div>

          <button
            type="button"
            onClick={onOpenLogs}
            aria-label="Open 30 day mystery archive"
            className={`${styles.enter} ${styles.plate} mt-3 flex h-12 w-full cursor-pointer items-center gap-2.5 px-3.5`}
            style={{
              ...enterAfter(320, 22),
              background: withAlpha("var(--ds-color-background-secondary)", 0.92),
              border: "1px solid var(--ds-color-border-subtle)",
            }}
          >
            <span style={{ color: pink }}>
              <Glyph name="history" size={18} />
            </span>
            <span
              className="flex-1 text-left font-display font-black leading-compact"
              style={{
                color: pink,
                fontSize: "var(--ds-text-md)",
                letterSpacing: "var(--ds-tracking-ultra)",
              }}
            >
              OPEN 30-DAY INTEL ARCHIVE
            </span>
            <span style={{ color: accentVar("cyan") }}>
              <Glyph name="chevron_right" size={22} />
            </span>
          </button>
          <div className="mt-3.5"><GameLeaderboardCta gameId={leaderboardMode} /></div>
        </div>
      </div>
        <DailyDrop sport={sport} />
    </div>
  );
}

function HeroPanel({
  dayKey,
  now,
  sportLabel,
}: {
  dayKey: string;
  now: Date;
  sportLabel: string;
}) {
  const pink = accentVar("pink");
  const corner = `1px solid ${withAlpha(pink, 0.75)}`;

  return (
    <div
      className="relative p-4"
      style={{ background: withAlpha("var(--ds-color-background-secondary)", 0.88) }}
    >
      {/* `HudCornerFrame`: four brackets rather than a full edge. */}
      <span className="absolute left-0 top-0 size-4" style={{ borderTop: corner, borderLeft: corner }} />
      <span className="absolute right-0 top-0 size-4" style={{ borderTop: corner, borderRight: corner }} />
      <span className="absolute bottom-0 left-0 size-4" style={{ borderBottom: corner, borderLeft: corner }} />
      <span className="absolute bottom-0 right-0 size-4" style={{ borderBottom: corner, borderRight: corner }} />

      <div className="flex items-start gap-3.5">
        <span
          className="grid size-16 shrink-0 place-items-center"
          style={{
            background: "var(--ds-color-background-elevated)",
            border: `1px solid ${withAlpha(pink, 0.55)}`,
            color: pink,
          }}
        >
          <Glyph name="person_search" size={34} />
        </span>

        <div className="min-w-0 flex-1">
          <h2
            className="font-display font-black leading-compact"
            style={{
              fontSize: "var(--ds-text-xl)",
              letterSpacing: "var(--ds-tracking-display)",
            }}
          >
            CLASSIFIED PLAYER
          </h2>
          <p
            className="mt-1.5 leading-body text-muted"
            style={{ fontSize: "var(--ds-text-xs)" }}
          >
            Decode six career signals. Earlier solves earn more XP.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <Chip accent={accentVar("cyan")}>{dayKey}</Chip>
            <Chip accent={pink}>RESET {formatResetCountdown(now)}</Chip>
            <Chip accent="var(--ds-color-text-muted)">{sportLabel}</Chip>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <Panel className="flex-1 px-2.5 py-3 text-center">
      <p
        className="truncate font-display font-black leading-compact ds-tabular"
        style={{ color: accent, fontSize: "var(--ds-text-lg)" }}
      >
        {value}
      </p>
      <Label className="mt-1 truncate" tracking="var(--ds-tracking-mega)">
        {label}
      </Label>
    </Panel>
  );
}
