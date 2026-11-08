import type { PlayerCard } from "@/domain/cards";
import type { Sport } from "@/domain/sports";

import { minimumDeckSize, scheduleEpochUtc, scheduleVersion } from "../constants";
import { compareStrings } from "./compare";
import type { GuessPlayerTimeline } from "../data/timelines";
import type {
  GuessPlayerClue,
  GuessPlayerDifficulty,
  GuessPlayerPuzzle,
} from "../types";

/**
 * The daily deck — `LocalGuessPlayerPuzzleRepository` and its two builders.
 *
 * Nothing here is authored as a puzzle. A deck is derived: the authored career
 * routes pick the players, the route becomes six clues, and a hash of the id
 * fixes the order those puzzles come round in. That is why this is ported
 * rather than pre-computed — the derivation is the schedule, and a card pool
 * edited on either side has to move both in the same way.
 */

/**
 * FNV-1a over UTF-16 units, masked to 32 bits, exactly as the app writes it.
 *
 * `Math.imul` is doing real work: the product overshoots `Number.MAX_SAFE_INTEGER`
 * before the mask, so a plain `*` would round it and the daily order would come
 * out different from the app's.
 */
export function stableHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash ^ value.charCodeAt(index)) >>> 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

function difficultyFor(index: number): GuessPlayerDifficulty {
  const step = index % 3;
  if (step === 0) return "easy";
  if (step === 1) return "medium";
  return "hard";
}

/**
 * Six clues for one player: their route, then neutral markers to fill the rest.
 *
 * A short career would otherwise leave a run with fewer decrypts than guesses.
 * The markers say the route is complete rather than inventing a stat, which is
 * what keeps a padded puzzle honest.
 */
function puzzleFor(
  sport: Sport,
  player: PlayerCard,
  timeline: GuessPlayerTimeline | undefined,
  index: number,
): GuessPlayerPuzzle {
  const clues: GuessPlayerClue[] = [];

  const add = (clue: GuessPlayerClue) => {
    if (clues.length >= 6) return;
    const duplicate = clues.some(
      (item) =>
        item.kind === clue.kind &&
        item.value === clue.value &&
        item.year === clue.year,
    );
    if (!duplicate) clues.push(clue);
  };

  const career = timeline?.career ?? [];
  for (let stop = 0; stop < career.length; stop += 1) {
    const spell = career[stop];
    const nextStart = stop + 1 < career.length ? career[stop + 1].startYear : null;
    add({
      kind: "career",
      label: stop === 0 ? "CAREER ORIGIN" : `CAREER MOVE ${stop + 1}`,
      value: spell.clubName.toUpperCase(),
      year: spell.startYear,
      endYear: nextStart === null ? null : Math.max(spell.startYear, nextStart - 1),
    });
  }

  while (clues.length < 6) {
    clues.push({
      kind: "career",
      label: `CAREER ARCHIVE ${clues.length + 1}`,
      value: `ROUTE COMPLETE // ${clues.length + 1}`,
      year: null,
      endYear: null,
    });
  }

  return {
    id: `${sport}-${player.id}`,
    sport,
    playerId: player.id,
    difficulty: difficultyFor(index),
    clues: clues.slice(0, 6),
  };
}

/**
 * The deck for a sport: every authored route that matches a card, in the order
 * the routes are written, topped up by rating if that leaves fewer than thirty.
 */
export function buildPuzzles(
  sport: Sport,
  timelines: GuessPlayerTimeline[],
  players: PlayerCard[],
): GuessPlayerPuzzle[] {
  const byName = new Map<string, PlayerCard>();
  for (const player of players) byName.set(player.name, player);

  const selected: PlayerCard[] = [];
  const seen = new Set<string>();

  for (const timeline of timelines) {
    const player = byName.get(timeline.playerName);
    if (player !== undefined && !seen.has(player.id)) {
      seen.add(player.id);
      selected.push(player);
    }
  }

  // Unused while every sport authors thirty routes or more, and kept anyway:
  // it is what stops a deleted route from shortening the rotation.
  const ranked = [...players].sort((a, b) =>
    b.rating !== a.rating ? b.rating - a.rating : compareStrings(a.name, b.name),
  );
  for (const player of ranked) {
    if (selected.length >= minimumDeckSize) break;
    if (seen.has(player.id)) continue;
    seen.add(player.id);
    selected.push(player);
  }

  return selected.map((player, index) =>
    puzzleFor(
      sport,
      player,
      timelines.find((timeline) => timeline.playerName === player.name),
      index,
    ),
  );
}

/**
 * The rotation order. Sorting by a hash of the id rather than by the deck order
 * means the routes come round in a sequence no one can read off the data file,
 * and the id tie-break keeps it total.
 */
export function scheduledPuzzles(
  sport: Sport,
  puzzles: GuessPlayerPuzzle[],
): GuessPlayerPuzzle[] {
  const keyed = puzzles.map((puzzle) => ({
    puzzle,
    hash: stableHash(`${scheduleVersion}:${sport}:${puzzle.id}`),
  }));
  keyed.sort((a, b) =>
    a.hash !== b.hash ? a.hash - b.hash : compareStrings(a.puzzle.id, b.puzzle.id),
  );
  return keyed.map((entry) => entry.puzzle);
}

/**
 * Which puzzle a date is dealt.
 *
 * Counted in whole UTC days from 1 January 2024 against the *local* calendar
 * date, so the day turns over at the player's own midnight while the count
 * itself is immune to the offset. Negative counts are folded back into range,
 * which is what lets an archived day from before the epoch still resolve.
 */
export function puzzleForDay(
  scheduled: GuessPlayerPuzzle[],
  day: Date,
): GuessPlayerPuzzle | null {
  if (scheduled.length === 0) return null;
  const normalized = Date.UTC(day.getFullYear(), day.getMonth(), day.getDate());
  const days = Math.trunc((normalized - scheduleEpochUtc) / 86_400_000);
  const index = ((days % scheduled.length) + scheduled.length) % scheduled.length;
  return scheduled[index];
}

/**
 * The app's own deck check, run before a day is opened.
 *
 * It is not a test: a card renamed in the pool silently drops a route, and this
 * is what turns that into the error screen instead of a puzzle whose clues do
 * not describe the answer.
 */
export function validateDeck(
  sport: Sport,
  puzzles: GuessPlayerPuzzle[],
  players: PlayerCard[],
): string[] {
  const issues: string[] = [];
  if (puzzles.length < minimumDeckSize) {
    issues.push(
      `${sport} requires ${minimumDeckSize} puzzles; found ${puzzles.length}.`,
    );
  }

  const counts = (["easy", "medium", "hard"] as GuessPlayerDifficulty[]).map(
    (difficulty) =>
      puzzles.filter((puzzle) => puzzle.difficulty === difficulty).length,
  );
  if (Math.max(...counts) - Math.min(...counts) > 1) {
    issues.push(`${sport} puzzle difficulties are not balanced.`);
  }

  const ids = new Set<string>();
  const playerIds = new Set(players.map((player) => player.id));
  for (const puzzle of puzzles) {
    if (ids.has(puzzle.id)) issues.push(`Duplicate puzzle id: ${puzzle.id}.`);
    ids.add(puzzle.id);
    if (puzzle.sport !== sport) issues.push(`${puzzle.id} belongs to the wrong sport.`);
    if (!playerIds.has(puzzle.playerId)) {
      issues.push(`${puzzle.id} targets missing player ${puzzle.playerId}.`);
    }
    if (puzzle.clues.length !== 6) {
      issues.push(`${puzzle.id} must contain exactly six clues.`);
    }
    if (
      puzzle.clues.some(
        (clue) => clue.label.trim() === "" || clue.value.trim() === "",
      )
    ) {
      issues.push(`${puzzle.id} contains an empty clue.`);
    }
    if (puzzle.clues.some((clue) => clue.kind !== "career")) {
      issues.push(`${puzzle.id} contains non-career route intel.`);
    }

    const clueKeys = new Set(
      puzzle.clues.map(
        (clue) => `${clue.kind}:${clue.value.toLowerCase()}:${clue.year}`,
      ),
    );
    if (clueKeys.size !== puzzle.clues.length) {
      issues.push(`${puzzle.id} contains a repeated clue.`);
    }

    const player = players.find((candidate) => candidate.id === puzzle.playerId);
    const forbidden = player?.name.toLowerCase();
    if (
      forbidden !== undefined &&
      puzzle.clues.some((clue) => clue.value.toLowerCase().includes(forbidden))
    ) {
      issues.push(`${puzzle.id} contains the answer in a clue.`);
    }

    const years = puzzle.clues
      .map((clue) => clue.year)
      .filter((year): year is number => year !== null);
    for (let index = 1; index < years.length; index += 1) {
      if (years[index] < years[index - 1]) {
        issues.push(`${puzzle.id} career clues are not chronological.`);
        break;
      }
    }
  }

  return issues;
}
