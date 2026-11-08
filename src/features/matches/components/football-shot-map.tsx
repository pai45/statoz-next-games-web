"use client";

import { useMemo, useState, type CSSProperties } from "react";

import { FilterChips, GoalMouthDiagram } from "@statoz/design-system/games";
import type { MatchShot, ShotOutcome, SportMatch } from "@/domain/matches";

import { EmptyPanel, StatsRow, TeamLegendRow } from "./match-stats-shell";
import styles from "./football-shot-map.module.css";

const filters = ["ALL", "1ST", "2ND", "GOALS"];

function shotLabel(outcome: ShotOutcome): string {
  if (outcome === "saved") return "ON TARGET";
  if (outcome === "missed") return "OFF TARGET";
  return outcome.toUpperCase();
}

/**
 * The feed reports every attempt in the shooter's attacking frame. Place the
 * home team on the left and the away team on the right to match the team key.
 */
function pitchPosition(shot: MatchShot): { left: number; top: number } {
  return shot.side === "home"
    ? { left: 100 - shot.x, top: shot.y }
    : { left: shot.x, top: 100 - shot.y };
}

/** Full-pitch attempt plot, matching the football report in the Flutter app. */
export function FootballShotMap({ match, shots }: { match: SportMatch; shots: MatchShot[] }) {
  const [filter, setFilter] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const homeColor = match.home.secondaryTextColor ?? match.home.color;
  const awayColor = match.away.secondaryTextColor ?? match.away.color;
  const visible = useMemo(
    () => shots.filter((shot) => (
      filter === "ALL"
      || (filter === "GOALS" && shot.outcome === "goal")
      || (filter === "1ST" && shot.period === 1)
      || (filter === "2ND" && shot.period === 2)
    )),
    [filter, shots],
  );
  const selected = visible.find((shot) => shot.id === selectedId);

  if (!shots.length) {
    return <EmptyPanel title="Shot map unavailable" message="Tracked shot coordinates were not published for this match." />;
  }

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <h3>SHOT MAP</h3>
        <span>{visible.length} ATTEMPTS</span>
      </header>

      <FilterChips
        options={filters}
        selected={filter}
        onSelect={(value) => {
          setFilter(value);
          setSelectedId(null);
        }}
        label="Shot map period"
        className={styles.filters}
      />

      <div className={styles.pitch} aria-label={`${visible.length} tracked shots on a full pitch`}>
        <svg viewBox="0 0 105 68" preserveAspectRatio="none" aria-hidden="true">
          <rect x="0.5" y="0.5" width="104" height="67" className={styles.pitchLine} />
          <path d="M52.5 .5V67.5" className={styles.pitchLine} />
          <circle cx="52.5" cy="34" r="9.15" className={styles.pitchFaint} />
          <circle cx="52.5" cy="34" r=".65" className={styles.pitchSpot} />
          <path d="M.5 13.84H17V54.16H.5M104.5 13.84H88V54.16H104.5" className={styles.pitchLine} />
          <path d="M.5 24.84H6V43.16H.5M104.5 24.84H99V43.16H104.5" className={styles.pitchFaint} />
          <circle cx="11" cy="34" r=".55" className={styles.pitchSpot} />
          <circle cx="94" cy="34" r=".55" className={styles.pitchSpot} />
          <path d="M17 25.9A9.15 9.15 0 0 1 17 42.1M88 25.9A9.15 9.15 0 0 0 88 42.1" className={styles.pitchFaint} />
          <path d="M.5 30.34H-1.5V37.66H.5M104.5 30.34H106.5V37.66H104.5" className={styles.goalLine} />
        </svg>

        {visible.map((shot) => {
          const color = shot.side === "home" ? homeColor : awayColor;
          const isSelected = selected?.id === shot.id;
          const position = pitchPosition(shot);
          return (
            <button
              key={shot.id}
              type="button"
              className={styles.shot}
              data-outcome={shot.outcome}
              data-selected={isSelected || undefined}
              style={{
                left: `${Math.min(99, Math.max(1, position.left))}%`,
                top: `${Math.min(98, Math.max(2, position.top))}%`,
                "--shot-color": color,
              } as CSSProperties}
              onClick={() => setSelectedId((current) => current === shot.id ? null : shot.id)}
              aria-pressed={isSelected}
              aria-label={`${shot.player}, ${shotLabel(shot.outcome)}, ${shot.minute} minute`}
            >
              <span />
            </button>
          );
        })}

        {visible.length === 0 ? <p className={styles.empty}>NO PLOTTED ATTEMPTS IN THIS FILTER</p> : null}
      </div>

      <TeamLegendRow match={match} />
      <div className={styles.outcomes} aria-label="Shot outcome legend">
        {(["goal", "saved", "missed", "blocked"] as const).map((outcome) => (
          <span key={outcome} data-outcome={outcome}>
            <i /> {shotLabel(outcome)}
          </span>
        ))}
      </div>

      {selected ? (
        <StatsRow accent={selected.side === "home" ? homeColor : awayColor} selected className={styles.detail}>
          <div className={styles.detailCopy}>
            <header>
              <b>{selected.minute}&prime;</b>
              <span>{shotLabel(selected.outcome)}</span>
            </header>
            <h4>{selected.player}</h4>
            <p>{selected.detail}</p>
          </div>
          <GoalMouthDiagram
            placement={selected.goalPlacement}
            caption={selected.outcome === "blocked" ? "BLOCKED // NEVER REACHED THE GOAL" : undefined}
          />
        </StatsRow>
      ) : null}

      <p className={styles.caption}>
        TRACKED SHOT POSITIONS // {match.home.shortName.toUpperCase()} ATTACK LEFT // {match.away.shortName.toUpperCase()} ATTACK RIGHT
      </p>
    </section>
  );
}
