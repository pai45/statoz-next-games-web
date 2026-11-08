"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import { useRef, useState } from "react";

import { BoltIcon, FilterChips, ShowChartIcon, accentVar } from "@statoz/design-system/games";
import type { MatchDetailScoreboard, SportMatch } from "@/domain/matches";

import { CommentaryView, TimelineList } from "./match-report-parts";
import { MatchPitchView } from "./match-pitch-view";
import {
  EmptyPanel,
  MatchIntelPanel,
  SectionHeading,
  StatComparisonRow,
  StatsRow,
  TeamLegendRow,
} from "./match-stats-shell";
import { MatchTraceChart } from "./match-trace-chart";
import { FootballShotMap } from "./football-shot-map";
import styles from "./match-stats.module.css";

/**
 * The football report — the app's five sections, in its order.
 *
 * OVERVIEW leads with territorial control, MOMENTUM is the two-sided pressure
 * trace with the goals riding it, EVENTS is the log, LINEUPS the pitch, and
 * COMMENTARY the play-by-play.
 */

const tabs = ["OVERVIEW", "MOMENTUM", "LINEUPS", "COMMENTARY"];

export function FootballStatsView({
  match,
  scoreboard,
}: {
  match: SportMatch;
  scoreboard: MatchDetailScoreboard;
}) {
  const [tab, setTab] = useState(tabs[0]);
  const scroll = useRef<HTMLDivElement>(null);

  const selectTab = (nextTab: string) => {
    setTab(nextTab);
    requestAnimationFrame(() => scroll.current?.scrollTo({ top: 0 }));
  };

  return (
    <div className={styles.statsView}>
      <FilterChips options={tabs} selected={tab} onSelect={selectTab} label="Match report sections" />
      <div ref={scroll} className={styles.statsScroll}>
        {tab === "OVERVIEW" ? <Overview match={match} scoreboard={scoreboard} /> : null}
        {tab === "MOMENTUM" ? <Momentum match={match} scoreboard={scoreboard} /> : null}
        {tab === "LINEUPS" ? <MatchPitchView match={match} scoreboard={scoreboard} /> : null}
        {tab === "COMMENTARY" ? <CommentaryView match={match} commentary={scoreboard.commentary} /> : null}
      </div>
    </div>
  );
}

function Overview({ match, scoreboard }: { match: SportMatch; scoreboard: MatchDetailScoreboard }) {
  const [held, setHeld] = useState<string | null>(null);
  return (
    <div className={styles.stack}>
      <section className={styles.tight}>
        <SectionHeading label="MATCH INTEL" />
        <MatchIntelPanel match={match} intel={scoreboard.intel} />
      </section>

      <section className={styles.tight}>
        <SectionHeading label="TEAM CONTROL" />
        <TeamLegendRow match={match} />
        {scoreboard.stats.map((stat) => (
          <StatComparisonRow
            key={stat.label}
            stat={stat}
            homeColor={match.home.secondaryTextColor ?? match.home.color}
            awayColor={match.away.secondaryTextColor ?? match.away.color}
            selected={held === stat.label}
            onSelect={() => setHeld((current) => (current === stat.label ? null : stat.label))}
          />
        ))}
      </section>

      <section className={`${styles.tight} spanFull`}>
        <TimelineList match={match} events={scoreboard.timeline} />
      </section>
    </div>
  );
}

function Momentum({ match, scoreboard }: { match: SportMatch; scoreboard: MatchDetailScoreboard }) {
  if (!scoreboard.trace) {
    return (
      <EmptyPanel
        icon={ShowChartIcon}
        spark={BoltIcon}
        title="Pressure feed offline"
        message="Momentum will map the match once enough live actions arrive."
      />
    );
  }
  return (
    <div className={styles.stack}>
      <div className="spanFull">
        <MatchTraceChart match={match} trace={scoreboard.trace} />
      </div>
      <div className="spanFull">
        <FootballShotMap match={match} shots={scoreboard.shots ?? []} />
      </div>
      <section className={`${styles.tight} spanFull`}>
        <SectionHeading label="PRESSURE READ" />
        <StatsRow accent={accentVar("cyan")}>
          <p style={{ margin: 0, color: "var(--ds-color-text-muted)", fontSize: typography.sizeRem.p12 }}>
            Drag the trace to read either side&rsquo;s pressure at any point. Goals ride the plot as
            markers, and the one that decided it carries the halo.
          </p>
        </StatsRow>
      </section>
    </div>
  );
}
