"use client";
import Link from "next/link";
import { useEditorialEntrance } from "../editorial-entrance";
import { useEditorialSingleColumn } from "../editorial-layout";
import { type CSSProperties, useSyncExternalStore } from "react";
import { useProfileIdentity } from "@/features/profile/state/profile-identity";
import { editorialMatchAccent } from "../editorial-accent";
import type { SportMatch } from "@/domain/matches";
import { italianGpReport } from "@/mocks/matches/details";
import { TeamBadge } from "./team-badge";
import styles from "./editorial-discovery.module.css";
import { kickoffClock } from "../editorial-format";
import { DiscoveryChrome as EditorialChrome, DiscoveryTeamName } from '@statoz/design-system/games/components/data-display/discovery-card';
import { EditorialStatus, editorialPlateClass, editorialSportStyle } from './editorial-presentation';
const noZoneUpdates=()=>()=>{};
const browserZone=()=>Intl.DateTimeFormat().resolvedOptions().timeZone;
const serverZone=()=>'UTC';
export function EditorialMatchCard({ match, compact = false, followed = false, showCompetition = true }: {
    match: SportMatch;
    compact?: boolean;
    followed?: boolean;
    showCompetition?: boolean;
}) {
    const singleColumn = useEditorialSingleColumn();
    const entrance = useEditorialEntrance('match:' + match.id + ':' + compact);
    const profile = useProfileIdentity();
    const favorite = profile.favoriteTeams[match.leagueId];
    const accent = editorialMatchAccent(match, followed || favorite === match.home.id || favorite === match.away.id, match.id === italianGpReport.id && match.status === "finished" ? italianGpReport.winner.color : undefined);
    const zone=useSyncExternalStore(noZoneUpdates,browserZone,serverZone);
    const upcoming=match.status === "scheduled";
    const clock=upcoming?kickoffClock(match.kickoff,zone):"";
    const timing = match.status === "live" && match.sport === "football" && match.liveMinute != null ? `${match.liveMinute}′` : undefined;
    const racing = match.sport === "motorsport", rows = match.id === italianGpReport.id && match.status !== "scheduled" ? italianGpReport.race.slice(0, 3) : [];
    const stacked = !upcoming && (compact || match.sport === "cricket" || match.sport === "basketball");
    const score = (value: number | string | undefined) => value == null ? "—" : String(value);
    return <Link ref={entrance} className={`${editorialPlateClass} ${styles.matchPlate} ${compact ? styles.compact : ""}`} style={{ ...editorialSportStyle(match.sport), "--match-accent": accent } as CSSProperties} href={`/matches/${match.id}`} data-kind="match" data-stack={singleColumn || undefined} data-sport={match.sport}>
    <EditorialChrome /><EditorialStatus label={showCompetition ? match.leagueLabel : ""} showMarker={showCompetition} status={match.status} liveContext={match.status === "live" ? timing : undefined} sport={match.sport}/>
    {racing ? <><h3 className={styles.title}>{match.home.name}</h3>{upcoming&&<time dateTime={match.kickoff} className={styles.kickoff} data-match-kickoff>{clock || "—"}</time>}{rows.map(row => <div className={styles.teamRow} key={row.driverId}><span className={styles.answer}>{row.position}</span><DiscoveryTeamName className={styles.name}>{row.name}</DiscoveryTeamName><span className={styles.answer}>{row.gap ?? row.status}</span></div>)}</> : stacked ? <div className={styles.scoreRows}>{[match.home, match.away].map((team, i) => <div className={styles.teamRow} key={team.id}><TeamBadge team={team} size={compact ? 28 : 36}/><DiscoveryTeamName className={styles.name}>{team.name}</DiscoveryTeamName><span className={match.sport === "cricket" && !/[0-9—]/.test(score(i === 0 ? match.homeScore : match.awayScore)) ? styles.answer : styles.score}>{match.sport === "cricket" ? score(i === 0 ? match.homeScore : match.awayScore).split("(")[0].trim() : score(i === 0 ? match.homeScore : match.awayScore)}</span>{match.sport === "cricket" && String(i === 0 ? match.homeScore ?? "" : match.awayScore ?? "").includes("(") && <span className={styles.inningsContext}>{String(i === 0 ? match.homeScore : match.awayScore).slice(String(i === 0 ? match.homeScore : match.awayScore).indexOf("("))}</span>}</div>)}</div> : <div className={styles.mirrored}><div className={styles.identity} data-side="home"><TeamBadge team={match.home} size={32}/><DiscoveryTeamName className={styles.name}>{match.home.name}</DiscoveryTeamName></div>{upcoming ? <time dateTime={match.kickoff} className={styles.kickoff} data-match-kickoff>{clock || "—"}</time> : <span className={styles.score}>{`${score(match.homeScore)} : ${score(match.awayScore)}`}</span>}<div className={styles.identity} data-side="away"><TeamBadge team={match.away} size={32}/><DiscoveryTeamName className={styles.name}>{match.away.name}</DiscoveryTeamName></div></div>}
    {match.resultLine && match.sport !== "football" && <p className={styles.answer}>{match.resultLine}</p>}
  </Link>;
}
