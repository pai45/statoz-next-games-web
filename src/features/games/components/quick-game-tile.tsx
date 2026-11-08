import type { GameEntry } from "@/mocks/games";
import type { GameId } from "../types";
import { DiscoveryGameTile } from "./discovery-game-tile";
import styles from "./discovery-card.module.css";

export type QuickGameTileProps = { game: GameId; entry: GameEntry; index?: number; live?: boolean };
export function QuickGameTile({ game, entry, index, live }: QuickGameTileProps) {
  return <div className={styles.card} data-discovery-card={game}><DiscoveryGameTile game={game} entry={entry} index={index} live={live} /></div>;
}
