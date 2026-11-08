"use client";

import { useState } from "react";

import type { PlayerCard } from "@/domain/cards";
import { levelProgress } from "@/domain/progression";
import { accentVar, Button, Glyph, Progress, withAlpha } from "@statoz/design-system/games";
import { RevealCardFace } from "@/features/packs";
import { useCountUp } from "@/shared/hooks";

import { noticeMs } from "../constants";
import { effectiveWon, solveStreak } from "../engine/archive";
import type {
  GuessPlayerArchive,
  GuessPlayerDayRecord,
  GuessPlayerPuzzle,
} from "../types";

import {
  Chip,
  enterAfter,
  GuessHeader,
  Label,
  Panel,
} from "./guess-chrome";
import styles from "./guess-player.module.css";

/**
 * The debrief — the web port of `guess_player_result_view.dart`.
 *
 * Who it was, how it went, and the whole career route in the open. Reached both
 * the moment a run ends and any time an archived day is opened again, which is
 * why the count-ups are gated on the settlement rather than on the mount: a day
 * reopened is a record, not a result.
 *
 * The app runs its level bar against the profile's global XP. Here it runs
 * against the mode's own track, which is how every other mode on the web reports
 * a result, and it is the number this game actually moved.
 */

export type GuessResultProps = {
  record: GuessPlayerDayRecord;
  puzzle: GuessPlayerPuzzle;
  target: PlayerCard | null;
  players: PlayerCard[];
  archive: GuessPlayerArchive;
  currentDayKey: string;
  /** Track XP after this day was banked. */
  trackXp: number;
  /** True only the first time a finished day is opened. */
  fresh: boolean;
  onBack: () => void;
};

const titles: Record<GuessPlayerDayRecord["status"], string> = {
  won: "IDENTITY CONFIRMED",
  gaveUp: "PLAYER DECLASSIFIED",
  lost: "SIGNAL LOST",
  legacy: "ARCHIVED RESULT",
  expired: "INTEL EXPIRED",
  inProgress: "SCAN IN PROGRESS",
};

export function GuessResult({
  record,
  puzzle,
  target,
  players,
  archive,
  currentDayKey,
  trackXp,
  fresh,
  onBack,
}: GuessResultProps) {
  const won = effectiveWon(record);
  const accent = won ? "var(--ds-color-success)" : "var(--ds-color-danger)";
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const text = buildShareText(record, puzzle);
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: "StatOz · Guess the Player", text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), noticeMs);
    } catch {
      // The viewer dismissed the sheet, or the clipboard is unavailable.
    }
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <GuessHeader
        eyebrow="INTEL DEBRIEF"
        title={record.dayKey}
        onBack={onBack}
        backLabel="Back to mystery home"
        right={<Chip accent="var(--ds-color-text-muted)">REVIEW</Chip>}
      />

      <div className="flex-1 overflow-y-auto px-4 pb-7 pt-5">
        <div className="mx-auto flex w-full max-w-107.5 flex-col lg:max-w-230">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
            <div className="flex flex-col lg:w-107.5 lg:shrink-0">
              <div className={styles.enter} style={enterAfter(0)}>
                <Panel accent={withAlpha(accent, 0.6)} className="p-4.5 text-center">
                  <span className="inline-block" style={{ color: accent }}>
                    <Glyph name={won ? "verified" : "dangerous"} size={42} />
                  </span>
                  <h2
                    className="mt-2.5 font-display font-black leading-compact"
                    style={{
                      color: accent,
                      fontSize: "var(--ds-text-xl)",
                      letterSpacing: "var(--ds-tracking-display)",
                    }}
                  >
                    {titles[record.status]}
                  </h2>
                  <p
                    className="mt-2 leading-body text-muted"
                    style={{ fontSize: "var(--ds-text-xs)" }}
                  >
                    {won
                      ? "Career signature decoded."
                      : record.status === "gaveUp"
                        ? "The remaining intel has been unlocked."
                        : "No attempts remain. Study the debrief and return tomorrow."}
                  </p>
                </Panel>
              </div>

              {target === null ? (
                <Panel className="mt-4 text-center">
                  <Label>THIS ARCHIVED PLAYER COULD NOT BE RECONSTRUCTED</Label>
                </Panel>
              ) : (
                <div
                  className={`${styles.enter} mt-4 flex flex-col items-center`}
                  style={enterAfter(100, 24)}
                >
                  <RevealCardFace item={{ kind: "player", card: target }} size="md" />
                  <p
                    className="mt-3 text-center font-display font-black leading-compact"
                    style={{
                      fontSize: "var(--ds-text-lg)",
                      letterSpacing: "var(--ds-tracking-display)",
                    }}
                  >
                    {target.name.toUpperCase()}
                  </p>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <Metric
                  label="SCORE"
                  value={record.score}
                  animate={fresh}
                  accent={accentVar("gold")}
                />
                <Metric
                  label="TRIES"
                  text={`${Math.min(6, record.guessedPlayerIds.length)}/6`}
                  accent={accentVar("cyan")}
                />
                <Metric
                  label="REWARD"
                  value={record.xpEarned}
                  prefix="+"
                  suffix=" XP"
                  animate={fresh}
                  accent={
                    record.xpEarned > 0
                      ? "var(--ds-color-success)"
                      : "var(--ds-color-text-muted)"
                  }
                />
              </div>

              {record.xpEarned > 0 ? (
                <div className="mt-3.5">
                  <XpPanel trackXp={trackXp} earned={record.xpEarned} animate={fresh} />
                </div>
              ) : null}

              <div
                className={`${styles.enter} mt-3 flex items-center gap-2.5 px-3 py-2.5`}
                style={{
                  ...enterAfter(250, 20),
                  background: withAlpha("var(--ds-color-background-secondary)", 0.88),
                  border: `1px solid ${withAlpha(accentVar("orange"), 0.55)}`,
                }}
              >
                <span style={{ color: accentVar("orange") }}>
                  <Glyph name="local_fire_department" size={18} />
                </span>
                <Label color={accentVar("orange")} tracking="var(--ds-tracking-mega)">
                  {won
                    ? `SOLVE STREAK · ${solveStreak(archive, currentDayKey)} ${
                        solveStreak(archive, currentDayKey) === 1 ? "DAY" : "DAYS"
                      }`
                    : "DAILY GAME STREAK · ACTIVITY RECORDED"}
                </Label>
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-3.5">
              {record.legacy ? (
                <Panel accent="var(--ds-color-border-muted)" className="text-center">
                  <Label>
                    LEGACY LOG · DETAILED GUESSES AND SCORE WERE NOT STORED IN V1.
                  </Label>
                </Panel>
              ) : (
                <ClueDebrief puzzle={puzzle} />
              )}

              {record.guessedPlayerIds.length > 0 ? (
                <ScanHistory
                  players={players}
                  guessedPlayerIds={record.guessedPlayerIds}
                  targetId={target?.id}
                />
              ) : null}
            </div>
          </div>

          {/* The card and the route already fill the width; the way out does
              not need to, so it keeps the phone column's measure. */}
          <div className="mx-auto mt-5.5 w-full max-w-107.5">
            <Button
              accent={won ? "var(--ds-color-success)" : accentVar("cyan")}
              variant="solid"
              size="lg"
              fullWidth
              onClick={onBack}
            >
              RETURN TO INTEL HUB
            </Button>
            <button
              type="button"
              onClick={share}
              aria-label="Share spoiler free result"
              className={`${styles.link} mt-1 flex w-full cursor-pointer items-center justify-center gap-2 py-3`}
            >
              <span style={{ color: accentVar("pink") }}>
                <Glyph name="ios_share" size={17} />
              </span>
              <Label color={accentVar("pink")} tracking="var(--ds-tracking-mega)">
                {copied ? "RESULT COPIED" : "SHARE SPOILER-FREE RESULT"}
              </Label>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The grid the app shares: one row per clue, a purple block for every clue
 * decrypted and a red or green one for every guess spent. It names nobody, so
 * it can be posted while the day is still live.
 */
export function buildShareText(
  record: GuessPlayerDayRecord,
  puzzle: GuessPlayerPuzzle,
): string {
  const guessCount = Math.min(6, Math.max(0, record.guessedPlayerIds.length));
  const revealed = Math.min(6, Math.max(1, record.revealedClueCount));
  const verdict = effectiveWon(record) ? `${guessCount}/6` : "X/6";
  const grid = Array.from({ length: 6 }, (_, index) => {
    const clue = index < revealed ? "🟪" : "⬛";
    const guess =
      index < guessCount
        ? effectiveWon(record) && index === guessCount - 1
          ? "🟩"
          : "🟥"
        : "⬛";
    return `${clue}${guess}`;
  }).join("\n");

  return (
    `STATOZ · ${puzzle.sport.toUpperCase()} · ${record.dayKey}\n` +
    `GUESS THE PLAYER ${verdict}\n` +
    `${grid}\n` +
    `SCORE ${record.score} · +${record.xpEarned} XP`
  );
}

function Metric({
  label,
  value,
  text,
  prefix = "",
  suffix = "",
  animate = false,
  accent,
}: {
  label: string;
  value?: number;
  text?: string;
  prefix?: string;
  suffix?: string;
  animate?: boolean;
  accent: string;
}) {
  const counted = useCountUp(animate ? value : undefined);
  const shown =
    text ?? `${prefix}${animate ? counted : (value ?? 0)}${suffix}`;

  return (
    <Panel className="flex-1 px-2 py-3 text-center">
      <p
        className="truncate font-display font-black leading-compact ds-tabular"
        style={{ color: accent, fontSize: "var(--ds-text-sm)" }}
      >
        {shown}
      </p>
      <Label className="mt-1" tracking="var(--ds-tracking-mega)">
        {label}
      </Label>
    </Panel>
  );
}

/** Where this day left the Guess Player track. */
function XpPanel({
  trackXp,
  earned,
  animate,
}: {
  trackXp: number;
  earned: number;
  animate: boolean;
}) {
  const before = Math.max(0, trackXp - earned);
  const gained = useCountUp(animate ? earned : undefined);
  const shown = animate ? before + gained : trackXp;
  const band = levelProgress(shown);
  const gold = accentVar("gold");

  return (
    <Panel accent={withAlpha(gold, 0.55)}>
      <div className="flex items-center gap-2">
        <p
          className="font-display font-black leading-compact"
          style={{
            color: gold,
            fontSize: "var(--ds-text-md)",
            letterSpacing: "var(--ds-tracking-ultra)",
          }}
        >
          LEVEL {band.level}
        </p>
        <span className="flex-1" />
        <Label className="ds-tabular" tracking="var(--ds-tracking-tight)">
          {band.intoLevel}/{band.levelSpan} XP
        </Label>
      </div>
      <Progress
        className="mt-2"
        value={band.fraction}
        height={8}
        accent={gold}
        label={`Guess Player track, level ${band.level}`}
      />
    </Panel>
  );
}

function ClueDebrief({ puzzle }: { puzzle: GuessPlayerPuzzle }) {
  const pink = accentVar("pink");

  return (
    <Panel accent={withAlpha(pink, 0.55)}>
      <h3
        className="font-display font-black leading-compact"
        style={{
          color: pink,
          fontSize: "var(--ds-text-md)",
          letterSpacing: "var(--ds-tracking-ultra)",
        }}
      >
        FULL CAREER INTEL
      </h3>
      <ul className="mt-2.5">
        {puzzle.clues.map((clue, index) => (
          <li
            key={`${clue.label}-${index}`}
            className="flex items-center gap-2 py-2"
            style={{
              borderBottom:
                index === puzzle.clues.length - 1
                  ? undefined
                  : "1px solid var(--ds-color-border-subtle)",
            }}
          >
            <span
              className="w-6 shrink-0 font-display font-black leading-compact ds-tabular"
              style={{ color: accentVar("cyan"), fontSize: "var(--ds-text-xs)" }}
            >
              {index + 1}
            </span>
            <Label className="min-w-0 flex-1 truncate" tracking="var(--ds-tracking-mega)">
              {clue.label}
            </Label>
            <p
              className="shrink-0 text-right font-display font-black leading-compact"
              style={{ fontSize: "var(--ds-text-xs)" }}
            >
              {clue.value}
              {clue.year === null ? null : (
                <span className="ml-1.5 text-muted ds-tabular">
                  {clue.endYear === null || clue.endYear === clue.year
                    ? clue.year
                    : `${clue.year}–${clue.endYear}`}
                </span>
              )}
            </p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function ScanHistory({
  players,
  guessedPlayerIds,
  targetId,
}: {
  players: PlayerCard[];
  guessedPlayerIds: string[];
  targetId: string | undefined;
}) {
  return (
    <Panel>
      <h3
        className="font-display font-black leading-compact"
        style={{
          fontSize: "var(--ds-text-md)",
          letterSpacing: "var(--ds-tracking-ultra)",
        }}
      >
        SCAN HISTORY
      </h3>
      <ul className="mt-2">
        {guessedPlayerIds.map((id, index) => {
          const player = players.find((candidate) => candidate.id === id);
          const right = id === targetId;
          return (
            <li key={id} className="flex items-center gap-2 py-1.5">
              <span
                className="shrink-0"
                style={{
                  color: right ? "var(--ds-color-success)" : "var(--ds-color-danger)",
                }}
              >
                <Glyph name={right ? "verified" : "dangerous"} size={17} />
              </span>
              <p
                className="min-w-0 flex-1 truncate font-bold leading-compact"
                style={{ fontSize: "var(--ds-text-xs)" }}
              >
                {(player?.name ?? id).toUpperCase()}
              </p>
              <Label className="shrink-0" tracking="var(--ds-tracking-mega)">
                TRY {index + 1}
              </Label>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
