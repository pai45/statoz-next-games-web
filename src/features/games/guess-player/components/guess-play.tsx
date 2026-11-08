"use client";

import Image from "next/image";
import { useMemo, useState, type CSSProperties } from "react";

import type { PlayerCard } from "@/domain/cards";
import { accentVar, Glyph, withAlpha } from "@statoz/design-system/games";
import { portraitForCard } from "@/features/packs";

import { extraAttemptCost, hintCost, maxAttempts, noticeMs } from "../constants";
import type { GuessPlayerSport } from "../engine/deck";
import type {
  GuessPlayerDayRecord,
  GuessPlayerFeedback,
  GuessPlayerHintType,
  GuessPlayerPuzzle,
} from "../types";

import { ActionDock } from "./action-dock";
import { CareerRoute } from "./career-route";
import {
  Chip,
  ConfirmDialog,
  GuessHeader,
  Label,
  Panel,
  type ConfirmRequest,
} from "./guess-chrome";
import { hintLabel, IntelMarket } from "./intel-market";
import { PlayerSearch } from "./player-search";
import styles from "./guess-player.module.css";

/**
 * The run itself — the web port of `guess_player_screen.dart`'s play view.
 *
 * Three bands: what is known about the target, the career route decrypted so
 * far with the two paid scans beneath it, and the database the guess is picked
 * from. The dock is pinned so the hearts and the commit stay in view while the
 * route scrolls.
 *
 * On a wide screen the route and the database sit side by side rather than
 * stacked — the strip is naturally horizontal, and stretching a phone column
 * across a monitor would leave the search a scroll away from the clue it
 * answers.
 */

export type GuessPlayProps = {
  sport: GuessPlayerSport;
  record: GuessPlayerDayRecord;
  puzzle: GuessPlayerPuzzle;
  target: PlayerCard | null;
  players: PlayerCard[];
  coins: number;
  feedback: GuessPlayerFeedback;
  /** Bumped on every submission, so a repeat of the same verdict replays. */
  feedbackSerial: number;
  onGuess: (player: PlayerCard) => void;
  onGiveUp: () => void;
  onBuyExtraAttempt: () => void;
  onUnlockHint: (type: GuessPlayerHintType) => void;
  onBack: () => void;
};

export function GuessPlay({
  sport,
  record,
  puzzle,
  target,
  players,
  coins,
  feedback,
  feedbackSerial,
  onGuess,
  onGiveUp,
  onBuyExtraAttempt,
  onUnlockHint,
  onBack,
}: GuessPlayProps) {
  const pink = accentVar("pink");
  const [selected, setSelected] = useState<PlayerCard | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const portrait = useMemo(
    () => (target === null ? undefined : portraitForCard(target)),
    [target],
  );
  const silhouette = record.revealedClueCount >= 5 && portrait !== undefined;

  const submit = () => {
    if (selected === null) return;
    onGuess(selected);
    setSelected(null);
  };

  const askGiveUp = () => {
    setConfirm({
      title: "DECLASSIFY THIS PLAYER?",
      message:
        "Giving up ends today's mystery with no score or XP. You can still review every clue.",
      confirmLabel: "GIVE UP",
      cancelLabel: "KEEP SCANNING",
      destructive: true,
      onConfirm: onGiveUp,
    });
  };

  const askHint = (type: GuessPlayerHintType) => {
    const label = hintLabel(type, sport);
    if (coins < hintCost) {
      setConfirm({
        title: "INTEL FUNDS LOW",
        message: `This scan needs ${hintCost} coins. Earn more coins, then return to this career route.`,
        confirmLabel: "RETURN",
        cancelLabel: "CLOSE",
        destructive: true,
      });
      return;
    }
    setConfirm({
      title: `UNLOCK ${label}?`,
      message: `Spend ${hintCost} coins to decrypt this player-profile scan. It will not consume an attempt.`,
      confirmLabel: `SPEND ${hintCost}`,
      cancelLabel: "KEEP COINS",
      onConfirm: () => onUnlockHint(type),
    });
  };

  const askExtraAttempt = () => {
    if (coins < extraAttemptCost) {
      setConfirm({
        title: "COINS REQUIRED",
        message: `You need ${extraAttemptCost} coins to restore one more guess on this mystery.`,
        confirmLabel: "RETURN",
        cancelLabel: "CLOSE",
        destructive: true,
      });
      return;
    }
    setConfirm({
      title: "RESTORE ONE GUESS?",
      message: `Spend ${extraAttemptCost} coins for a single extra guess. The whole career route is decrypted with it.`,
      confirmLabel: `SPEND ${extraAttemptCost}`,
      cancelLabel: "KEEP COINS",
      onConfirm: onBuyExtraAttempt,
    });
  };

  return (
    <div className="flex h-dvh flex-col">
      <GuessHeader
        eyebrow="GUESS THE PLAYER"
        title={`CLUE ${record.revealedClueCount}/6 · ${record.attemptsRemaining} TRIES`}
        onBack={onBack}
        backLabel="Save and leave"
        right={<Chip accent={pink}>LIVE</Chip>}
      />

      {/* Centred on a tall desktop window: the two columns are short, and left
          at the top they read as a phone layout with the rest painted out. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 lg:justify-center">
        <div className="mx-auto flex w-full max-w-107.5 flex-col gap-4 lg:max-w-230 lg:flex-row lg:items-start lg:gap-8">
          <div className="flex flex-col gap-4 lg:w-115 lg:shrink-0">
            <MysteryBay
              key={`bay-${feedbackSerial}-${feedback}`}
              difficulty={puzzle.difficulty}
              silhouette={silhouette}
              portrait={portrait}
              shake={feedback === "wrong"}
            />

            <Panel accent={withAlpha(pink, 0.55)}>
              <div className="flex items-center gap-2">
                <h2
                  className="min-w-0 flex-1 truncate font-display font-black leading-compact"
                  style={{
                    fontSize: "var(--ds-text-md)",
                    letterSpacing: "var(--ds-tracking-ultra)",
                  }}
                >
                  CAREER PATH
                </h2>
                <Label color={pink} tracking="var(--ds-tracking-mega)">
                  ROUTE // {record.revealedClueCount}/6
                </Label>
              </div>

              <div
                className="mt-2.5"
                role="group"
                aria-label={`Career route. Clue ${record.revealedClueCount} of 6. ${record.attemptsRemaining} attempts remaining.`}
              >
                <CareerRoute
                  clues={puzzle.clues}
                  revealedClueCount={record.revealedClueCount}
                />
              </div>

              <div className="mt-3.5">
                <IntelMarket
                  sport={sport}
                  target={target}
                  revealed={record.revealedHintTypes}
                  coins={coins}
                  live
                  onUnlock={askHint}
                />
              </div>
            </Panel>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3 lg:pt-0">
            <PlayerSearch
              players={players}
              guessedPlayerIds={record.guessedPlayerIds}
              selected={selected}
              onSelect={setSelected}
              onSubmit={submit}
              onGiveUp={askGiveUp}
              disabled={record.attemptsRemaining <= 0}
            />

            {record.guessedPlayerIds.length > 0 ? (
              <GuessLog players={players} guessedPlayerIds={record.guessedPlayerIds} />
            ) : null}

            {feedback === "duplicate" ? (
              <p
                key={`dup-${feedbackSerial}`}
                role="status"
                className={`${styles.notice} text-center font-bold leading-compact`}
                style={
                  {
                    "--notice-ms": `${noticeMs}ms`,
                    color: accentVar("orange"),
                    fontSize: "var(--ds-text-2xs)",
                    letterSpacing: "var(--ds-tracking-label)",
                  } as CSSProperties
                }
              >
                PLAYER ALREADY SCANNED · NO ATTEMPT USED
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <ActionDock
        attemptsRemaining={record.attemptsRemaining}
        selected={selected !== null}
        potentialXp={20 + record.attemptsRemaining * 5}
        onSubmit={submit}
        onGiveUp={askGiveUp}
        onBuyExtraAttempt={askExtraAttempt}
      />

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

/**
 * What is known about the target so far.
 *
 * Five clues in, the app finds a visual trace: the portrait, blurred and
 * drained of colour. Enough silhouette to narrow a shortlist, not enough to
 * read a face — and only for the players the pool actually has art for.
 */
function MysteryBay({
  difficulty,
  silhouette,
  portrait,
  shake,
}: {
  difficulty: string;
  silhouette: boolean;
  portrait: string | undefined;
  shake: boolean;
}) {
  const pink = accentVar("pink");
  const orange = accentVar("orange");

  return (
    <Panel className={shake ? styles.shake : undefined}>
      <div className="flex items-center gap-3.5">
        <span
          className="relative grid h-19 w-17 shrink-0 place-items-center overflow-hidden"
          style={{
            background: "var(--ds-color-background-muted)",
            border: "1px solid var(--ds-color-border-subtle)",
            color: pink,
          }}
        >
          {silhouette && portrait !== undefined ? (
            <Image
              src={portrait}
              alt=""
              fill
              sizes="68px"
              className={`${styles.silhouette} object-cover object-top`}
            />
          ) : (
            <Glyph name="person_search" size={38} />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <h2
            className="font-display font-black leading-compact"
            style={{
              color: silhouette ? orange : "var(--ds-color-text-default)",
              fontSize: "var(--ds-text-md)",
              letterSpacing: "var(--ds-tracking-ultra)",
            }}
          >
            {silhouette ? "SILHOUETTE TRACE FOUND" : "IDENTITY ENCRYPTED"}
          </h2>
          <p
            className="mt-1.5 leading-body text-muted"
            style={{ fontSize: "var(--ds-text-xs)" }}
          >
            {silhouette
              ? "Visual trace ready for a final read."
              : "Submit a player to unlock the next career stop."}
          </p>
        </div>

        <Chip accent={pink}>{difficulty.toUpperCase()}</Chip>
      </div>
    </Panel>
  );
}

/** Every player already scanned, in the order they were spent. */
function GuessLog({
  players,
  guessedPlayerIds,
}: {
  players: PlayerCard[];
  guessedPlayerIds: string[];
}) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Players already scanned">
      {guessedPlayerIds.map((id, index) => {
        const player = players.find((candidate) => candidate.id === id);
        return (
          <li key={id}>
            <Chip accent="var(--ds-color-danger)">
              {index + 1} · {player?.shortName ?? id}
            </Chip>
          </li>
        );
      })}
    </ul>
  );
}

/** The attempts a run starts with, where the dock and the header agree on it. */
export { maxAttempts };
