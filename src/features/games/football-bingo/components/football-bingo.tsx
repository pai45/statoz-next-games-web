"use client";

import { useCallback, useEffect, useState } from "react";

import { accentVar } from "@statoz/design-system/games";
import type { GameEntry } from "@/mocks/games";

import type { GameId } from "../../types";
import { GameLandingAd } from "../../shared/components/game-landing-ad";
import { useGameReturn } from "../../shared/hooks/use-game-return";
import { completedCount } from "../engine/archive";
import { dayKeyFor } from "../engine/day-keys";
import {
  openSeason,
  saveProgress,
  useBingoArchive,
  useIsHydrated,
} from "../state/bingo-archive-store";
import { useClock } from "../../shared/state/use-clock";
import type { BingoProgress } from "../types";

import { BingoHome } from "./bingo-home";
import { BingoLogs } from "./bingo-logs";
import { BingoPlay } from "./bingo-play";

/**
 * Football Bingo — the web port of `FootballBingoTabContent`.
 *
 * Three screens over one season: the landing page, the archive, and the grid
 * itself. The orchestrator owns which of them is showing and which day is open,
 * and nothing else — the season lives in storage, and every screen reads it.
 *
 * The season is opened in an effect rather than on read: it needs the browser's
 * clock and it writes, neither of which a render may do. It reopens when the
 * local date rolls over, so a tab left up overnight finds tomorrow's grid
 * waiting rather than yesterday's.
 */

export type FootballBingoProps = {
  game: GameId;
  entry: GameEntry;
};

type View = "home" | "logs" | "grid";

export function FootballBingo({ game: _game }: FootballBingoProps) {
  void _game;
  const hydrated = useIsHydrated();
  const archive = useBingoArchive();
  const now = useClock();

  const [view, setView] = useState<View>("home");
  const [openDayKey, setOpenDayKey] = useState<string | null>(null);

  const todayKey = now === null ? null : dayKeyFor(now);
  const goBack = useGameReturn();

  useEffect(() => {
    if (todayKey === null) return;
    openSeason(new Date());
  }, [todayKey]);

  const onSaveProgress = useCallback(
    (progress: BingoProgress) => {
      if (openDayKey === null) return;
      saveProgress(openDayKey, progress);
    },
    [openDayKey],
  );

  const backHome = useCallback(() => setView("home"), []);

  if (!hydrated || archive === null || now === null || todayKey === null) {
    return <Opening />;
  }

  if (view === "logs") {
    return (
      <BingoLogs
        archive={archive}
        todayKey={todayKey}
        now={now}
        onOpenDay={(dayKey) => {
          setOpenDayKey(dayKey);
          setView("grid");
        }}
        onBack={backHome}
      />
    );
  }

  const openProgress = openDayKey === null ? undefined : archive.progressByDay[openDayKey];
  if (view === "grid" && openDayKey !== null && openProgress !== undefined) {
    return (
      <BingoPlay
        dayKey={openDayKey}
        progress={openProgress}
        isToday={openDayKey === todayKey}
        now={now}
        onSaveProgress={onSaveProgress}
        onBack={backHome}
        onCompleted={backHome}
      />
    );
  }

  // Today is always in the season by the time the archive exists, but reading
  // it defensively keeps a mid-rollover render from throwing.
  const todayProgress = archive.progressByDay[todayKey];
  if (todayProgress === undefined) return <Opening />;

  return (
    <>
      <BingoHome
        todayProgress={todayProgress}
        completedCount={completedCount(archive)}
        // The app counts what the archive actually holds rather than re-deriving
        // the range, so a day carried in from an older save still counts.
        unlockedCount={Object.keys(archive.progressByDay).length}
        now={now}
        onPlay={() => {
          setOpenDayKey(todayKey);
          setView("grid");
        }}
        onOpenLogs={() => setView("logs")}
        onBack={goBack}
      />
      <GameLandingAd />
    </>
  );
}

/**
 * The frame before the season is read, and the whole of the prerendered HTML.
 * The app shows a spinner here; this says which game is opening, which is more
 * use to a crawler and to a slow connection.
 */
function Opening() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1
        className="font-display font-black leading-tight"
        style={{
          color: accentVar("orange"),
          fontSize: "var(--ds-text-2xl)",
          letterSpacing: "var(--ds-tracking-display)",
        }}
      >
        FOOTBALL BINGO
      </h1>
      <p
        className="mt-3 font-bold leading-compact text-muted"
        style={{
          fontSize: "var(--ds-text-2xs)",
          letterSpacing: "var(--ds-tracking-ultra)",
        }}
      >
        OPENING...
      </p>
    </div>
  );
}
