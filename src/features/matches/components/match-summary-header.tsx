import { typography } from "@statoz/design-system/games/tokens/typography";
import type { SportMatch, SportTeam } from "@/domain/matches";
import { formatKickoffTime } from "@/shared/utils";

import styles from "./match-detail.module.css";
import { TeamBadge } from "./team-badge";

/**
 * The fixture, above the tabs: the clock or the minute, the two badges either
 * side of the score, and the teams' colours as a split rule under them.
 *
 * Cricket reads differently and says so — an innings does not fit a score
 * slot, so it sits under each side's name and the middle carries only "vs".
 */
export function MatchSummaryHeader({ match }: { match: SportMatch }) {
  if (match.sport === "motorsport") {
    return <GrandPrixSummary match={match} />;
  }

  const cricket = match.sport === "cricket";
  const basketball = match.sport === "basketball";
  const hasScore = match.homeScore != null || match.awayScore != null;

  return (
    <section className={`${styles.summary} ${basketball ? styles.summaryBasketball : ""}`} aria-label="Match summary">
      <div className={styles.summaryBracket}>
        <time
          dateTime={match.status === "scheduled" ? match.kickoff : undefined}
          className={styles.summaryStatus}
          style={{ color: statusColor(match) }}
        >
          {statusText(match)}
        </time>

        <div className={`${styles.summaryTeams} ${basketball ? styles.summaryTeamsStacked : ""}`}>
          {basketball ? (
            <>
              <TeamIdentity team={match.home} score={match.homeScore} cricket={cricket} />
              <span className={`${styles.summaryScore} ${hasScore ? "" : styles.summaryScoreEmpty}`}>
                {hasScore ? `${match.homeScore ?? "-"} - ${match.awayScore ?? "-"}` : "-"}
              </span>
              <TeamIdentity team={match.away} score={match.awayScore} cricket={cricket} alignEnd />
            </>
          ) : (
            <>
              <TeamBadge team={match.home} size={44} />
              <TeamDetails team={match.home} score={match.homeScore} cricket={cricket} />

              {cricket ? (
                <span className={styles.summaryVs}>vs</span>
              ) : (
                <span
                  className={`${styles.summaryScore} ${hasScore ? "" : styles.summaryScoreEmpty}`}
                >
                  {hasScore ? `${match.homeScore ?? "-"} - ${match.awayScore ?? "-"}` : "-"}
                </span>
              )}

              <TeamDetails team={match.away} score={match.awayScore} cricket={cricket} alignEnd />
              <TeamBadge team={match.away} size={44} />
            </>
          )}
        </div>

        <div className={styles.summarySplit} aria-hidden>
          <span style={{ background: match.home.color }} />
          <span style={{ background: match.away.color, opacity: 0.92 }} />
        </div>
      </div>
    </section>
  );
}

/** The basketball header follows the mobile scoreline treatment: crest first,
 * then the team name, with both identities flanking the score. */
function TeamIdentity({
  team,
  score,
  cricket,
  alignEnd = false,
}: {
  team: SportTeam;
  score?: number | string;
  cricket: boolean;
  alignEnd?: boolean;
}) {
  return (
    <span className={`${styles.summaryIdentity} ${alignEnd ? styles.summaryIdentityEnd : ""}`}>
      <TeamBadge team={team} size={44} />
      <TeamDetails team={team} score={score} cricket={cricket} alignEnd={alignEnd} />
    </span>
  );
}

/** A side's name, with its innings under it on cricket fixtures. */
function TeamDetails({
  team,
  score,
  cricket,
  alignEnd = false,
}: {
  team: SportTeam;
  score?: number | string;
  cricket: boolean;
  alignEnd?: boolean;
}) {
  const innings = cricket && score != null && String(score) !== "" ? splitCricketScore(String(score)) : null;
  return (
    <span className={`${styles.summaryTeam} ${alignEnd ? styles.summaryTeamEnd : ""}`}>
      <span className={styles.teamName}>{team.name}</span>
      {innings ? <><span className={styles.teamInnings}>{innings.score}</span>{innings.qualifier ? <span className={styles.teamQualifier}>{innings.qualifier}</span> : null}</> : null}
    </span>
  );
}

function splitCricketScore(value: string): { score: string; qualifier: string } {
  const index = value.indexOf("(");
  return index < 0 ? { score: value.trim(), qualifier: "" } : { score: value.slice(0, index).trim(), qualifier: value.slice(index).trim().replace(/^\(|\)$/g, "") };
}

function GrandPrixSummary({ match }: { match: SportMatch }) {
  return (
    <section className={styles.summary} style={{ paddingTop: 12 }} aria-label="Race summary">
      <div className={styles.summaryBracket} style={{ paddingTop: 12 }}>
        <span className={styles.summaryStatus} style={{ color: statusColor(match), fontSize: typography.sizePx.p14 }}>
          {match.status === "scheduled" ? "UPCOMING" : match.status === "live" ? "LIVE" : "FT"}
        </span>
        <div className="mt-2.5 line-clamp-2 text-center font-display text-xl font-bold leading-tight">
          {match.home.name.toUpperCase()}
        </div>
        <div className={styles.summarySplit} aria-hidden>
          <span style={{ background: "var(--ds-color-accent-cyan)" }} />
          <span style={{ background: "var(--ds-color-danger)", opacity: 0.92 }} />
        </div>
      </div>
    </section>
  );
}

function statusColor(match: SportMatch): string {
  if (match.status === "live") return "var(--ds-color-danger)";
  if (match.status === "finished") return "var(--ds-color-text-muted)";
  return "var(--ds-color-accent-gold)";
}

function statusText(match: SportMatch): string {
  if (match.status === "live") {
    return match.liveMinute == null ? "LIVE" : `LIVE ${match.liveMinute}'`;
  }
  if (match.status === "finished") return "FT";
  return formatKickoffTime(match.kickoff);
}
