"use client";

import { useCallback, useEffect, useState } from "react";

import type { PlayerCard } from "@/domain/cards";
import { accentVar, Button, Glyph } from "@statoz/design-system/games";
import { spendCoins, useEconomy } from "@/features/economy";
import { sportForGame, type GameEntry } from "@/mocks/games";

import type { GameId } from "../../types";
import { GameLandingAd } from "../../shared/components/game-landing-ad";
import { useGameReturn } from "../../shared/hooks/use-game-return";
import { useClock } from "../../shared/state/use-clock";
import { extraAttemptCost, hintCost } from "../constants";
import {
  buyExtraAttempt,
  giveUp,
  openArchive,
  startRecord,
  submitGuess,
  unlockHint,
} from "../engine/archive";
import {
  deckFor,
  isGuessPlayerSport,
  playerById,
  puzzleForDate,
  puzzleForRecord,
} from "../engine/deck";
import { dayKeyFor } from "../engine/day-keys";
import {
  archiveFor,
  emptyArchive,
  guessPlayerStatsFrom,
  isSettled,
  readGuessPlayerStore,
  saveArchive,
  settleDay,
  useGuessPlayerStore,
  useIsGuessPlayerHydrated,
} from "../state/guess-player-store";
import type {
  GuessPlayerDayRecord,
  GuessPlayerFeedback,
  GuessPlayerHintType,
} from "../types";

import { Label, Panel } from "./guess-chrome";
import { GuessHome } from "./guess-home";
import { GuessLogs } from "./guess-logs";
import { GuessPlay } from "./guess-play";
import { GuessResult } from "./guess-result";

/**
 * Guess The Player — the web port of `GuessPlayerTabContent`.
 *
 * One product for football, cricket, and basketball: the sport picks the route
 * table and the pool searched, and keys its own archive. Everything else — the
 * six attempts, the paid scans, the scoring, the thirty-day log — is shared, as
 * it is in the app.
 *
 * The cubit's async bookkeeping has no counterpart here, because browser storage
 * is read synchronously: what is left is which screen is up, which day is open,
 * and the one-shot verdict from the last submission. Every rule lives in
 * `engine/`, and every write goes through the store.
 */

export type GuessPlayerProps = {
  game: GameId;
  entry: GameEntry;
};

type View = "home" | "logs" | "day";

export function GuessPlayer({ game }: GuessPlayerProps) {
  const sport = sportForGame(game);
  const hydrated = useIsGuessPlayerHydrated();
  const store = useGuessPlayerStore();
  const economy = useEconomy();
  const now = useClock();

  const [view, setView] = useState<View>("home");
  const [openDayKey, setOpenDayKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<GuessPlayerFeedback>("none");
  const [feedbackSerial, setFeedbackSerial] = useState(0);
  /** The day whose debrief may still run its count-ups. */
  const [freshDayKey, setFreshDayKey] = useState<string | null>(null);

  // Derived, and all of it pure, so it can be read before the screen guards and
  // the callbacks below can close over it.
  const deck = isGuessPlayerSport(sport) ? deckFor(sport) : null;
  const archive = deck === null ? emptyArchive : archiveFor(store, deck.sport);
  const todayKey = now === null ? null : dayKeyFor(now);
  const record = openDayKey === null ? undefined : archive.resultsByDay[openDayKey];
  const puzzle =
    deck === null || record === undefined ? null : puzzleForRecord(deck, record);
  const goBack = useGameReturn();

  /**
   * Opening the archive needs the browser's clock and it writes, neither of
   * which a render may do. Keyed on the day, so a tab left up overnight finds
   * tomorrow's mystery rather than yesterday's.
   */
  useEffect(() => {
    if (deck === null || todayKey === null) return;
    const moment = new Date();
    const today = puzzleForDate(deck, moment);
    if (today === null) return;
    const target = playerById(deck, today.playerId);
    const opened = openArchive(
      // Read straight from storage rather than from the subscribed snapshot:
      // this effect writes, and closing over the value it is about to replace
      // would make the day it opens depend on render timing.
      archiveFor(readGuessPlayerStore(), deck.sport),
      todayKey,
      today,
      target?.name ?? "",
      moment.getTime(),
    );
    if (opened.changed) saveArchive(deck.sport, opened.archive);
  }, [deck, todayKey]);

  const put = useCallback(
    (next: GuessPlayerDayRecord) => {
      if (deck === null) return;
      saveArchive(deck.sport, {
        resultsByDay: { ...archive.resultsByDay, [next.dayKey]: next },
      });
    },
    [archive, deck],
  );

  /**
   * A finished day is credited once. The settlement id is the app's, so
   * reopening the debrief shows the result without replaying the reward.
   */
  const markFresh = useCallback(
    (finished: GuessPlayerDayRecord) => {
      if (deck === null) return;
      if (settleDay(deck.sport, finished.dayKey)) setFreshDayKey(finished.dayKey);
    },
    [deck, setFreshDayKey],
  );

  /** Opens a day, stamping the start on a run entered for the first time. */
  const openDay = useCallback(
    (key: string) => {
      const existing = archive.resultsByDay[key];
      if (existing === undefined) return;
      if (key === todayKey) {
        const started = startRecord(existing, Date.now());
        if (started !== null) put(started);
      } else if (existing.status === "expired" || existing.status === "inProgress") {
        return;
      }
      setOpenDayKey(key);
      setFeedback("none");
      setView("day");
    },
    [archive, put, setFeedback, setOpenDayKey, setView, todayKey],
  );

  const backHome = useCallback(() => {
    setView("home");
    setOpenDayKey(null);
    setFeedback("none");
  }, [setFeedback, setOpenDayKey, setView]);

  const onGuess = useCallback(
    (player: PlayerCard) => {
      if (record === undefined || puzzle === null) return;
      const result = submitGuess(record, puzzle, player.id, Date.now());
      if (result === null) return;
      put(result.record);
      setFeedback(result.feedback);
      setFeedbackSerial((serial) => serial + 1);
      if (result.settlementPending) markFresh(result.record);
    },
    [markFresh, puzzle, put, record, setFeedback, setFeedbackSerial],
  );

  const onGiveUp = useCallback(() => {
    if (record === undefined) return;
    const result = giveUp(record, Date.now());
    if (result === null) return;
    put(result.record);
    setFeedback(result.feedback);
    setFeedbackSerial((serial) => serial + 1);
    markFresh(result.record);
  }, [markFresh, put, record, setFeedback, setFeedbackSerial]);

  /**
   * Coins are spent before the record moves, so a refused purchase cannot leave
   * a scan decrypted for free. The app writes the record first and settles
   * after; same outcome when the wallet is good for it, safer when it is not.
   */
  const onUnlockHint = useCallback(
    (type: GuessPlayerHintType) => {
      if (record === undefined || deck === null) return;
      if (unlockHint(record, type) === null) return;
      const paid = spendCoins({
        id: `guess-player-hint-${deck.sport}-${record.dayKey}-${type}`,
        coins: hintCost,
        title: "CAREER INTEL HINT",
        subtitle: type === "position" ? "POSITION" : "AFFILIATION",
      });
      if (!paid.ok) return;
      const next = unlockHint(record, type);
      if (next !== null) put(next);
    },
    [deck, put, record],
  );

  const onBuyExtraAttempt = useCallback(() => {
    if (record === undefined || deck === null) return;
    if (buyExtraAttempt(record) === null) return;
    const paid = spendCoins({
      id: `guess-player-attempt-${deck.sport}-${record.dayKey}`,
      coins: extraAttemptCost,
      title: "GUESS PLAYER EXTRA ATTEMPT",
      subtitle: "+1 GUESS",
    });
    if (!paid.ok) return;
    const next = buyExtraAttempt(record);
    if (next !== null) put(next);
  }, [deck, put, record]);

  const openLogs = useCallback(() => setView("logs"), [setView]);
  const openToday = useCallback(() => {
    if (todayKey !== null) openDay(todayKey);
  }, [openDay, todayKey]);

  /* ---- Which screen --------------------------------------------------- */

  if (deck === null) return <Unsupported />;
  if (deck.issues.length > 0) return <IntelLinkFailed issue={deck.issues[0]} onBack={goBack} />;
  if (!hydrated || now === null || todayKey === null) return <Opening />;

  if (view === "logs") {
    return (
      <GuessLogs
        archive={archive}
        currentDayKey={todayKey}
        now={now}
        onOpenDay={openDay}
        onBack={backHome}
      />
    );
  }

  if (view === "day" && openDayKey !== null && record !== undefined && puzzle !== null) {
    const target = playerById(deck, record.legacy ? puzzle.playerId : record.playerId);

    if (record.status === "inProgress") {
      return (
        <GuessPlay
          sport={deck.sport}
          record={record}
          puzzle={puzzle}
          target={target}
          players={deck.players}
          coins={economy?.coins ?? 0}
          feedback={feedback}
          feedbackSerial={feedbackSerial}
          onGuess={onGuess}
          onGiveUp={onGiveUp}
          onBuyExtraAttempt={onBuyExtraAttempt}
          onUnlockHint={onUnlockHint}
          onBack={backHome}
        />
      );
    }

    return (
      <GuessResult
        record={record}
        puzzle={puzzle}
        target={target}
        players={deck.players}
        archive={archive}
        currentDayKey={todayKey}
        trackXp={guessPlayerStatsFrom(store).xp}
        fresh={freshDayKey === openDayKey && isSettled(store, deck.sport, openDayKey)}
        onBack={backHome}
      />
    );
  }

  const todayRecord = archive.resultsByDay[todayKey];
  if (todayRecord === undefined) return <Opening />;

  return (
    <>
      <GuessHome
        sport={deck.sport}
        archive={archive}
        todayRecord={todayRecord}
        currentDayKey={todayKey}
        now={now}
        onOpenToday={openToday}
        onOpenLogs={openLogs}
        onBack={goBack}
        sportLabel={`${deck.sport.toUpperCase()} DECK`}
      />
      <GameLandingAd />
    </>
  );
}

/**
 * The frame before storage is read, and the whole of the prerendered HTML.
 * The app shows a spinner; this names the mode, which is more use to a crawler
 * and to a slow connection.
 */
function Opening() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1
        className="font-display font-black leading-tight"
        style={{
          color: accentVar("pink"),
          fontSize: "var(--ds-text-2xl)",
          letterSpacing: "var(--ds-tracking-display)",
        }}
      >
        GUESS THE PLAYER
      </h1>
      <Label className="mt-3" tracking="var(--ds-tracking-ultra)">
        OPENING...
      </Label>
    </div>
  );
}

/**
 * Tennis and motorsport run their own daily mysteries — Guess the Winner and
 * Guess the Driver — so this mode has no route table for them.
 */
function Unsupported() {
  return (
    <div className="grid min-h-dvh place-items-center px-5 text-center">
      <Panel className="max-w-md">
        <Label>{"// NO ROUTE TABLE"}</Label>
        <h1
          className="mt-3 font-display font-black leading-compact"
          style={{ color: accentVar("pink"), fontSize: "var(--ds-text-xl)" }}
        >
          GUESS THE PLAYER
        </h1>
        <p className="mt-3 leading-body text-muted" style={{ fontSize: "var(--ds-text-xs)" }}>
          This sport runs its own daily mystery rather than the career-route one.
        </p>
      </Panel>
    </div>
  );
}

/** The app's `INTEL LINK FAILED` state, when the deck no longer validates. */
function IntelLinkFailed({ issue, onBack }: { issue: string; onBack: () => void }) {
  return (
    <div className="grid min-h-dvh place-items-center px-5 text-center">
      <Panel accent="var(--ds-color-danger)" className="max-w-md">
        <span style={{ color: "var(--ds-color-danger)" }}>
          <Glyph name="warning" size={32} />
        </span>
        <h1
          className="mt-3 font-display font-black leading-compact"
          style={{ color: "var(--ds-color-danger)", fontSize: "var(--ds-text-xl)" }}
        >
          INTEL LINK FAILED
        </h1>
        <p className="mt-3 leading-body text-muted" style={{ fontSize: "var(--ds-text-xs)" }}>
          {issue}
        </p>
        <div className="mt-5">
          <Button accent={accentVar("cyan")} variant="tonal" size="md" fullWidth onClick={onBack}>
            BACK TO GAMES
          </Button>
        </div>
      </Panel>
    </div>
  );
}
