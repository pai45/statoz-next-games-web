"use client";


import { typography } from "@statoz/design-system/games/tokens/typography";
import Link from "next/link";
import { useState } from "react";

import {
  FilterChips,
  GridOnIcon,
  InsightsIcon,
  InteractiveLineChart,
  MicIcon,
  ShowChartIcon,
  accentVar,
} from "@statoz/design-system/games";
import type { MatchDetailScoreboard, SportMatch } from "@/domain/matches";

import {
  EmptyPanel,
  MatchIntelPanel,
  SectionHeading,
  StatComparisonRow,
  StatsRow,
  TeamLegendRow,
} from "./match-stats-shell";
import { MatchTraceChart } from "./match-trace-chart";
import styles from "./match-stats.module.css";

/**
 * The cricket report: the chase, the two worms side by side, the required rate
 * against the actual one, the card, the ball-by-ball feed, and the squads.
 */

const tabs = ["OVERVIEW", "RACE", "SCORECARD", "MATCH FEED"];

export function CricketStatsView({
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
        {tab === "RACE" ? (
          scoreboard.trace ? (
            <div className={styles.stack}>
              <div className="spanFull">
                <MatchTraceChart match={match} trace={scoreboard.trace} showInningsModes />
              </div>
              {scoreboard.runRate?.length ? <CricketRunRateChart match={match} scoreboard={scoreboard} /> : <EmptyPanel icon={ShowChartIcon} title="Run-rate data unavailable" message="Legal-delivery progression was not published for this innings." />}
            </div>
          ) : (
            <EmptyPanel
              icon={ShowChartIcon}
              title="Race data unavailable"
              message="Both innings need published scoring samples for this race."
            />
          )
        ) : null}
        {tab === "SCORECARD" ? <Scorecard match={match} scoreboard={scoreboard} /> : null}
        {tab === "MATCH FEED" ? <Feed match={match} scoreboard={scoreboard} /> : null}
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
        <SectionHeading label="TEAM COMPARISON" />
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
    </div>
  );
}

/**
 * The card behind the score: one innings at a time, who batted and what they
 * made, then who bowled at them. The phase comparison stays underneath, since
 * it is the only place the two innings are read against each other.
 */
function Scorecard({ match, scoreboard }: { match: SportMatch; scoreboard: MatchDetailScoreboard }) {
  const innings = scoreboard.innings ?? [];
  const [selected, setSelected] = useState(0);

  if (innings.length === 0) {
    return (
      <EmptyPanel
        icon={GridOnIcon}
        title="Scorecard unavailable"
        message="Batting and bowling figures have not been published."
      />
    );
  }

  const card = innings[Math.min(selected, innings.length - 1)];
  const accent = card.side === "home" ? match.home.color : match.away.color;

  return (
    <div className={styles.stack}>
      {innings.length > 1 ? (
        <div className={`${styles.inningsTabs} spanFull`}>
          {innings.map((entry, index) => (
            <button
              key={entry.team}
              type="button"
              className={`${styles.inningsTab} ${index === selected ? styles.inningsTabActive : ""}`}
              aria-pressed={index === selected}
              onClick={() => setSelected(index)}
            >
              {entry.team}
            </button>
          ))}
        </div>
      ) : null}

      <section className={`${styles.tight} spanFull`}>
        <StatsRow accent={accent}>
          <span className={styles.inningsHead}>
            <span>
              <strong>{card.team} Innings</strong>
              <small>
                RR {card.runRate}
                {card.target == null ? "" : ` // TARGET ${card.target}`}
              </small>
            </span>
            <span className={styles.inningsScore}>
              <b style={{ color: accent }}>{card.score}</b>
              <small>{card.overs.toUpperCase()}</small>
            </span>
          </span>
        </StatsRow>
      </section>

      <section className={`${styles.tight} spanFull`}>
        <SectionHeading label="BATTING" />
        <table className={styles.card}>
          <thead>
            <tr>
              <th>BATTER</th>
              <th>R</th>
              <th>B</th>
              <th>4s</th>
              <th>6s</th>
              <th>SR</th>
            </tr>
          </thead>
          <tbody>
            {card.batting.map((line) => (
              <tr key={line.name}>
                <td>
                  {scoreboard.players?.find((player) => player.name === line.name || player.shortName === line.name) ? (
                    <Link href={`/matches/${match.id}/players/${scoreboard.players.find((player) => player.name === line.name || player.shortName === line.name)!.id}`}><strong style={line.dismissal ? undefined : { color: accent }}>{line.name}</strong></Link>
                  ) : <strong style={line.dismissal ? undefined : { color: accent }}>{line.name}</strong>}
                  <small>{line.dismissal ?? "not out"}</small>
                </td>
                <td><b>{line.runs}</b></td>
                <td>{line.balls}</td>
                <td>{line.fours}</td>
                <td>{line.sixes}</td>
                <td>{strikeRate(line.runs, line.balls)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={`${styles.tight} spanFull`}>
        <SectionHeading label="BOWLING" />
        <table className={styles.card}>
          <thead>
            <tr>
              <th>BOWLER</th>
              <th>O</th>
              <th>M</th>
              <th>R</th>
              <th>W</th>
              <th>ECON</th>
            </tr>
          </thead>
          <tbody>
            {card.bowling.map((line) => (
              <tr key={line.name}>
                <td>{scoreboard.players?.find((player) => player.name === line.name || player.shortName === line.name) ? <Link href={`/matches/${match.id}/players/${scoreboard.players.find((player) => player.name === line.name || player.shortName === line.name)!.id}`}><strong>{line.name}</strong></Link> : <strong>{line.name}</strong>}</td>
                <td>{line.overs}</td>
                <td>{line.maidens}</td>
                <td>{line.runs}</td>
                <td><b>{line.wickets}</b></td>
                <td>{economy(line.runs, line.overs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={styles.tight}>
        <SectionHeading label="PHASES" />
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
    </div>
  );
}

/** Runs per hundred balls, the way a card prints it. */
function strikeRate(runs: number, balls: number): string {
  return balls === 0 ? "0.00" : ((runs / balls) * 100).toFixed(2);
}

/** Runs per over, from an overs figure written as `3.4`. */
function economy(runs: number, overs: string): string {
  const [whole, balls = "0"] = overs.split(".");
  const bowled = Number(whole) + Number(balls) / 6;
  return bowled === 0 ? "0.00" : (runs / bowled).toFixed(2);
}

function Feed({ match, scoreboard }: { match: SportMatch; scoreboard: MatchDetailScoreboard }) {
  const [teamId, setTeamId] = useState(match.home.id);
  const allFeed = scoreboard.feed ?? [];
  const feed = allFeed.some((entry) => entry.teamId) ? allFeed.filter((entry) => entry.teamId === teamId) : allFeed;
  return (
    <div className={styles.stack}>
      {allFeed.some((entry) => entry.teamId) ? <FilterChips options={[match.home.shortName, match.away.shortName]} selected={teamId === match.home.id ? match.home.shortName : match.away.shortName} onSelect={(value) => setTeamId(value === match.home.shortName ? match.home.id : match.away.id)} label="Batting innings" /> : null}
      {feed.length === 0 ? (
      <EmptyPanel
        icon={MicIcon}
        spark={InsightsIcon}
        title={`${teamId === match.home.id ? match.home.shortName : match.away.shortName} commentary unavailable`}
        message="This committed package does not publish a commentary timeline for that innings."
      />
      ) : <FeedRows feed={feed} />}
    </div>
  );
}

function FeedRows({ feed }: { feed: NonNullable<MatchDetailScoreboard["feed"]> }) {
  const accentFor = (kind: string) =>
    kind === "wicket"
      ? "var(--ds-color-danger)"
      : kind === "score"
        ? accentVar("gold")
        : accentVar("cyan");
  return (
    <div className={styles.tight}>
      <SectionHeading label="MATCH FEED" />
      {feed.map((event) => (
        <StatsRow key={`${event.marker}-${event.text}`} accent={accentFor(event.kind)}>
          <span className={styles.eventRow}>
            <b className={styles.feedMarker} style={{ color: accentFor(event.kind) }}>{event.marker}</b>
            <span className={styles.eventCopy}>
              <strong style={{ whiteSpace: "normal", fontWeight: typography.weight.regular }}>{event.text}</strong>
            </span>
          </span>
        </StatsRow>
      ))}
    </div>
  );
}

function CricketRunRateChart({ match, scoreboard }: { match: SportMatch; scoreboard: MatchDetailScoreboard }) {
  const runRate = scoreboard.runRate ?? [];
  const [innings, setInnings] = useState<1 | 2>(1);
  const current = runRate.find((entry) => entry.innings === innings) ?? runRate[0];
  const [selected, setSelected] = useState<number | null>(null);
  if (!current) return null;
  const team = current.teamId === match.home.id ? match.home : match.away;
  const hasRequired = current.points.some((point) => point.required != null);
  return <section className={`${styles.tight} spanFull`}>
    <SectionHeading label="INNINGS RUN RATE" />
    <FilterChips options={["1ST INNINGS", "2ND INNINGS"]} selected={innings === 1 ? "1ST INNINGS" : "2ND INNINGS"} onSelect={(value) => { setInnings(value === "2ND INNINGS" ? 2 : 1); setSelected(null); }} label="Run rate innings" />
    <InteractiveLineChart
      series={[
        { id: "actual", label: `${team.shortName} ACTUAL`, values: current.points.map((point) => point.actual), color: team.color },
        ...(hasRequired ? [{ id: "required", label: "REQUIRED", values: current.points.map((point) => point.required ?? 0), color: "var(--ds-color-accent-pink)" }] : []),
      ]}
      markers={current.points.flatMap((point, index) => [
        ...(point.boundary ? [{ index, value: point.actual, label: `${point.boundary} at ${point.over.toFixed(1)} ov`, color: "var(--ds-color-accent-gold)" }] : []),
        ...(point.wicket ? [{ index, value: point.actual, label: `Wicket at ${point.over.toFixed(1)} ov`, color: team.color }] : []),
      ])}
      selectedIndex={selected}
      onSelectedIndexChange={setSelected}
      label={`${innings === 1 ? "First" : "Second"} innings run rate`}
      valueText={(value, index) => `${current.points[index]?.over.toFixed(1) ?? "0.0"} overs, ${team.shortName} ${value.toFixed(2)}${current.points[index]?.required == null ? "" : `, required ${current.points[index].required?.toFixed(2)}`}`}
      axisFormatter={(value) => `${value.toFixed(2)} RR`}
      height={260}
    />
  </section>;
}
