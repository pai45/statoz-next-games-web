"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type CSSProperties, type ComponentType } from "react";

import {
  BasketballIcon,
  ChevronLeftIcon,
  CricketIcon,
  EventBusyIcon,
  FootballIcon,
  FormatListNumberedIcon,
  HudPanel,
  InsightsIcon,
  MedalIcon,
  MotorsportIcon,
  NoDataState,
  TennisIcon,
  UnderlineTabs,
  type IconProps,
  type UnderlineTab,
} from "@statoz/design-system/games";
import type {
  LeagueHubSnapshot,
  LeagueHubTab,
  LeagueLeaderCategory,
  LeagueStandingGroup,
  LeagueStandingRow,
} from "@/domain/leagues";
import type { SportMatch } from "@/domain/matches";
import type { PickMarket } from "@/domain/predictions";
import type { Sport } from "@/domain/sports";
import { SportFixtureCard, TeamBadge } from "@/features/matches";
import {
  PickMarketCard,
  selectPositionsForMarket,
  usePickTrading,
  usePicks,
} from "@/features/picks";

import styles from "./league-hub.module.css";

const teamTabs: LeagueHubTab[] = ["table", "leaders", "stats", "games", "picks"];
const f1Tabs: LeagueHubTab[] = ["table", "rounds", "stats", "games", "picks"];

export function LeagueHubScreen({
  snapshot,
  fixtures,
  markets,
}: {
  snapshot: LeagueHubSnapshot;
  fixtures: SportMatch[];
  markets: PickMarket[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const validTabs = snapshot.kind === "f1" ? f1Tabs : teamTabs;
  const requested = searchParams.get("tab") as LeagueHubTab | null;
  const tab: LeagueHubTab = requested && validTabs.includes(requested) ? requested : "table";
  const activeIndex = validTabs.indexOf(tab);
  const tabs: UnderlineTab[] = validTabs.map((id) => ({
    id,
    label: id.toUpperCase(),
    icon: id === "table" || id === "rounds"
      ? <FormatListNumberedIcon size={21} />
      : id === "leaders"
        ? <MedalIcon size={21} />
        : id === "games"
          ? <LeagueSportIcon sport={snapshot.sport} size={21} />
          : <InsightsIcon size={21} />,
  }));

  function selectTab(index: number) {
    const next = validTabs[index];
    router.replace(next === "table" ? pathname : `${pathname}?tab=${next}`, { scroll: false });
  }

  return (
    <div className={styles.page} style={{ "--league-accent": snapshot.accent } as CSSProperties}>
      <div className={styles.chrome}>
        <DetailTopBar title={`${snapshot.shortCode} HUB`} fallback="/" />
        <LeagueHeader snapshot={snapshot} />
        <UnderlineTabs
          label={`${snapshot.name} sections`}
          tabs={tabs}
          activeIndex={activeIndex}
          accent={snapshot.accent}
          onChange={selectTab}
          className={styles.primaryTabs}
        />
      </div>

      <main className={styles.content} key={tab} role="tabpanel" aria-label={tabs[activeIndex].label}>
        {tab === "table" ? <TableTab snapshot={snapshot} /> : null}
        {tab === "leaders" ? <LeadersTab snapshot={snapshot} /> : null}
        {tab === "rounds" && snapshot.kind === "f1" ? <RoundsTab snapshot={snapshot} /> : null}
        {tab === "stats" ? <StatsTab snapshot={snapshot} /> : null}
        {tab === "games" ? <GamesTab fixtures={fixtures} /> : null}
        {tab === "picks" ? <PicksTab markets={markets} accent={snapshot.accent} /> : null}
      </main>
    </div>
  );
}

export function DetailTopBar({ title, fallback }: { title: string; fallback: string }) {
  const router = useRouter();
  return (
    <header className={styles.topBar}>
      <button
        type="button"
        className={styles.back}
        aria-label="Go back"
        onClick={() => window.history.length > 1 ? router.back() : router.push(fallback)}
      >
        <ChevronLeftIcon size={18} />
      </button>
      <strong>{title}</strong>
    </header>
  );
}

function LeagueHeader({ snapshot }: { snapshot: LeagueHubSnapshot }) {
  return (
    <section className={styles.leagueHeader}>
      <span className={styles.leagueMark}>{snapshot.shortCode}</span>
      <span className={styles.leagueIdentity}>
        <h1>{snapshot.name}</h1>
        <small>{snapshot.seasonLabel}</small>
      </span>
    </section>
  );
}

function TableTab({ snapshot }: { snapshot: LeagueHubSnapshot }) {
  const [groupIndex, setGroupIndex] = useState(0);
  const group = snapshot.groups[Math.min(groupIndex, snapshot.groups.length - 1)];
  const groupTabs: UnderlineTab[] = snapshot.groups.map((item) => ({ id: item.id, label: item.shortLabel }));
  return (
    <section className={styles.tabSection}>
      {snapshot.groups.length > 1 ? (
        <UnderlineTabs label="Standings group" tabs={groupTabs} activeIndex={groupIndex} accent={snapshot.accent} onChange={setGroupIndex} className={styles.secondaryTabs} />
      ) : <SectionHeading label="ALL COMPETITORS" />}
      <StandingsTable snapshot={snapshot} group={group} />
    </section>
  );
}

function StandingsTable({ snapshot, group }: { snapshot: LeagueHubSnapshot; group: LeagueStandingGroup }) {
  const columnCount = snapshot.columns.length + 2;
  return (
    <div className={styles.tableShell}>
      <div className={styles.tableScroll}>
        <table className={`${styles.table} ds-tabular`}>
          <thead><tr><th scope="col">#</th><th scope="col">{snapshot.sport === "tennis" || snapshot.sport === "motorsport" ? "COMPETITOR" : "TEAM"}</th>{snapshot.columns.map((column) => <th scope="col" key={column.id}>{column.label}</th>)}</tr></thead>
          <tbody>
            {group.rows.map((row, index) => {
              const nextZone = group.rows[index + 1]?.zone?.label;
              const showZone = row.zone && row.zone.label !== nextZone;
              return (
                <LeagueTableRows key={row.competitor.id} row={row} snapshot={snapshot} groupId={group.id} showZone={Boolean(showZone)} columnCount={columnCount} />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LeagueTableRows({ row, snapshot, groupId, showZone, columnCount }: { row: LeagueStandingRow; snapshot: LeagueHubSnapshot; groupId: string; showZone: boolean; columnCount: number }) {
  const identity = <><TeamBadge team={row.competitor} size={26} /><span>{row.tableName ?? row.competitor.name}</span></>;
  const href = snapshot.kind === "f1" && groupId === "wdc"
    ? `/leagues/${snapshot.id}/players/${row.competitor.id}`
    : snapshot.kind === "team"
      ? `/leagues/${snapshot.id}/teams/${row.competitor.id}`
      : null;
  return (
    <>
      <tr className={styles.dataRow}>
        <td className={row.rank === 1 ? styles.firstRank : undefined}>
          <span>{row.rank}</span>{row.rankChange ? <i className={row.rankChange > 0 ? styles.rankUp : styles.rankDown}>{row.rankChange > 0 ? "▲" : "▼"}</i> : null}
        </td>
        <th scope="row">
          {href ? <Link href={href} className={styles.teamLink}>{identity}</Link> : <span className={styles.teamLink}>{identity}</span>}
        </th>
        {snapshot.columns.map((column) => <td key={column.id} className={column.emphasis ? styles.emphasis : undefined}>{row.metrics[column.id]}</td>)}
      </tr>
      {showZone && row.zone ? (
        <tr className={styles.zoneRow}><td colSpan={columnCount}><span style={{ "--zone-color": row.zone.color } as CSSProperties}><i />{row.zone.label}</span></td></tr>
      ) : null}
    </>
  );
}

function LeadersTab({ snapshot }: { snapshot: LeagueHubSnapshot }) {
  const [categoryIndex, setCategoryIndex] = useState(0);
  const category = snapshot.leaderCategories[Math.min(categoryIndex, snapshot.leaderCategories.length - 1)];
  if (!category) return <NoDataState icon={MedalIcon} title="No stat leaders" message="This competition has not published leaderboards yet." />;
  return (
    <section className={styles.leadersTab}>
      <UnderlineTabs label="Leaderboard category" tabs={snapshot.leaderCategories.map((item) => ({ id: item.id, label: item.label }))} activeIndex={categoryIndex} accent={snapshot.accent} minTabWidth={104} onChange={setCategoryIndex} className={styles.categoryTabs} />
      <StatLeaderboard category={category} leagueAccent={snapshot.accent} />
    </section>
  );
}

function StatLeaderboard({ category, leagueAccent }: { category: LeagueLeaderCategory; leagueAccent: string }) {
  const accent = category.accent === "league" ? leagueAccent : `var(--ds-color-${category.accent === "orange" ? "accent-orange" : category.accent})`;
  const [champion, ...chasers] = category.leaders;
  if (!champion) return null;
  return (
    <div className={styles.leaderboard}>
      <HudPanel accent={accent} glow className={styles.championCard}>
        <div className={styles.championMeta}><span>◉ LEAGUE LEADER</span><span>{category.unitLabel}</span></div>
        <div className={styles.championBody}>
          <TeamBadge team={champion.competitor} size={42} />
          <span className={styles.championIdentity}><b>{champion.name}</b><small>{champion.competitor.name}</small></span>
          <strong>{champion.displayValue}</strong>
        </div>
        {champion.detail ? <small className={styles.leaderDetail}>{champion.detail}</small> : null}
      </HudPanel>
      <ol className={styles.chaserGrid}>
        {chasers.map((leader, index) => (
          <li key={leader.id} className={styles.chaser} style={{ "--leader-delay": `${(index + 1) * 40}ms` } as CSSProperties}>
            <span className={styles.chaserRank}>{index + 2}</span><TeamBadge team={leader.competitor} size={27} />
            <span className={styles.chaserIdentity}><b>{leader.name}</b><small>{leader.competitor.shortName}</small></span>
            <strong>{leader.displayValue}</strong>
          </li>
        ))}
      </ol>
    </div>
  );
}

function StatsTab({ snapshot }: { snapshot: LeagueHubSnapshot }) {
  const [groupIndex, setGroupIndex] = useState(0);
  if (snapshot.kind === "f1") {
    return <F1Progression snapshot={snapshot} />;
  }
  const group = snapshot.statGroups[Math.min(groupIndex, snapshot.statGroups.length - 1)];
  if (!group) return <NoDataState icon={InsightsIcon} title="No club stats" message="This snapshot does not publish club statistics." />;
  return (
    <section className={styles.leadersTab}>
      <UnderlineTabs label="Team stat groups" tabs={snapshot.statGroups.map((item) => ({ id: item.id, label: item.label }))} activeIndex={groupIndex} accent={snapshot.accent} minTabWidth={112} onChange={setGroupIndex} className={styles.categoryTabs} />
      <div className={styles.cardGrid}>
        {group.boards.map((board) => (
          <HudPanel key={board.id} accent={snapshot.accent} className={styles.championCard}>
            <div className={styles.championMeta}><span>{board.label}</span><span>{board.description}</span></div>
            <ol className={styles.chaserGrid}>
              {board.entries.map((entry, index) => (
                <li key={entry.competitor.id} className={styles.chaser}>
                  <span className={styles.chaserRank}>{index + 1}</span>
                  <TeamBadge team={entry.competitor} size={27} />
                  <Link className={styles.chaserIdentity} href={`/leagues/${snapshot.id}/teams/${entry.competitor.id}`}><b>{entry.competitor.name}</b></Link>
                  <strong>{entry.value}</strong>
                </li>
              ))}
            </ol>
          </HudPanel>
        ))}
      </div>
    </section>
  );
}

function RoundsTab({ snapshot }: { snapshot: Extract<LeagueHubSnapshot, { kind: "f1" }> }) {
  const [roundIndex, setRoundIndex] = useState(snapshot.rounds.length - 1);
  const round = snapshot.rounds[Math.max(0, roundIndex)];
  return (
    <section className={styles.leadersTab}>
      <UnderlineTabs label="Championship rounds" tabs={snapshot.rounds.map((item) => ({ id: item.id, label: item.code }))} activeIndex={roundIndex} accent={snapshot.accent} minTabWidth={72} onChange={setRoundIndex} className={styles.categoryTabs} />
      <HudPanel accent={snapshot.accent} className={styles.championCard}>
        <div className={styles.championMeta}><span>{round.label}</span><span>{round.code}</span></div>
        <ol className={styles.chaserGrid}>{round.driverPoints.map((entry, index) => <li key={entry.name} className={styles.chaser}><span className={styles.chaserRank}>{index + 1}</span><span className={styles.chaserIdentity}><b>{entry.name}</b></span><strong>{entry.points} PTS</strong></li>)}</ol>
      </HudPanel>
    </section>
  );
}

function F1Progression({ snapshot }: { snapshot: Extract<LeagueHubSnapshot, { kind: "f1" }> }) {
  const leaders = snapshot.groups[0]?.rows.slice(0, 8) ?? [];
  return (
    <section className={styles.tabSection}>
      <SectionHeading label="CHAMPIONSHIP PROGRESSION" />
      <div className={styles.cardGrid}>{leaders.map((row) => <HudPanel key={row.competitor.id} accent={snapshot.accent} className={styles.championCard}><div className={styles.championBody}><TeamBadge team={row.competitor} size={36} /><span><b>{row.competitor.name}</b><small>THROUGH {snapshot.rounds.at(-1)?.code}</small></span><strong>{row.metrics.pts} PTS</strong></div></HudPanel>)}</div>
    </section>
  );
}

function GamesTab({ fixtures }: { fixtures: SportMatch[] }) {
  if (!fixtures.length) return <NoDataState icon={EventBusyIcon} title="No fixtures" message="No games are scheduled for this league right now." />;
  return <section className={styles.cardTab}><SectionHeading label="PREDICTION CENTER" /><ul className={styles.cardGrid}>{fixtures.map((match) => <li key={match.id}><SportFixtureCard match={match} /></li>)}</ul></section>;
}

function PicksTab({ markets, accent }: { markets: PickMarket[]; accent: string }) {
  const picks = usePicks();
  const trading = usePickTrading();
  if (!markets.length) return <NoDataState icon={InsightsIcon} title="No markets" message="No quick markets are open for this league right now." accent={accent} />;
  return (
    <section className={styles.cardTab}>
      <SectionHeading label="PICKS CENTER" />
      <div className={styles.cardGrid}>{markets.map((market) => <PickMarketCard key={market.id} market={market} positions={selectPositionsForMarket(picks, market.id)} onPick={(selected, outcomeId) => trading.openTrade(selected, outcomeId)} onClaim={trading.claim} />)}</div>
      {trading.overlays}
    </section>
  );
}

export function SectionHeading({ label }: { label: string }) {
  return <div className={styles.heading}><strong>{label}</strong><span /></div>;
}

const sportIcons: Record<Sport, ComponentType<IconProps>> = { football: FootballIcon, cricket: CricketIcon, basketball: BasketballIcon, tennis: TennisIcon, motorsport: MotorsportIcon };
function LeagueSportIcon({ sport, size }: { sport: Sport; size: number }) { const Glyph = sportIcons[sport]; return <Glyph size={size} />; }
