"use client";
/* eslint-disable react/jsx-no-comment-textnodes */

import { useMemo, useState, type CSSProperties } from "react";

import { FilterChips } from "@statoz/design-system/games";
import type { BasketballScoringEvent, SportMatch } from "@/domain/matches";

import { EmptyPanel, SectionHeading } from "./match-stats-shell";
import styles from "./basketball-shot-map.module.css";

const filters = ["ALL", "HOME", "AWAY", "3PT"];

export function BasketballShotMap({ match, shots }: { match: SportMatch; shots: BasketballScoringEvent[] }) {
  const [filter, setFilter] = useState(filters[0]);
  const visible = useMemo(() => shots.filter((shot) => filter === "ALL" || filter === "3PT" && shot.points === 3 || filter === "HOME" && shot.side === "home" || filter === "AWAY" && shot.side === "away"), [filter, shots]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = visible.find((shot) => shot.id === selectedId) ?? visible[0];
  if (!shots.length) return <EmptyPanel title="Scoring map unavailable" message="This package does not publish shot coordinates." />;
  return <section className="spanFull">
    <SectionHeading label="SCORING MAP" />
    <FilterChips options={filters} selected={filter} onSelect={(value) => { setFilter(value); setSelectedId(null); }} label="Scoring map filter" />
    <div className={styles.court}>
      <svg viewBox="0 0 50 47" preserveAspectRatio="none" aria-hidden="true">
        <path d="M17 0V19H33V0 M17 19A8 8 0 0 0 33 19 M22 5.25A3 3 0 0 0 28 5.25 M3 0V14 A23.75 23.75 0 0 0 47 14V0" />
        <line x1="22" y1="5.25" x2="28" y2="5.25" />
      </svg>
      {visible.map((shot) => <button key={shot.id} type="button" className={shot.points === 3 ? styles.three : styles.two} aria-label={`${shot.player}, ${shot.made ? "made" : "missed"} ${shot.points} point shot`} aria-pressed={shot.id === selected?.id} onClick={() => setSelectedId(shot.id)} style={{ left: `${Math.min(100, Math.max(0, shot.x / 50 * 100))}%`, bottom: `${Math.min(100, Math.max(0, (shot.y + 5.25) / 47 * 100))}%`, "--shot-color": shot.side === "home" ? match.home.color : match.away.color } as CSSProperties} />)}
    </div>
    <div className={styles.legend}><span style={{ color: match.home.color }}>{match.home.shortName}</span><span style={{ color: match.away.color }}>{match.away.shortName}</span><small>FILLED 2PT // RING 3PT</small></div>
    {selected ? <article className={styles.readout}><b>{selected.player}</b><span>Q{selected.period} {selected.clock} // {selected.made ? "MADE" : "MISSED"} {selected.points}PT</span><p>{selected.text}</p></article> : null}
  </section>;
}
