import { contentVersion, startingLifelines } from "../constants";
import { bingoPuzzleFor, bingoPuzzleForDayIndex } from "../data/puzzles";
import type { BingoArchive, BingoCell, BingoProgress, BingoPuzzle } from "../types";

import { DartRandom, dartShuffle, stableSeed } from "./dart-random";
import { dayIndexFor, dayKeyFor, parseDayKey, unlockedDayKeys } from "./day-keys";

/**
 * The archive's rules — the pure half of `FootballBingoCubit`.
 *
 * The cubit interleaves state, storage and these transitions; here they are
 * separated so the store only has to decide when to persist. Every guard,
 * clamp and repair is the app's, including the ones that exist to survive a
 * save written against different content.
 */

/**
 * The order the nine players are asked for on a given day.
 *
 * Seeded on the puzzle and the day together, so the sequence holds across
 * sessions and differs between days that share a grid. `DartRandom` is a port
 * of Dart's generator rather than a stand-in — the permutation is whatever that
 * generator emits, and any other one would be a different puzzle.
 */
export function cellOrderFor(puzzle: BingoPuzzle, dayKey: string): string[] {
  const ids = puzzle.cells.map((cell) => cell.id);
  return dartShuffle(ids, new DartRandom(stableSeed(`${puzzle.id}:${dayKey}`)));
}

/** A fresh day: full lifelines, nothing solved, the order already drawn. */
export function newProgressForDay(
  firstUnlockDayKey: string,
  dayKey: string,
): BingoProgress {
  const puzzle = bingoPuzzleForDayIndex(dayIndexFor(firstUnlockDayKey, dayKey));
  return {
    puzzleId: puzzle.id,
    startedAt: (parseDayKey(dayKey) ?? new Date()).getTime(),
    solvedCellIds: [],
    currentIndex: 0,
    lifelines: startingLifelines,
    completed: false,
    cellOrderIds: cellOrderFor(puzzle, dayKey),
    elapsedSeconds: 0,
  };
}

/**
 * Repairs a stored order: drops ids the puzzle no longer has, drops repeats,
 * and tops up anything missing from a freshly drawn order.
 */
function safeCellOrder(
  progress: BingoProgress,
  puzzle: BingoPuzzle,
  dayKey: string,
): string[] {
  const cellIds = new Set(puzzle.cells.map((cell) => cell.id));
  const seen = new Set<string>();
  const order: string[] = [];
  for (const id of progress.cellOrderIds) {
    if (!cellIds.has(id) || seen.has(id)) continue;
    seen.add(id);
    order.push(id);
  }
  if (order.length === cellIds.size) return order;

  const missing = new Set([...cellIds].filter((id) => !seen.has(id)));
  return [...order, ...cellOrderFor(puzzle, dayKey).filter((id) => missing.has(id))];
}

/**
 * Brings one day's progress back into agreement with the content it claims.
 *
 * A save can outlive the grid it was written against, so solved ids the puzzle
 * no longer holds are dropped and the completed flag is recomputed from what
 * survived rather than trusted.
 */
export function safeProgress(
  progress: BingoProgress,
  dayKey: string,
  firstUnlockDayKey?: string,
): BingoProgress {
  const fallback =
    firstUnlockDayKey === undefined
      ? bingoPuzzleFor(progress.puzzleId)
      : bingoPuzzleForDayIndex(dayIndexFor(firstUnlockDayKey, dayKey));
  const puzzle =
    progress.puzzleId === "" ? fallback : bingoPuzzleFor(progress.puzzleId);

  const known = new Set(puzzle.cells.map((cell) => cell.id));
  const solvedCellIds = progress.solvedCellIds.filter((id) => known.has(id));

  return {
    ...progress,
    puzzleId: puzzle.id,
    startedAt: (parseDayKey(dayKey) ?? new Date(progress.startedAt)).getTime(),
    solvedCellIds,
    currentIndex: solvedCellIds.length,
    lifelines: Math.min(Math.max(progress.lifelines, 0), 99),
    completed: solvedCellIds.length === puzzle.cells.length,
    cellOrderIds: safeCellOrder(progress, puzzle, dayKey),
  };
}

/** Opens every day between the season's first and today, and repairs them all. */
export function withUnlockedDays(archive: BingoArchive, now: Date): BingoArchive {
  const todayKey = dayKeyFor(now);
  const firstKey =
    archive.firstUnlockDayKey === "" ? todayKey : archive.firstUnlockDayKey;

  const progressByDay: Record<string, BingoProgress> = { ...archive.progressByDay };
  for (const dayKey of unlockedDayKeys(firstKey, now)) {
    if (progressByDay[dayKey] === undefined) {
      progressByDay[dayKey] = newProgressForDay(firstKey, dayKey);
    }
  }

  const repaired: Record<string, BingoProgress> = {};
  for (const [dayKey, progress] of Object.entries(progressByDay)) {
    repaired[dayKey] = safeProgress(progress, dayKey, firstKey);
  }

  return {
    contentVersion,
    firstUnlockDayKey: firstKey,
    progressByDay: repaired,
  };
}

/**
 * What to start from, given whatever was in storage.
 *
 * A save from an older content version is not migrated: the first season's
 * grids had intersections that were never career-checked, and attaching those
 * solutions to today's data would credit answers to the wrong players. A clean
 * season beginning today is the honest outcome, and it is what the app does.
 */
export function hydrateArchive(stored: BingoArchive | null, now: Date): BingoArchive {
  const todayKey = dayKeyFor(now);

  if (
    stored !== null &&
    stored.contentVersion === contentVersion &&
    stored.firstUnlockDayKey !== ""
  ) {
    return withUnlockedDays(stored, now);
  }

  return withUnlockedDays(
    {
      contentVersion,
      firstUnlockDayKey: todayKey,
      progressByDay: { [todayKey]: newProgressForDay(todayKey, todayKey) },
    },
    now,
  );
}

/* ---- Reading a day -------------------------------------------------------- */

export function solvedSet(progress: BingoProgress): Set<string> {
  return new Set(progress.solvedCellIds);
}

/**
 * The cell the active player belongs in — the first unsolved one in the day's
 * order. Null once the grid is finished, and on an archived day, where the
 * board is a read-only record rather than a puzzle.
 */
export function currentCell(
  puzzle: BingoPuzzle,
  progress: BingoProgress,
  readOnly: boolean,
): BingoCell | null {
  if (progress.completed || readOnly) return null;
  const solved = solvedSet(progress);
  const order =
    progress.cellOrderIds.length === 0
      ? puzzle.cells.map((cell) => cell.id)
      : progress.cellOrderIds;
  for (const cellId of order) {
    const cell = puzzle.cells.find((candidate) => candidate.id === cellId);
    if (cell === undefined || solved.has(cell.id)) continue;
    return cell;
  }
  return null;
}

/** How many days in the whole archive have been finished. */
export function completedCount(archive: BingoArchive): number {
  return Object.values(archive.progressByDay).filter((day) => day.completed).length;
}

/** Whether the day is stalled on an empty lifeline bar. */
export function needsLifeline(progress: BingoProgress): boolean {
  return !progress.completed && progress.lifelines <= 0;
}

/* ---- Playing a day -------------------------------------------------------- */

export type SelectionResult = {
  progress: BingoProgress;
  correct: boolean;
};

/**
 * One tap on the grid.
 *
 * A hit solves the cell and advances; a miss spends a lifeline and nothing
 * else — the player keeps the same active player and tries again. Returns null
 * when the tap should not count at all.
 */
export function applySelection(
  progress: BingoProgress,
  puzzle: BingoPuzzle,
  cellId: string,
  readOnly: boolean,
): SelectionResult | null {
  if (readOnly || progress.completed || needsLifeline(progress)) return null;
  const target = currentCell(puzzle, progress, readOnly);
  if (target === null) return null;

  if (cellId === target.id) {
    const solvedCellIds = [...new Set([...progress.solvedCellIds, cellId])];
    return {
      correct: true,
      progress: {
        ...progress,
        solvedCellIds,
        currentIndex: solvedCellIds.length,
        completed: solvedCellIds.length >= puzzle.cells.length,
      },
    };
  }

  return {
    correct: false,
    progress: {
      ...progress,
      lifelines: Math.min(Math.max(progress.lifelines - 1, 0), 99),
    },
  };
}

/** What twenty-five coins buys: one more life, not a full bar. */
export function grantLifeline(progress: BingoProgress): BingoProgress {
  return { ...progress, lifelines: 1 };
}

/**
 * Whether solving this cell finished a row or a column — the beat the app plays
 * its line cue on.
 */
export function completedLineAt(
  puzzle: BingoPuzzle,
  progress: BingoProgress,
  cellId: string,
): boolean {
  const cell = puzzle.cells.find((candidate) => candidate.id === cellId);
  if (cell === undefined) return false;
  const solved = solvedSet(progress);
  const rowDone = puzzle.cells
    .filter((candidate) => candidate.rowId === cell.rowId)
    .every((candidate) => solved.has(candidate.id));
  const columnDone = puzzle.cells
    .filter((candidate) => candidate.columnId === cell.columnId)
    .every((candidate) => solved.has(candidate.id));
  return rowDone || columnDone;
}
