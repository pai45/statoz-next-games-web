"use client";

import type { CSSProperties } from "react";
import { accentVar, rarityVar } from "@statoz/design-system/games";
import { ordinal } from "../arcade";
import type { LeaderboardStanding } from "../types";
import { RankPlate } from "./rank-plate";
import { RivalAvatar } from "./rank-parts";
import styles from "./podium.module.css";

const medals = [accentVar("gold"), rarityVar("silver"), rarityVar("bronze")] as const;

/** One canonical entry per winner, arranged 2–1–3 on stepped arcade platforms. */
export function ArcadePodium({ entries, master, onOpen, onContributions }: {
  entries: LeaderboardStanding[];
  master: boolean;
  onOpen: (entry: LeaderboardStanding) => void;
  onContributions: (entry: LeaderboardStanding) => void;
}) {
  if (entries.length < 3) return null;
  const [first, second, third] = entries;
  return <ol aria-label="Top three podium" className={styles.podium}>
    {[second, first, third].map((entry) => {
      const champion = entry.rank === 1;
      return <li key={entry.id} value={entry.rank} className={styles.column}
        data-rank={entry.rank} data-rp={entry.rp} data-self={entry.isUser || undefined} data-participant={entry.id}
        style={{ "--podium-medal": medals[entry.rank - 1], "--podium-delay": `${champion ? 120 : entry.rank === 2 ? 60 : 0}ms` } as CSSProperties}>
        <button type="button" className={styles.winner} onClick={() => onOpen(entry)}
          aria-label={entry.isUser ? `Open your profile, ${entry.name}` : `View ${entry.name}'s profile`}>
          <span className={styles.crownSlot}>{champion && <Crown />}</span>
          <span className={styles.portrait}><RivalAvatar name={entry.name} size={champion ? 80 : 60} ring={medals[entry.rank - 1]} src={entry.avatarSrc} frameColor={entry.frameColor} highlight={entry.isUser} /></span>
          <strong className={styles.name}>{entry.name} {entry.isUser && <small className={styles.youTag}>YOU</small>}</strong>
        </button>
        {master ? <button type="button" className={styles.score} data-podium-score onClick={() => onContributions(entry)} aria-label={`View ${entry.name}'s Master contributions: ${entry.rp.toLocaleString("en-US")} RP`}><span>{entry.rp.toLocaleString("en-US")}</span><small>RP</small><span className={styles.scoreArrow} aria-hidden="true">↗</span></button> : <span className={styles.score} data-podium-score>{entry.rp.toLocaleString("en-US")}<small>RP</small></span>}
        <RankPlate cut={10} borderColor="var(--podium-medal)" background="linear-gradient(180deg, color-mix(in srgb, var(--podium-medal) 24%, var(--ds-color-background-primary)), var(--ds-color-background-primary))" className={styles.platform}>
          <span className={styles.platformInner}><span className={styles.place}>{ordinal(entry.rank)}</span><span className={styles.platformStripes} aria-hidden="true" /></span>
        </RankPlate>
      </li>;
    })}
  </ol>;
}

function Crown() {
  return <svg aria-hidden="true" width="36" height="27" viewBox="0 0 30 22" className={styles.crown}>
    <path fill="currentColor" d="M2 6l6.5 5L15 2l6.5 9L28 6l-2.5 11h-21z" />
    <path fill="currentColor" d="M4.5 18.5h21v3h-21z" />
    <circle cx="15" cy="12" r="1.8" fill="var(--ds-color-background-primary)" />
  </svg>;
}
