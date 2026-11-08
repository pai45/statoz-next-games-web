import { gameSportModuleFor, type GameSport } from "@/domain/game-sports";
import { sportGamesInDeckOrder } from "../home-catalog";
import { GameLibrary } from "./game-library";

export function SportGameDeck({sport}:{sport:GameSport}) {
  const label = gameSportModuleFor(sport).label;
  return <GameLibrary games={sportGamesInDeckOrder(sport)} label={`${label} games`} collection={label.toUpperCase()} />;
}
