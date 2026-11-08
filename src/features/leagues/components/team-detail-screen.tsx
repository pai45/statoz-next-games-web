"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";

import { EventBusyIcon, InsightsIcon, NoDataState, UnderlineTabs, type UnderlineTab } from "@statoz/design-system/games";
import type { LeagueHubSnapshot, LeaguePlayerProfile, LeagueStandingRow } from "@/domain/leagues";
import type { SportMatch, SportTeam } from "@/domain/matches";
import type { PickMarket } from "@/domain/predictions";
import { SportFixtureCard, TeamBadge } from "@/features/matches";
import { PickMarketCard, selectPositionsForMarket, usePickTrading, usePicks } from "@/features/picks";

import { DetailTopBar, SectionHeading } from "./league-hub-screen";
import styles from "./league-hub.module.css";

const teamTabs: UnderlineTab[] = [
  { id: "matches", label: "MATCHES" },
  { id: "predictions", label: "PREDICTIONS" },
  { id: "players", label: "PLAYERS" },
];

export function TeamDetailScreen({ snapshot, competitor, fixtures, markets, players }: {
  snapshot: LeagueHubSnapshot;
  competitor: SportTeam;
  fixtures: SportMatch[];
  markets: PickMarket[];
  players: LeaguePlayerProfile[];
}) {
  const picks = usePicks();
  const trading = usePickTrading();
  const [tabIndex, setTabIndex] = useState(0);
  const standing = snapshot.groups.flatMap((group) => group.rows).find((row) => row.competitor.id === competitor.id);

  return (
    <div className={styles.teamPage} style={{ "--league-accent": snapshot.accent } as CSSProperties}>
      <DetailTopBar title={`${snapshot.shortCode} · ${competitor.shortName}`} fallback={`/leagues/${snapshot.id}`} />
      <main className={styles.teamContent}>
        <TeamHeader competitor={competitor} standing={standing} />
        <p className={styles.teamSeason}>{snapshot.seasonLabel}</p>
        <UnderlineTabs label={`${competitor.name} sections`} tabs={teamTabs} activeIndex={tabIndex} accent={snapshot.accent} onChange={setTabIndex} />
        {tabIndex === 0 ? <Matches fixtures={fixtures} /> : null}
        {tabIndex === 1 ? <Predictions markets={markets} picks={picks} trading={trading} /> : null}
        {tabIndex === 2 ? <Roster snapshot={snapshot} players={players} /> : null}
      </main>
      {trading.overlays}
    </div>
  );
}

function Matches({ fixtures }: { fixtures: SportMatch[] }) {
  return <section><SectionHeading label="SEASON MATCHES" />{fixtures.length ? <ul className={styles.cardGrid}>{fixtures.map((match) => <li key={match.id}><SportFixtureCard match={match} /></li>)}</ul> : <NoDataState icon={EventBusyIcon} title="No fixtures" message="No fixtures for this competitor in the committed season snapshot." />}</section>;
}

function Predictions({ markets, picks, trading }: { markets: PickMarket[]; picks: ReturnType<typeof usePicks>; trading: ReturnType<typeof usePickTrading> }) {
  return <section><SectionHeading label="PREDICTIONS" />{markets.length ? <div className={styles.cardGrid}>{markets.map((market) => <PickMarketCard key={market.id} market={market} positions={selectPositionsForMarket(picks, market.id)} onPick={(selected, outcomeId) => trading.openTrade(selected, outcomeId)} onClaim={trading.claim} />)}</div> : <NoDataState icon={InsightsIcon} title="No predictions" message="No prediction markets for this competitor." />}</section>;
}

function Roster({ snapshot, players }: { snapshot: LeagueHubSnapshot; players: LeaguePlayerProfile[] }) {
  return <section><SectionHeading label="SEASON ROSTER" />{players.length ? <ul className={styles.playerGrid}>{players.map((player) => <li key={player.id}><Link href={`/leagues/${snapshot.id}/players/${player.id}`}><span>{player.number ?? "—"}</span><b>{player.name}</b><small>{player.role}</small></Link></li>)}</ul> : <NoDataState icon={InsightsIcon} title="No roster" message="No linked players are available in this season snapshot." />}</section>;
}

function TeamHeader({ competitor, standing }: { competitor: SportTeam; standing?: LeagueStandingRow }) {
  const points = standing?.metrics.pts;
  return <header className={styles.teamHeader}><TeamBadge team={competitor} size={54} /><span><h1>{competitor.name}</h1>{standing ? <div className={styles.teamMeta}><b>RANK #{standing.rank}{points == null ? "" : ` · ${points} PTS`}</b><FormPips form={standing.form ?? ""} /></div> : null}</span></header>;
}

function FormPips({ form }: { form: string }) {
  return <span className={styles.formPips}>{form.split("").map((result, index) => <i key={`${result}-${index}`} data-result={result}>{result}</i>)}</span>;
}
