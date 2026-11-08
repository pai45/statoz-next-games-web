"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import { useState } from "react";

import { FilterChips, accentVar } from "@statoz/design-system/games";
import type { MatchDetailScoreboard, SportMatch } from "@/domain/matches";

import { BasketballStatsView } from "./basketball-stats-view";
import { CricketStatsView } from "./cricket-stats-view";
import { FootballStatsView } from "./football-stats-view";
import { MotorsportStatsView } from "./motorsport-stats-view";
import { CommentaryView, TimelineList } from "./match-report-parts";
import { MatchPitchView } from "./match-pitch-view";
import {
  EmptyPanel,
  MatchIntelPanel,
  MatchPulseHeader,
  SectionHeading,
  StatComparisonRow,
  StatsRow,
  TeamLegendRow,
} from "./match-stats-shell";
import { MatchTraceChart } from "./match-trace-chart";
import styles from "./match-stats.module.css";

/**
 * The STATS tab.
 *
 * Football, basketball and cricket each have a report of their own; tennis and
 * motorsport share the three-section one, which is where the race weekend's
 * sessions, standings and starting grid live.
 */

export function MatchScoreboard({
  match,
  scoreboard,
}: {
  match: SportMatch;
  scoreboard: MatchDetailScoreboard;
}) {
  if (match.sport === "football") return <FootballStatsView match={match} scoreboard={scoreboard} />;
  if (match.sport === "basketball") return <BasketballStatsView match={match} scoreboard={scoreboard} />;
  if (match.sport === "cricket") return <CricketStatsView match={match} scoreboard={scoreboard} />;
  if (match.sport === "motorsport" && scoreboard.race) return <MotorsportStatsView report={scoreboard.race} />;
  return <GenericStatsView match={match} scoreboard={scoreboard} />;
}

function GenericStatsView({
  match,
  scoreboard,
}: {
  match: SportMatch;
  scoreboard: MatchDetailScoreboard;
}) {
  const first = match.sport === "tennis" ? "SETS" : "FACTS";
  const tabs = [first, "LINEUP", "COMMENTARY"];
  const [tab, setTab] = useState(first);

  return (
    <div className={styles.statsView}>
      <FilterChips options={tabs} selected={tab} onSelect={setTab} label="Match report sections" />
      <div className={styles.statsScroll}>
        {tab === first ? <Facts match={match} scoreboard={scoreboard} /> : null}
        {tab === "LINEUP" ? (
          match.sport === "motorsport" ? (
            <StartingGrid scoreboard={scoreboard} />
          ) : (
            <MatchPitchView match={match} scoreboard={scoreboard} />
          )
        ) : null}
        {tab === "COMMENTARY" ? <CommentaryView commentary={scoreboard.commentary} /> : null}
      </div>
    </div>
  );
}

function Facts({ match, scoreboard }: { match: SportMatch; scoreboard: MatchDetailScoreboard }) {
  const [held, setHeld] = useState<string | null>(null);
  const sessions = (scoreboard.sessions ?? []).filter((session) => !isQualifying(session.label));

  return (
    <div className={styles.stack}>
      <div className="spanFull">
        <MatchPulseHeader
          match={match}
          title={`${match.home.name} vs ${match.away.name}`}
          pulse={scoreboard.pulse}
        />
      </div>

      <section className={styles.tight}>
        <SectionHeading label="MATCH INTEL" />
        <MatchIntelPanel match={match} intel={scoreboard.intel} />
      </section>

      <section className={styles.tight}>
        <SectionHeading label={match.sport === "tennis" ? "SET BY SET" : "SESSION SCORE"} />
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

      {scoreboard.trace ? (
        <div className="spanFull">
          <MatchTraceChart match={match} trace={scoreboard.trace} />
        </div>
      ) : null}

      {sessions.length > 0 ? (
        <section className={styles.tight}>
          <SectionHeading label="SESSION RESULTS" />
          {sessions.map((session) => (
            <StatsRow key={session.label} accent={accentVar("cyan")}>
              <b className={styles.rowLabel} style={{ color: accentVar("cyan") }}>{session.label}</b>
              {session.results.length === 0 ? (
                <small style={{ color: "var(--ds-color-text-muted)" }}>Not yet run.</small>
              ) : (
                session.results.map((result) => (
                  <span key={result} style={{ color: "var(--ds-color-text-default)", fontSize: typography.sizeRem.p13 }}>
                    {result}
                  </span>
                ))
              )}
            </StatsRow>
          ))}
        </section>
      ) : null}

      {scoreboard.driverStandings ? (
        <section className={styles.tight}>
          <SectionHeading label="DRIVER STANDINGS" />
          {scoreboard.driverStandings.map((driver, index) => (
            <StatsRow key={driver} accent={index < 3 ? accentVar("gold") : undefined}>
              <span className={styles.eventRow}>
                <b
                  className={styles.eventMinute}
                  style={{ color: index < 3 ? accentVar("gold") : "var(--ds-color-text-muted)" }}
                >
                  {index + 1}
                </b>
                <span className={styles.eventCopy}>
                  <strong>{driver}</strong>
                </span>
              </span>
            </StatsRow>
          ))}
        </section>
      ) : null}

      <section className={styles.tight}>
        <SectionHeading label="TEAM STATS" />
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

      <div className="spanFull">
        <TimelineList match={match} events={scoreboard.timeline} />
      </div>
    </div>
  );
}

/** Qualifying is the starting grid, so it lives on LINEUP rather than FACTS. */
function isQualifying(label: string): boolean {
  const name = label.toLowerCase().trim();
  return name.includes("qual") || name.includes("shootout") || name === "q" || name === "sq";
}

function StartingGrid({ scoreboard }: { scoreboard: MatchDetailScoreboard }) {
  const sessions = (scoreboard.sessions ?? []).filter((session) => isQualifying(session.label));
  if (sessions.length === 0) {
    return (
      <EmptyPanel
        title="Grid not set"
        message="Qualifying results will lock the starting grid here once the session runs."
      />
    );
  }
  if (sessions.every((session) => session.results.length === 0)) {
    return (
      <EmptyPanel
        title="Qualifying pending"
        message="The session is on the schedule — grid order drops here when times are in."
      />
    );
  }

  return (
    <div className={styles.stack}>
      {sessions.map((session) => {
        const sprint = session.label.toLowerCase().includes("sprint");
        const accent = sprint ? accentVar("pink") : accentVar("cyan");
        return (
          <section key={session.label} className={`${styles.tight} spanFull`}>
            <SectionHeading label={sprint ? "SPRINT QUALIFYING" : "STARTING GRID"} />
            {session.results.map((entry, index) => {
              const parsed = parseGridEntry(entry);
              const pole = index === 0 && !sprint;
              return (
                <StatsRow key={entry} accent={pole ? accentVar("gold") : accent} selected={pole}>
                  <span className={styles.eventRow}>
                    <b
                      className={styles.eventMinute}
                      style={{ color: pole ? accentVar("gold") : index < 3 ? accent : "var(--ds-color-text-muted)" }}
                    >
                      P{parsed.position ?? index + 1}
                    </b>
                    <span className={styles.eventCopy}>
                      <strong>{parsed.driver}</strong>
                      {parsed.constructor ? <small>{parsed.constructor}</small> : null}
                    </span>
                    {pole ? (
                      <b className={styles.rowLabel} style={{ color: accentVar("gold") }}>POLE</b>
                    ) : null}
                    {parsed.time ? (
                      <b
                        className="ds-tabular font-display"
                        style={{ fontSize: typography.sizeRem.p12, color: pole ? accentVar("gold") : "var(--ds-color-text-muted)" }}
                      >
                        {parsed.time}
                      </b>
                    ) : null}
                  </span>
                </StatsRow>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

/** `1. Verstappen · Red Bull (1:12.844)` and `P1 Verstappen` both parse here. */
function parseGridEntry(entry: string): {
  position: number | null;
  driver: string;
  constructor: string | null;
  time: string | null;
} {
  const positionMatch = /^\s*P?(\d+)[.)]?\s*/.exec(entry);
  const position = positionMatch ? Number.parseInt(positionMatch[1], 10) : null;
  const stripped = entry.replace(/^\s*P?\d+[.)]?\s*/, "").trim();
  const timeMatch = /\(([^)]+)\)\s*$/.exec(stripped);
  const time = timeMatch ? timeMatch[1].trim() : null;
  const withoutTime = timeMatch ? stripped.slice(0, timeMatch.index).trim() : stripped;
  const parts = withoutTime.split(" · ");
  const driver = parts[0]?.trim() || entry;
  const constructor = parts.length > 1 && parts[1].trim() ? parts[1].trim() : null;
  return { position, driver, constructor, time };
}
