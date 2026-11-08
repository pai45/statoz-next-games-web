"use client";

import Image from "next/image";
import { useState } from "react";
import { CheckIcon, SearchField, TrophyIcon } from "@statoz/design-system/games";
import { gameCoverPath } from "@/features/games/home-catalog";
import { gameRegistry } from "@/mocks/games";
import { publicAsset } from "@/shared/config";
import { leaderboardGameIds } from "../catalog";
import type { LeaderboardLadder } from "../types";
import styles from "./competitive.module.css";

export function BoardPicker({ selected, onSelect }: { selected: LeaderboardLadder; onSelect: (ladder: LeaderboardLadder) => void }) {
  const [query, setQuery] = useState("");
  const games = leaderboardGameIds.filter((game) => gameRegistry[game].title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <nav aria-label="Leaderboard boards" className={styles.picker}>
    <button type="button" className={`${styles.boardOption} ${styles.masterOption}`} aria-current={selected === "master" ? "page" : undefined} onClick={() => onSelect("master")}>
      <span className={styles.masterIcon}><TrophyIcon size={23} /></span>
      <span className={styles.optionCopy}><strong>MASTER</strong></span>
      {selected === "master" && <CheckIcon size={16} />}
    </button>
    <SearchField label="Search leaderboard games" placeholder="Find a game" value={query} onChange={(event) => setQuery(event.target.value)} onClear={() => setQuery("")} />
    <div className={styles.gameList}>
      {games.map((game) => <button type="button" key={game} className={styles.boardOption} aria-current={selected === game ? "page" : undefined} onClick={() => onSelect(game)}>
        <span className={styles.gameCover}><Image src={publicAsset(gameCoverPath(game))} alt="" fill sizes="40px" /></span>
        <span className={styles.optionCopy}><strong>{gameRegistry[game].title}</strong></span>
        {selected === game && <CheckIcon size={16} />}
      </button>)}
      {games.length === 0 && <p className={styles.emptySearch} role="status">No games match. Try another name.</p>}
    </div>
  </nav>;
}
