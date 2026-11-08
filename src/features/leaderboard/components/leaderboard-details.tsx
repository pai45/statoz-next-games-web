"use client";

import { AdaptiveDrawer } from "@statoz/design-system/games";
import { gameRegistry } from "@/mocks/games";
import type { LeaderboardWindow } from "../periods";
import type { LeaderboardPeriod, LeaderboardStanding } from "../types";
import styles from "./competitive.module.css";

export function LeaderboardDetails({ open, participant, period, context, periodWindow, onClose }: {
  open: boolean; participant: LeaderboardStanding | null; period: LeaderboardPeriod; context: string; periodWindow: LeaderboardWindow | null; onClose: () => void;
}) {
  return <AdaptiveDrawer open={open} onClose={onClose} title={participant ? "MASTER CONTRIBUTIONS" : "HOW RANKING WORKS"} className={styles.drawer}>
    <div className={styles.details}>
      <span className={styles.eyebrow}>{context} · {period === "weekly" ? "WEEKLY" : "SEASON"}</span>
      {periodWindow && <p>Closes <time dateTime={new Date(periodWindow.end).toISOString()}>{new Date(periodWindow.end).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</time> in your local time.</p>}
      {participant ? <><h2>{participant.name}&apos;s best five</h2><p>Only these {participant.contributions.length} game scores count toward this Master standing.</p>
        <ol className={styles.contributionList}>{participant.contributions.map((result, index) => <li key={result.gameId}><span>{index + 1}</span><strong>{gameRegistry[result.gameId].title}</strong><b className="ds-tabular">{result.rp.toLocaleString("en-US")} RP</b></li>)}</ol>
        <div className={styles.contributionTotal}><span>MASTER TOTAL</span><strong>{participant.rp.toLocaleString("en-US")} RP</strong></div>
        <p>{participant.contributions.length}/5 contributing games. Missing game results count as zero.</p>
      </> : <><h2>Every game. One climb.</h2><p>Each game has its own Weekly and Season ladder, with scores on a fixed 0–1,000 Rank Points (RP) scale.</p>
        <h3>Your best five make Master</h3><p>Your five highest game scores in the selected period add up to your Master score, up to 5,000 RP. Missing results count as zero. Points do not depend on other players&apos; scores.</p>
        <h3>Clear periods, fresh standings</h3><p>Weekly boards reset Monday at 00:00 UTC. Seasons follow calendar quarters, beginning January 1, April 1, July 1, and October 1 at 00:00 UTC. Dates on the page use your device&apos;s timezone.</p>
        <h3>Reading the ladder</h3><p>Players rank by RP. Tied scores use stable participant IDs to assign unique places. Change compares with last week or last season; NEW means there was no result in that previous period. Matching another player&apos;s RP does not guarantee passing them.</p>
      </>}
      {!participant && <div className={styles.protocolNote}><strong>LOCAL EDITION</strong><p>This edition uses generated ranking snapshots. Rank Points are independent of profile XP and game saves. Weekly and Season use separate snapshots; playing a game does not change these points.</p></div>}
    </div>
  </AdaptiveDrawer>;
}
