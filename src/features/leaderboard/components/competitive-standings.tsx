"use client";

import { TrophyIcon } from "@statoz/design-system/games";
import { RivalAvatar } from "./rank-parts";
import type { LeaderboardPeriod, LeaderboardStanding } from "../types";
import styles from "./competitive.module.css";

export function RankChange({ movement, period }: { movement: number | null; period: LeaderboardPeriod }) {
  const comparison = period === "weekly" ? "last week" : "last season";
  const description = movement === null ? `New since ${comparison}` : movement === 0 ? `Unchanged since ${comparison}` : `${movement > 0 ? "Up" : "Down"} ${Math.abs(movement)} since ${comparison}`;
  return <span className={styles.change} data-direction={movement === null ? "new" : movement > 0 ? "up" : movement < 0 ? "down" : "same"} aria-label={description}>
    <span aria-hidden="true">{movement === null ? "NEW" : movement === 0 ? "—" : `${movement > 0 ? "↑" : "↓"} ${Math.abs(movement)}`}</span>
  </span>;
}

export function CompetitiveStandings({ entries, period, master, onOpen, onContributions }: {
  entries: LeaderboardStanding[]; period: LeaderboardPeriod; master: boolean;
  onOpen: (entry: LeaderboardStanding) => void; onContributions: (entry: LeaderboardStanding) => void;
}) {
  return <div className={styles.standings}>
    <div className={styles.tableHeading} aria-hidden="true"><span>RANK</span><span>PLAYER</span><span>RP</span><span>CHANGE</span></div>
    <ol className={styles.rankList} aria-label="Leaderboard standings" start={entries[0]?.rank ?? 1}>
      {entries.map((entry) => <li key={entry.id} value={entry.rank} className={styles.rankRow} data-rank={entry.rank} data-rp={entry.rp} data-self={entry.isUser || undefined} data-participant={entry.id}>
        <span className={styles.rankNumber} aria-label={`Rank ${entry.rank}`}>{entry.rank <= 3 && <TrophyIcon size={15} aria-hidden="true" />}<b>{entry.rank}</b></span>
        <div className={styles.playerCell}>
          <button type="button" className={styles.playerButton} onClick={() => onOpen(entry)} aria-label={entry.isUser ? `Open your profile, ${entry.name}` : `View ${entry.name}'s profile`}>
            <RivalAvatar name={entry.name} size={32} src={entry.avatarSrc} frameColor={entry.frameColor} highlight={entry.isUser} />
            <span className={styles.playerCopy}><strong>{entry.name} {entry.isUser && <small className={styles.youTag}>YOU</small>}</strong></span>
          </button>
          <span className={styles.mobileChange}><RankChange movement={entry.movement} period={period} /></span>
        </div>
        <div className={styles.pointsCell}>
          {master ? <button type="button" className={styles.pointsAction} onClick={() => onContributions(entry)} aria-label={`View ${entry.name}'s Master contributions: ${entry.rp.toLocaleString("en-US")} RP`}><strong className="ds-tabular">{entry.rp.toLocaleString("en-US")}</strong><span aria-hidden="true">↗</span></button> : <strong className="ds-tabular"><span className="sr-only">Rank Points: </span>{entry.rp.toLocaleString("en-US")}</strong>}
        </div>
        <div className={styles.desktopChange}><RankChange movement={entry.movement} period={period} /></div>
      </li>)}
    </ol>
    {entries.length === 0 && <div className={styles.emptyState}><TrophyIcon size={32} /><h3>The climb starts here</h3><p>No rankings for this period. Choose another board.</p></div>}
  </div>;
}

export function StandingsLoading() {
  return <div role="status" aria-label="Loading leaderboard" className={styles.loading}><span>Preparing the field…</span>{Array.from({ length: 6 }, (_, index) => <div key={index} className={styles.skeleton} />)}</div>;
}
