import Link from "next/link";
import { EditorialMatchCard } from "./editorial-discovery";
import type { CSSProperties } from "react";

import type { SportMatch, SportTeam } from "@/domain/matches";
import { formatKickoffTime, formatOzCompact } from "@/shared/utils";

import styles from "./sport-fixture-card.module.css";
import { TeamBadge } from "./team-badge";

export type SportFixtureCardProps = {
  match: SportMatch;
  followedTeamName?: string;
};

/** Shared editorial fixtures; Tennis retains its existing set-score presentation. */
export function SportFixtureCard({
  match,
  followedTeamName,
}: SportFixtureCardProps) {
  if (match.sport !== "tennis" || match.status === "scheduled") return <EditorialMatchCard showCompetition={false} match={match} followed={[match.home.name,match.away.name].includes(followedTeamName ?? "")} />;
  const followed = [match.home, match.away].find((team) => team.name === followedTeamName);
  const stateColor = match.status === "live"
      ? "var(--ds-color-danger)"
      : match.status === "finished"
        ? "var(--ds-color-fixture-border)"
        : followed?.color ?? "var(--ds-color-fixture-predicted)";
  const label = `${match.home.name} versus ${match.away.name}, ${statusLabel(match)}`;

  return (
    <article
      className={styles.shell}
      style={{ "--fixture-state": stateColor } as CSSProperties}
    >
      <div aria-hidden className={styles.lift} />
      <div className={styles.frame}>
        <div className={styles.inner}>
          <div className={styles.body}>
            <Teams match={match} followedTeamName={followedTeamName} />
            {showsResultSummary(match) ? (
              <p className="mt-3 text-center text-xs font-semibold leading-body text-[var(--ds-color-fixture-result)]">
                {match.resultLine}
              </p>
            ) : null}
          </div>
          <StatusStrip match={match} />
        </div>
      </div>
      <div className={styles.tag}>
        <StatusTag match={match} />
      </div>
      <Link href={`/matches/${match.id}`} aria-label={label} className={styles.stretchedLink} />
    </article>
  );
}

function StatusTag({ match }: { match: SportMatch }) {
  if (match.status === "live") {
    return (
      <span className="flex items-center gap-1.5 text-xs font-bold tracking-label text-danger">
        <span aria-hidden className={styles.liveDot} />
        {match.liveMinute == null ? "LIVE" : `LIVE ${match.liveMinute}′`}
      </span>
    );
  }
  if (match.status === "finished") {
    return <span className="text-xs font-semibold tracking-tight text-muted">Finished</span>;
  }
  return (
    <time
      dateTime={match.kickoff}
      className="ds-tabular text-sm font-bold tracking-label text-[var(--ds-color-fixture-kickoff)]"
    >
      {formatKickoffTime(match.kickoff)}
    </time>
  );
}

function Teams({ match, followedTeamName }: { match: SportMatch; followedTeamName?: string }) {
  const hasScore = match.homeScore != null || match.awayScore != null;
  const homeValue = scoreValue(match.homeScore);
  const awayValue = scoreValue(match.awayScore);
  const hasWinner = match.status === "finished" && homeValue != null && awayValue != null && homeValue !== awayValue;
  const homeWinner = hasWinner ? homeValue > awayValue : null;
  const awayWinner = hasWinner ? awayValue > homeValue : null;
  return (
    <div className="flex min-w-0 items-start">
      <TeamColumn team={match.home} followed={match.home.name === followedTeamName} dim={match.status === "finished" && homeWinner === false} />
      <div className="flex shrink-0 flex-col items-center px-2 pt-2">
        {hasScore ? (
          <span className="ds-tabular whitespace-nowrap font-display text-2xl font-black tracking-tight">
            <span className={homeWinner === false ? "text-muted" : "text-foreground"}>{match.homeScore ?? "-"}</span>
            <span className="text-muted"> - </span>
            <span className={awayWinner === false ? "text-muted" : "text-foreground"}>{match.awayScore ?? "-"}</span>
          </span>
        ) : (
          <span className="font-display text-lg font-black text-muted">-</span>
        )}
        {match.sport === "tennis" && match.tennisSets?.length ? (
          <div className="mt-1.5 flex max-w-32 flex-wrap justify-center gap-1.5">
            {match.tennisSets.map((set, index) => (
              <span
                key={`${set.homeScore}-${set.awayScore}-${index}`}
                className={`${styles.setChip} ds-tabular px-2 py-0.75 text-2xs font-bold text-cyan`}
              >
                {set.homeScore}-{set.awayScore}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <TeamColumn team={match.away} followed={match.away.name === followedTeamName} alignEnd dim={match.status === "finished" && awayWinner === false} />
    </div>
  );
}

function TeamColumn({
  team,
  alignEnd = false,
  dim,
  followed,
}: {
  team: SportTeam;
  alignEnd?: boolean;
  dim: boolean;
  followed: boolean;
}) {
  return (
    <div className={`flex min-w-0 flex-1 flex-col ${alignEnd ? "items-end text-right" : "items-start text-left"}`}>
      <TeamBadge team={team} />
      <span className={`mt-2 line-clamp-2 max-w-full text-base font-bold leading-tight ${dim ? "text-[var(--ds-color-fixture-dim-name)]" : "text-foreground"}`} style={followed ? { color: team.color } : undefined}>
        {team.name}
      </span>
    </div>
  );
}

function scoreValue(value: SportMatch["homeScore"]): number | null {
  const match = String(value ?? "").match(/\d+/);
  return match ? Number(match[0]) : null;
}

function showsResultSummary(match: SportMatch): match is SportMatch & { resultLine: string } {
  return Boolean(match.resultLine) && match.sport !== "football" && match.sport !== "basketball";
}

function StatusStrip({ match }: { match: SportMatch }) {
  return (
    <div className={styles.footer}>
      {match.status === "live" ? (
        <span className="flex items-center gap-1.5 font-display text-2xs font-extrabold tracking-ultra text-danger">
          <span aria-hidden className={styles.liveDot} />
          IN PLAY
        </span>
      ) : match.status === "finished" ? (
        <span className="font-display text-2xs font-extrabold tracking-wide text-muted">FULL TIME</span>
      ) : (
        <span className="ds-tabular min-w-0 flex-1 truncate font-display text-2xs font-extrabold tracking-wide text-cyan/85">
          POTENTIAL +{match.rewardXp} XP
        </span>
      )}
      <span className="ds-tabular ml-auto shrink-0 font-display text-2xs font-semibold tracking-label text-muted">
        VOL {formatOzCompact(match.volumeOz)} OZ
      </span>
    </div>
  );
}

function statusLabel(match: SportMatch): string {
  if (match.status === "live") return match.liveMinute == null ? "live" : `live ${match.liveMinute} minutes`;
  if (match.status === "finished") return "finished";
  return formatKickoffTime(match.kickoff);
}
