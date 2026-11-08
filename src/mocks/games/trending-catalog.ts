import { isGameEnabled } from "@/domain/demo-product";
import type { GamesTrendingTileConfig } from "@/features/games/types";

/**
 * The curated arcade feed. Order is the reading order; the bento packs the
 * tiles into whichever cells they fit.
 */
const sourceCatalog: GamesTrendingTileConfig[] = [
  { id: "trend-game-retro-hoops", sourceId: "retro-hoops", sport: "basketball", span: "square" },
  { id: "trend-game-retro-circuit", sourceId: "retro-circuit", sport: "motorsport", span: "square" },
  { id: "trend-game-retro-football", sourceId: "retro-football", sport: "football", span: "wide" },
  {id:"trend-game-open-golf",sourceId:"open-golf",sport:"golf",span:"wide"},
  { id: "trend-game-retro-innings", sourceId: "retro-innings", sport: "cricket", span: "wide" },
  {
    id: "trend-game-pitch-duel",
    sourceId: "pitch-duel",
    sport: "football",
    span: "square",
  },
  {
    id: "trend-game-penalty",
    sourceId: "penalty-shootout",
    sport: "football",
    span: "square",
  },
  {
    id: "trend-game-football-chess",
    sourceId: "football-chess",
    sport: "football",
    span: "tall",
  },
  {
    id: "trend-game-football-quiz",
    sourceId: "football-quiz",
    sport: "football",
    span: "square",
  },
  {
    id: "trend-game-football-bingo",
    sourceId: "football-bingo",
    sport: "football",
    span: "square",
  },
  {
    id: "trend-game-guess-player",
    sourceId: "guess-player",
    sport: "football",
    span: "wide",
  },
  {
    id: "trend-game-stadium-cricket",
    sourceId: "stadium-cricket",
    sport: "cricket",
    span: "wide",
  },
  {
    id: "trend-game-hoop-duel",
    sourceId: "hoop-duel",
    sport: "basketball",
    span: "square",
  },
  {
    id: "trend-game-grand-prix",
    sourceId: "grand-prix-dash",
    sport: "motorsport",
    span: "square",
  },
  {
    id: "trend-game-tennis-rally",
    sourceId: "tennis-rally",
    sport: "tennis",
    span: "wide",
  },
];

export const gamesTrendingCatalog = sourceCatalog.filter(item => isGameEnabled(item.sourceId));
