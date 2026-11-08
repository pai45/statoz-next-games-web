import type { PlayerCard } from "@/domain/cards";
import type { Sport } from "@/domain/sports";
import {
  basketballPlayerCards,
  cricketPlayerCards,
  footballPlayerCards,
} from "@/mocks/packs";

import {
  basketballGuessTimelines,
  cricketGuessTimelines,
  footballGuessTimelines,
  type GuessPlayerTimeline,
} from "../data/timelines";
import type { GuessPlayerPuzzle } from "../types";

import {
  buildPuzzles,
  puzzleForDay,
  scheduledPuzzles,
  validateDeck,
} from "./puzzles";

/**
 * One deck per sport, built once.
 *
 * The app builds a repository each time the screen is opened; here the result
 * is cached, because it is a pure function of two frozen data tables and the
 * search, the schedule, and every archived day all read it.
 *
 * Only the three sports the app ships a route table for are playable. Tennis
 * and motorsport have their own mysteries — Guess the Winner and Guess the
 * Driver — with their own puzzles, so they are absent here rather than empty.
 */

/** The sports Guess The Player covers. */
export type GuessPlayerSport = "football" | "cricket" | "basketball";

const sources: Record<
  GuessPlayerSport,
  { timelines: GuessPlayerTimeline[]; players: PlayerCard[] }
> = {
  football: { timelines: footballGuessTimelines, players: footballPlayerCards },
  cricket: { timelines: cricketGuessTimelines, players: cricketPlayerCards },
  basketball: {
    timelines: basketballGuessTimelines,
    players: basketballPlayerCards,
  },
};

export function isGuessPlayerSport(sport: Sport): sport is GuessPlayerSport {
  return sport === "football" || sport === "cricket" || sport === "basketball";
}

export type GuessPlayerDeck = {
  sport: GuessPlayerSport;
  /** Every player the search can reach, which is the whole sport's pool. */
  players: PlayerCard[];
  /** The deck in build order. */
  puzzles: GuessPlayerPuzzle[];
  /** The same puzzles in the order the calendar deals them. */
  scheduled: GuessPlayerPuzzle[];
  /** Empty when the data is sound; the app refuses to open a day otherwise. */
  issues: string[];
};

const cache = new Map<GuessPlayerSport, GuessPlayerDeck>();

export function deckFor(sport: GuessPlayerSport): GuessPlayerDeck {
  const cached = cache.get(sport);
  if (cached !== undefined) return cached;

  const { timelines, players } = sources[sport];
  const puzzles = buildPuzzles(sport, timelines, players);
  const deck: GuessPlayerDeck = {
    sport,
    players,
    puzzles,
    scheduled: scheduledPuzzles(sport, puzzles),
    issues: validateDeck(sport, puzzles, players),
  };
  cache.set(sport, deck);
  return deck;
}

/** Today's puzzle for a sport, or null if the deck is empty. */
export function puzzleForDate(
  deck: GuessPlayerDeck,
  day: Date,
): GuessPlayerPuzzle | null {
  return puzzleForDay(deck.scheduled, day);
}

export function puzzleById(
  deck: GuessPlayerDeck,
  id: string,
): GuessPlayerPuzzle | null {
  return deck.puzzles.find((puzzle) => puzzle.id === id) ?? null;
}

export function playerById(
  deck: GuessPlayerDeck,
  id: string,
): PlayerCard | null {
  return deck.players.find((player) => player.id === id) ?? null;
}

/**
 * The puzzle an archived day was played on.
 *
 * A legacy record carries no puzzle id — v1 stored only a name — so it is
 * matched back through the player it named. Null means the route it was built
 * from is no longer in the deck, which is what the debrief's failure state is
 * for.
 */
export function puzzleForRecord(
  deck: GuessPlayerDeck,
  record: { puzzleId: string; targetPlayerName: string; legacy: boolean },
): GuessPlayerPuzzle | null {
  const direct = puzzleById(deck, record.puzzleId);
  if (direct !== null) return direct;
  if (record.legacy && record.targetPlayerName !== "") {
    const player = deck.players.find(
      (candidate) => candidate.name === record.targetPlayerName,
    );
    if (player !== undefined) {
      return deck.puzzles.find((puzzle) => puzzle.playerId === player.id) ?? null;
    }
  }
  return null;
}
