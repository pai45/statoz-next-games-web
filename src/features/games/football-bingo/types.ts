/**
 * Football Bingo's vocabulary — the web port of `models/football_bingo.dart`.
 *
 * A puzzle is a 3×3 grid of club-by-club intersections; a cell names the one
 * player who turned out for both. Progress is per day, and the archive holds
 * every day the player has unlocked.
 */

/** One senior spell in a career. */
export type BingoClubSpell = {
  clubId: string;
  label: string;
};

/** A verified senior-club record. Academy and reserve spells are excluded. */
export type BingoCareer = {
  playerId: string;
  name: string;
  shortName: string;
  clubHistory: readonly BingoClubSpell[];
};

/** One club axis, down the side of the grid or across its top. */
export type BingoAxis = {
  id: string;
  label: string;
  shortLabel: string;
};

/** One intersection, and the player who satisfies it. */
export type BingoCell = {
  id: string;
  rowId: string;
  columnId: string;
  playerId: string;
};

/** One authored day. */
export type BingoPuzzle = {
  id: string;
  title: string;
  rows: readonly BingoAxis[];
  columns: readonly BingoAxis[];
  cells: readonly BingoCell[];
};

/** What one day's attempt has come to. */
export type BingoProgress = {
  puzzleId: string;
  /** Local midnight of the day this progress belongs to, in epoch millis. */
  startedAt: number;
  solvedCellIds: readonly string[];
  currentIndex: number;
  lifelines: number;
  completed: boolean;
  /**
   * The order the nine players are asked for, shuffled once per puzzle and day
   * so the sequence is stable across sessions.
   */
  cellOrderIds: readonly string[];
  elapsedSeconds: number;
};

/** Every unlocked day, and the day the season was first opened. */
export type BingoArchive = {
  contentVersion: number;
  firstUnlockDayKey: string;
  progressByDay: Readonly<Record<string, BingoProgress>>;
};

/** Whether today's grid is playable, and how long until it is if not. */
export type BingoStatus = {
  ready: boolean;
  /** Milliseconds until the next local midnight; zero when ready. */
  remainingMs: number;
};
