import type { SportMatch } from "@/domain/matches";
import {
  formatKickoffDate,
  formatKickoffTime,
  formatOzCompact,
} from "@/shared/utils";

import { MatchCircleCta } from "./match-circle-cta";
import styles from "./match-detail.module.css";

export function MatchDetailContext({ match }: { match: SportMatch }) {
  const status = match.status === "live"
    ? `LIVE ${match.liveMinute ? `${match.liveMinute}'` : "NOW"}`
    : match.status === "finished"
      ? "FINAL"
      : "UPCOMING";

  return (
    <aside className={styles.contextRail} aria-label="Match context">
      <section className={styles.contextPanel}>
        <span className={styles.contextEyebrow}>MATCH INTEL</span>
        <h2>{match.leagueLabel}</h2>
        <dl className={styles.contextFacts}>
          <div><dt>STATUS</dt><dd>{status}</dd></div>
          <div><dt>START</dt><dd>{formatKickoffDate(match.kickoff)} · {formatKickoffTime(match.kickoff)}</dd></div>
          <div><dt>REWARD</dt><dd>UP TO {match.rewardXp} XP</dd></div>
          <div><dt>VOLUME</dt><dd>{formatOzCompact(match.volumeOz)} OZ</dd></div>
        </dl>
      </section>
      <MatchCircleCta match={match} />
    </aside>
  );
}
