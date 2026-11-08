import type { GameSport } from '@/domain/game-sports';
import { isGameEnabled } from "@/domain/demo-product";
import type { Sport } from "@/domain/sports";

import { gameRegistry } from "./game-registry";
import type { GameId } from "@/features/games/types";

/**
 * Every game a sport offers, in the order its deck lists them. Heroes lead,
 * quick games follow — the deck reads the `kind` off the registry rather than
 * keeping two lists, so a game can be promoted by editing one field.
 */
const sourceDecks: Record<GameSport, GameId[]> = {
  archery: ["longbow", "archery-test", "holdover"],
  golf: ["open-golf"],
  football: [
    "penalty-cup",
    "football-shooting",
    "penalty-shooters-2",
    "soccer-real",
    "pitch-rush",
    "final-third",
    "retro-football",
    "retro-football-2",
    "pitch-duel",
    "penalty-shootout",
    "football-chess",
    "football-quiz",
    "football-bingo",
    "guess-player",
  ],
  cricket: ["cricketer", "yorker", "stick-cricket", "retro-innings", "stadium-cricket", "cricket-quiz", "cricket-guess-player"],
  basketball: ["hoop-legacy", "rim-rush", "retro-hoops", "vibe-basketball", "hoop-duel", "basketball-quiz", "basketball-guess-player"],
  tennis: ["tennis-bits", "tennis-rally", "tennis-quiz", "tennis-guess-winner"],
  motorsport: ["f1-racing", "portfolio-formula", "retro-circuit", "grand-prix-dash", "motorsport-quiz", "guess-driver"],
};

export const sportGameDecks = Object.fromEntries(Object.entries(sourceDecks).map(([sport, games]) => [sport, games.filter(isGameEnabled)])) as Record<GameSport, GameId[]>;

export type SportDeck = {
  sport: GameSport;
  heroes: GameId[];
  quick: GameId[];
};

/** A sport's deck, split into the two shelves it renders as. */
export function deckFor(sport: GameSport): SportDeck {
  const games = sportGameDecks[sport];
  return {
    sport,
    heroes: games.filter((id) => gameRegistry[id].kind === "hero"),
    quick: games.filter((id) => gameRegistry[id].kind === "quick"),
  };
}

/** Small summary used by the shared All Sports picker. */
export function gameCountForSport(sport: GameSport): number {
  return sportGameDecks[sport].length;
}

/**
 * Which sport a game belongs to, inverted from the decks above so the two can
 * never disagree about it.
 */
const sportByGame: Record<GameId, GameSport> = {"final-over":"cricket", ...Object.fromEntries(
  Object.entries(sportGameDecks).flatMap(([sport, games]) =>
    games.map((id) => [id, sport as GameSport] as const),
  ),
)} as Record<GameId, GameSport>;

export function gameSportFor(game: GameId): GameSport {
  return sportByGame[game];
}

export function sportForGame(game: GameId): Sport {
  const sport = sportByGame[game];
  if (sport === "golf" || sport === "archery") throw new Error("This game category does not use a card-sport deck.");
  return sport;
}
