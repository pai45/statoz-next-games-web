import { gameRegistry } from "@/mocks/games";
import { libraryCardLayout, liveCardCount } from "../home-catalog";
import type { GameId } from "../types";
import { QuickGameTile } from "./quick-game-tile";
import styles from "./game-library.module.css";

export type GameLibraryProps = {
  games: GameId[];
  /** Accessible name of the section, e.g. "All games". */
  label: string;
  /** Short collection name shown in the `//` tag, e.g. "GAME LIBRARY". */
  collection: string;
};

/** The bento library of holo cartridges under the featured banner. */
export function GameLibrary({ games, label, collection }: GameLibraryProps) {
  const count = games.length;
  return <section aria-label={label} className={styles.library}>
    <header className={styles.head}>
      <span className={styles.tag}>{`// ${collection} · ${count} ${count === 1 ? "GAME" : "GAMES"}`}</span>
      <h2 className={styles.title}>PICK YOUR <span className={styles.grad}>GAME</span></h2>
    </header>
    <ul className={styles.grid}>
      {games.map((id, index) => {
        const layout = libraryCardLayout(count, index);
        const className = [styles.item, layout.feature && styles.feature, layout.wide && styles.wide].filter(Boolean).join(" ");
        return <li key={id} className={className}><QuickGameTile game={id} entry={gameRegistry[id]} index={index} live={index < liveCardCount} /></li>;
      })}
    </ul>
  </section>;
}
