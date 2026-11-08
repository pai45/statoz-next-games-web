"use client";

import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react";

import type { LeaderboardLeague } from "../leagues";
import styles from "./leaderboard.module.css";

export function LeagueDial({ leagues, selected, onSelect }: { leagues: LeaderboardLeague[]; selected: string; onSelect: (id: string) => void }) {
  const rail = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number } | null>(null);
  useEffect(() => { rail.current?.querySelector<HTMLElement>(`[data-league="${selected}"]`)?.scrollIntoView({ inline: "center", block: "nearest" }); }, [selected]);
  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const key = event.key;
    let next = index;
    if (key === "ArrowRight") next = Math.min(leagues.length - 1, index + 1);
    else if (key === "ArrowLeft") next = Math.max(0, index - 1);
    else if (key === "Home") next = 0;
    else if (key === "End") next = leagues.length - 1;
    else return;
    event.preventDefault(); onSelect(leagues[next].id);
    rail.current?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
  };
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => { if (drag.current && rail.current) rail.current.scrollLeft = drag.current.left - (event.clientX - drag.current.x); };
  return <div ref={rail} className={styles.leagueDial} role="tablist" aria-label="League" onPointerDown={(event) => { drag.current = { x: event.clientX, left: event.currentTarget.scrollLeft }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={pointerMove} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
    {leagues.map((league, index) => <button key={league.id} type="button" role="tab" data-league={league.id} aria-selected={league.id === selected} tabIndex={league.id === selected ? 0 : -1} onClick={() => onSelect(league.id)} onKeyDown={(event) => move(event, index)}>{league.label}</button>)}
  </div>;
}
