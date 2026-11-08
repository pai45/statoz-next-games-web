import { gameSportFor } from '@/mocks/games/sport-decks';
import type { GameId } from '../types';

export const bundledGameIds: readonly GameId[] = [
  "hoop-legacy", "penalty-cup", "cricketer", "yorker",
  'stick-cricket', 'archery-test', 'longbow', 'holdover', 'rim-rush',
  'tennis-bits', 'soccer-real', 'f1-racing', 'portfolio-formula',
  'pitch-rush',
];

export const isBundledGame = (game: GameId) => bundledGameIds.includes(game);
export const gameHubHref = (game: GameId) => `/games/${gameSportFor(game)}`;
