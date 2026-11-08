"use client";

import { useState } from "react";

import { FilterChips, GridOnIcon, ShowChartIcon, accentVar } from "@statoz/design-system/games";
import type { MatchDetailScoreboard, SportMatch } from "@/domain/matches";

import { CommentaryView, LineupsView, TimelineList } from "./match-report-parts";
import {
  EmptyPanel,
  MatchIntelPanel,
  SectionHeading,
  StatComparisonRow,
  StatsRow,
  TeamLegendRow,
} from "./match-stats-shell";
import { MatchTraceChart } from "./match-trace-chart";
import { BasketballShotMap } from "./basketball-shot-map";
import styles from "./match-stats.module.css";

/**
 * The basketball report: the model's read, the flow that produced it, the
 * plays, the box score, and the two rosters.
 */

const tabs = ["OVERVIEW", "FLOW", "PLAYS", "BOX SCORE", "TEAMS"];

export function BasketballStatsView({
  match,
  scoreboard,
}: {
  match: SportMatch;
  scoreboard: MatchDetailScoreboard;
}) {
  const [tab, setTab] = useState(tabs[0]);

  return (
    <div className={styles.statsView}>
      <FilterChips options={tabs} selected={tab} onSelect={setTab} label="Match report sections" />
      <div className={styles.statsScroll}>
        {tab === "OVERVIEW" ? <Overview match={match} scoreboard={scoreboard} /> : null}
        {tab === "FLOW" ? <Flow match={match} scoreboard={scoreboard} /> : null}
        {tab === "PLAYS" ? (
          <div className={styles.stack}>
            <div className="spanFull">
              <TimelineList match={match} events={scoreboard.timeline} />
            </div>
            <div className="spanFull">
              <CommentaryView commentary={scoreboard.commentary} />
            </div>
          </div>
        ) : null}
        {tab === "BOX SCORE" ? <BoxScoreView match={match} scoreboard={scoreboard} /> : null}
        {tab === "TEAMS" ? <LineupsView match={match} scoreboard={scoreboard} /> : null}
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
        <SectionHeading label="BY QUARTER" />
        {scoreboard.scoreRows.map((row) => (
          <StatsRow key={row.label} accent={accentVar("cyan")}>
            <span className={styles.comparisonHead}>
              <b className="ds-tabular">{row.home}</b>
              <small>{row.label}</small>
              <b className="ds-tabular">{row.away}</b>
            </span>
          </StatsRow>
        ))}
      </section>

      <section className={styles.tight}>
        <SectionHeading label="TEAM CONTROL" />
        <TeamLegendRow match={match} />
        {scoreboard.stats.map((stat) => (
          <StatComparisonRow
            key={stat.label}
            stat={stat}
            homeColor={match.home.color}
            awayColor={match.away.color}
            selected={held === stat.label}
            onSelect={() => setHeld((current) => (current === stat.label ? null : stat.label))}
          />
        ))}
      </section>

      <section className={styles.tight}>
        <SectionHeading label="LEADERS" />
        {(scoreboard.leaders ?? []).map((leader) => (
          <StatsRow
            key={leader.name}
            accent={leader.side === "home" ? match.home.color : match.away.color}
          >
            <span className={styles.eventRow}>
              <i
                className={styles.eventSide}
                style={{ background: leader.side === "home" ? match.home.color : match.away.color }}
                aria-hidden="true"
              />
              <span className={styles.eventCopy}>
                <strong>{leader.name}</strong>
                <small>{leader.note}</small>
              </span>
              <b className={styles.eventMinute} style={{ textAlign: "right" }}>{leader.line}</b>
            </span>
          </StatsRow>
        ))}
      </section>
    </div>
  );
}

function Flow({ match, scoreboard }: { match: SportMatch; scoreboard: MatchDetailScoreboard }) {
  const modes = ["GAME", "H1", "H2", "CLUTCH"];
  const [mode, setMode] = useState(modes[0]);
  if (!scoreboard.trace) {
    return (
      <EmptyPanel
        icon={ShowChartIcon}
        title="Flow feed unavailable"
        message="Win probability and scoring coordinates have not arrived."
      />
    );
  }
  const indices = scoreboard.trace.ticks.map((tick, index) => ({ tick, index })).filter(({ tick }) => {
    const period = Number.parseInt(tick.match(/Q(\d+)/)?.[1] ?? "0", 10);
    if (mode === "H1") return period <= 2;
    if (mode === "H2") return period >= 3;
    if (mode === "CLUTCH") {
      const clock = tick.match(/(\d+):(\d+)/);
      return period === 4 && (Number(clock?.[1] ?? 99) * 60 + Number(clock?.[2] ?? 0)) <= 300;
    }
    return true;
  }).map(({ index }) => index);
  const first = indices[0] ?? 0;
  const last = indices.at(-1) ?? Math.max(0, scoreboard.trace.ticks.length - 1);
  const trace = { ...scoreboard.trace, ticks: scoreboard.trace.ticks.slice(first, last + 1), home: scoreboard.trace.home.slice(first, last + 1), away: scoreboard.trace.away.slice(first, last + 1), markers: scoreboard.trace.markers?.filter((marker) => marker.index >= first && marker.index <= last).map((marker) => ({ ...marker, index: marker.index - first })) };
  return (
    <div className={styles.stack}>
      <div className="spanFull">
        <FilterChips options={modes} selected={mode} onSelect={setMode} label="Score race period" />
        <MatchTraceChart match={match} trace={trace} />
      </div>
      <BasketballShotMap match={match} shots={scoreboard.basketballShots ?? []} />
      <section className={`${styles.tight} spanFull`}>
        <SectionHeading label="SCORING RUNS" />
        {scoreboard.scoreRows.map((row) => (
          <StatsRow key={row.label} accent={accentVar("orange")}>
            <span className={styles.comparisonHead}>
              <b className="ds-tabular">{row.home}</b>
              <small>{row.label}</small>
              <b className="ds-tabular">{row.away}</b>
            </span>
          </StatsRow>
        ))}
      </section>
    </div>
  );
}

function BoxScoreView({ match, scoreboard }: { match: SportMatch; scoreboard: MatchDetailScoreboard }) {
  const box = scoreboard.boxScore;
  if (!box) {
    return (
      <EmptyPanel
        icon={GridOnIcon}
        title="Box score unavailable"
        message="Player totals have not been published for this fixture."
      />
    );
  }
  return (
    <div className={styles.stack}>
      {(["home", "away"] as const).map((side) => (
        <section key={side} className={styles.tight}>
          <SectionHeading label={(side === "home" ? match.home.name : match.away.name).toUpperCase()} />
          <StatsRow accent={side === "home" ? match.home.color : match.away.color}>
            <table className={styles.statTable}>
              <thead>
                <tr>
                  <th className={styles.tableHead}>PLAYER</th>
                  {box.columns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {box.rows
                  .filter((row) => row.side === side)
                  .map((row) => (
                    <tr key={row.name}>
                      <td>{row.name}</td>
                      {row.values.map((value, index) => (
                        <td key={box.columns[index]}>{value}</td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </StatsRow>
        </section>
      ))}
    </div>
  );
}
