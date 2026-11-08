"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { accentVar, Glyph, withAlpha } from "@statoz/design-system/games";
import { spendCoins, useEconomy } from "@/features/economy";

import { lifelineCost } from "../constants";
import { bingoCareerFor } from "../data/careers";
import {
  applySelection,
  currentCell,
  grantLifeline,
  needsLifeline as isBlocked,
  solvedSet,
} from "../engine/archive";
import { bingoPuzzleFor } from "../data/puzzles";
import { bingoStatus, formatCountdown, formatTimer } from "../engine/day-keys";
import type { BingoCell, BingoProgress } from "../types";

import { ActivePlayer } from "./active-player";
import { BingoHeader, FlatPanel, Label, Toast } from "./bingo-chrome";
import { BingoGrid } from "./bingo-grid";
import { CareerSheet } from "./career-sheet";
import { CompletionOverlay } from "./completion-overlay";
import { LifelineDock } from "./lifeline-dock";
import styles from "./football-bingo.module.css";

/**
 * The grid itself — the web port of `football_bingo_screen.dart`.
 *
 * One player at a time, into the cell where their two clubs meet. A hit flies
 * the player across into place; a miss costs a life. Nine of nine logs the day.
 *
 * A day opened from the archive is read-only: the answers are shown, the
 * lifeline dock is gone, and nothing can be placed.
 */

export type BingoPlayProps = {
  dayKey: string;
  progress: BingoProgress;
  isToday: boolean;
  now: Date;
  onSaveProgress: (progress: BingoProgress) => void;
  onBack: () => void;
  onCompleted: () => void;
};

type Flight = {
  cellId: string;
  shortName: string;
  from: DOMRect;
  to: DOMRect;
  completesGrid: boolean;
};

export function BingoPlay({
  dayKey,
  progress,
  isToday,
  now,
  onSaveProgress,
  onBack,
  onCompleted,
}: BingoPlayProps) {
  const orange = accentVar("orange");
  const economy = useEconomy();

  const puzzle = bingoPuzzleFor(progress.puzzleId);
  const readOnly = !isToday;
  const blocked = isBlocked(progress);
  const solved = solvedSet(progress);
  const activeCell = currentCell(puzzle, progress, readOnly);
  const activeCareer = activeCell === null ? null : bingoCareerFor(activeCell.playerId);

  const [elapsed, setElapsed] = useState(progress.elapsedSeconds);
  const [showCompletion, setShowCompletion] = useState(false);
  const [wrongCellId, setWrongCellId] = useState<string | null>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [settlingCellId, setSettlingCellId] = useState<string | null>(null);
  const [routeCell, setRouteCell] = useState<BingoCell | null>(null);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);

  const stackRef = useRef<HTMLDivElement>(null);
  const plateRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef(new Map<string, HTMLElement>());
  // The newest values, for the save that happens as the screen goes: an effect
  // may not read state captured when it was registered.
  const latest = useRef({ progress, elapsed });

  const running = !readOnly && !progress.completed;

  useEffect(() => {
    latest.current = { progress, elapsed };
  });

  // The clock on the open grid. It is written back when the screen goes, and
  // whenever a placement saves anyway, rather than once a second.
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (readOnly) return;
    const save = () =>
      onSaveProgress({
        ...latest.current.progress,
        elapsedSeconds: latest.current.elapsed,
      });
    window.addEventListener("pagehide", save);
    return () => {
      window.removeEventListener("pagehide", save);
      save();
    };
  }, [readOnly, onSaveProgress]);

  const say = useCallback((message: string) => {
    setToast({ id: Date.now(), message });
  }, []);

  useEffect(() => {
    if (toast === null) return;
    const id = window.setTimeout(() => setToast(null), 1600);
    return () => window.clearTimeout(id);
  }, [toast]);

  /** A rect measured against the screen's own stack, so the flight can use it. */
  const rectIn = useCallback((element: Element | null | undefined): DOMRect | null => {
    const stack = stackRef.current;
    if (stack === null || element === null || element === undefined) return null;
    const origin = stack.getBoundingClientRect();
    const box = element.getBoundingClientRect();
    return new DOMRect(box.left - origin.left, box.top - origin.top, box.width, box.height);
  }, []);

  const onTapCell = useCallback(
    (cellId: string) => {
      if (flight !== null) return;
      if (blocked) {
        say("Buy a lifeline to keep playing.");
        return;
      }

      const career = activeCareer;
      const from = rectIn(plateRef.current);
      const to = rectIn(cellRefs.current.get(cellId));
      const outcome = applySelection(progress, puzzle, cellId, readOnly);
      if (outcome === null) return;

      onSaveProgress({ ...outcome.progress, elapsedSeconds: elapsed });

      if (!outcome.correct) {
        setWrongCellId(cellId);
        return;
      }

      setWrongCellId(null);
      if (from === null || to === null || career === null) {
        // Nothing to measure against — the placement simply lands.
        if (outcome.progress.completed) setShowCompletion(true);
        return;
      }
      setSettlingCellId(cellId);
      setFlight({
        cellId,
        shortName: career.shortName,
        from,
        to,
        completesGrid: outcome.progress.completed,
      });
    },
    [activeCareer, blocked, elapsed, flight, onSaveProgress, progress, puzzle, readOnly, rectIn, say],
  );

  const onFlightLanded = useCallback(() => {
    setSettlingCellId(null);
    if (flight?.completesGrid === true) setShowCompletion(true);
    setFlight(null);
  }, [flight]);

  const onBuyLifeline = useCallback(() => {
    if (economy.coins < lifelineCost) {
      say(`Need ${lifelineCost} coins for a lifeline.`);
      return;
    }
    const result = spendCoins({
      id: `football-bingo-lifeline-${dayKey}`,
      coins: lifelineCost,
      title: "BINGO LIFELINE",
      subtitle: "+1 LIFE",
    });
    if (!result.ok) {
      say(`Need ${lifelineCost} coins for a lifeline.`);
      return;
    }
    onSaveProgress({ ...grantLifeline(progress), elapsedSeconds: elapsed });
    setWrongCellId(null);
  }, [dayKey, economy.coins, elapsed, onSaveProgress, progress, say]);

  const status = bingoStatus(progress, now);
  const timerValue = readOnly
    ? "VIEW"
    : progress.completed
      ? formatCountdown(status.remainingMs)
      : formatTimer(elapsed);
  const timerLabel = readOnly ? "ARCHIVE" : progress.completed ? "NEXT" : "TIMER";

  return (
    <div ref={stackRef} className="relative flex min-h-dvh flex-col">
      <BingoHeader
        eyebrow="BACK TO BINGO"
        title="BINGO GRID"
        onBack={onBack}
        backLabel="Back to Football Bingo"
      />

      {/* Centred on a desktop, where the board and the player panel together are
          far shorter than the window; a phone keeps them at the top. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3.5 py-3.5 lg:justify-center">
        <div className="mx-auto flex w-full max-w-120 flex-col gap-4 lg:max-w-230 lg:flex-row lg:items-start lg:justify-center lg:gap-10">
          <div className="flex flex-col gap-3.5 lg:w-98 lg:shrink-0">
            <div className="flex gap-2.5">
              <FlatPanel className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5">
                <span style={{ color: orange }}>
                  <Glyph name="grid_on" size={18} />
                </span>
                <span
                  className="min-w-0 flex-1 truncate font-bold leading-compact"
                  style={{
                    fontSize: "var(--ds-text-xs)",
                    letterSpacing: "var(--ds-tracking-label)",
                  }}
                >
                  {puzzle.title.toUpperCase()}
                </span>
                <span
                  className="shrink-0 font-display font-black leading-compact ds-tabular"
                  style={{ color: orange, fontSize: "var(--ds-text-md)" }}
                >
                  {progress.solvedCellIds.length}/{puzzle.cells.length}
                </span>
              </FlatPanel>

              <div
                className="grid h-12 w-21.5 shrink-0 place-items-center"
                style={{
                  background: "var(--ds-color-background-elevated)",
                  border: `1px solid ${orange}`,
                }}
              >
                <Label tracking="var(--ds-tracking-mega)">{timerLabel}</Label>
                <p
                  className="font-display font-black leading-compact ds-tabular"
                  style={{ color: orange, fontSize: "var(--ds-text-sm)" }}
                >
                  {timerValue}
                </p>
              </div>
            </div>

            <BingoGrid
              puzzle={puzzle}
              solved={solved}
              settlingCellId={settlingCellId}
              revealAnswers={readOnly}
              wrongCellId={wrongCellId}
              disabled={progress.completed || blocked}
              onTapCell={onTapCell}
              onOpenRoute={setRouteCell}
              cellRefs={cellRefs}
            />
          </div>

          {/* Held to a readable measure: a countdown or a two-line notice
              stretched across half a monitor reads as an empty band. */}
          <div className="flex min-w-0 flex-1 flex-col gap-4 pb-2 lg:max-w-95 lg:pt-2">
            <ActivePlayer
              career={activeCareer}
              progress={progress}
              isToday={isToday}
              now={now}
              plateRef={plateRef}
            />

            {progress.completed && !showCompletion ? (
              <FlatPanel borderColor={accentVar("lime")} className="text-center">
                <span style={{ color: accentVar("lime") }}>
                  <Glyph name="verified" size={30} />
                </span>
                <p
                  className="mt-2 font-display font-black leading-compact"
                  style={{ color: accentVar("lime"), fontSize: "var(--ds-text-lg)" }}
                >
                  GRID COMPLETE
                </p>
                <p
                  className="mt-1.5 leading-body text-muted"
                  style={{ fontSize: "var(--ds-text-xs)" }}
                >
                  Tomorrow unlocks the next run.
                </p>
              </FlatPanel>
            ) : null}
          </div>
        </div>
      </div>

      {readOnly || progress.completed ? null : (
        <LifelineDock
          lifelines={progress.lifelines}
          needsLifeline={blocked}
          onBuy={onBuyLifeline}
        />
      )}

      {toast === null ? null : <Toast key={toast.id} message={toast.message} />}

      {flight === null ? null : (
        <FlightTile flight={flight} onLanded={onFlightLanded} />
      )}

      {showCompletion ? <CompletionOverlay onDone={onCompleted} /> : null}

      <CareerSheet cell={routeCell} onClose={() => setRouteCell(null)} />
    </div>
  );
}

/**
 * The placed player crossing the screen.
 *
 * The endpoints were measured on the tap and ride in as custom properties; the
 * arc and the timing are the stylesheet's. It clears itself when the animation
 * ends rather than on a matching timer, so the two can never disagree.
 */
function FlightTile({
  flight,
  onLanded,
}: {
  flight: Flight;
  onLanded: () => void;
}) {
  const lime = accentVar("lime");
  const orange = accentVar("orange");

  return (
    <span
      className={`${styles.flight} grid place-items-center gap-0.5 px-1`}
      onAnimationEnd={onLanded}
      aria-hidden
      style={
        {
          "--flight-from-x": `${flight.from.left}px`,
          "--flight-from-y": `${flight.from.top}px`,
          "--flight-from-w": `${flight.from.width}px`,
          "--flight-from-h": `${flight.from.height}px`,
          "--flight-to-x": `${flight.to.left}px`,
          "--flight-to-y": `${flight.to.top}px`,
          "--flight-to-w": `${flight.to.width}px`,
          "--flight-to-h": `${flight.to.height}px`,
          background: lime,
          border: `2px solid ${orange}`,
          boxShadow: `0 0 18px ${withAlpha(orange, 0.22)}`,
          color: "var(--ds-color-text-inverse)",
        } as CSSProperties
      }
    >
      <Glyph name="check" size={20} />
      <span
        className="max-w-full truncate font-display font-black leading-compact"
        style={{
          fontSize: "var(--ds-text-2xs)",
          letterSpacing: "var(--ds-tracking-tight)",
        }}
      >
        {flight.shortName}
      </span>
    </span>
  );
}
