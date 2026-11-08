import type { Sport } from "@/domain/sports";

/**
 * Guess The Player's shapes, from `models/guess_player.dart`.
 *
 * One product serves football, cricket, and basketball: the puzzles, the pool
 * searched, and one of the two hint labels change with the sport; nothing else
 * does. The archive is keyed per sport for that reason.
 */

/** How hard a puzzle is billed. Assigned by position in the deck, not by route. */
export type GuessPlayerDifficulty = "easy" | "medium" | "hard";

/**
 * Every clue is a career stop. The app models other kinds — debut, role, nation
 * — and its own validator rejects a puzzle that carries one, so the route is
 * the whole of the intel a run is given for free.
 */
export type GuessPlayerClueKind = "career";

/** The two profile scans coins can buy, outside the route. */
export type GuessPlayerHintType = "position" | "affiliation";

export type GuessPlayerClue = {
  kind: GuessPlayerClueKind;
  /** `CAREER ORIGIN`, `CAREER MOVE 3`, or a padded `CAREER ARCHIVE 5`. */
  label: string;
  /** The club, upper-cased. */
  value: string;
  /** The year the spell began. Null on a padded marker. */
  year: number | null;
  /** The year before the next move, so a spell reads as a span. */
  endYear: number | null;
};

export type GuessPlayerPuzzle = {
  /** `<sport>-<playerId>`. */
  id: string;
  sport: Sport;
  playerId: string;
  difficulty: GuessPlayerDifficulty;
  /** Always six. */
  clues: GuessPlayerClue[];
};

/**
 * How a day ended.
 *
 * `lost` is in the app's enum but never written by it — a run with no attempts
 * left stays in progress until the player buys a guess or gives up. It is kept
 * so an older save carrying it still reads back.
 */
export type GuessPlayerResultStatus =
  | "inProgress"
  | "won"
  | "lost"
  | "gaveUp"
  | "expired"
  | "legacy";

/** One day of one sport. */
export type GuessPlayerDayRecord = {
  dayKey: string;
  puzzleId: string;
  playerId: string;
  /** Kept so a legacy record can still name who it was about. */
  targetPlayerName: string;
  status: GuessPlayerResultStatus;
  guessedPlayerIds: string[];
  /** 1–6. One more clue is decrypted with every miss. */
  revealedClueCount: number;
  attemptsRemaining: number;
  score: number;
  xpEarned: number;
  elapsedMs: number;
  /** Epoch ms; zero until the day is first opened. */
  startedAtEpochMs: number;
  completedAtEpochMs: number;
  /** Scans bought, by name. */
  revealedHintTypes: GuessPlayerHintType[];
  /** A record migrated from the v1 contract, which stored far less. */
  legacy: boolean;
};

/** Every day this browser has played, for one sport. */
export type GuessPlayerArchive = {
  resultsByDay: Record<string, GuessPlayerDayRecord>;
};

/** Which of the three screens is showing. */
export type GuessPlayerView = "home" | "play" | "logs" | "review";

/** What the last submission was. Drives the one-shot cues, not the layout. */
export type GuessPlayerFeedback = "none" | "wrong" | "correct" | "duplicate";
