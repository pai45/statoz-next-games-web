"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";

import { FilterChips, FullscreenExitIcon, FullscreenIcon } from "@statoz/design-system/games";

import type { MatchTrace, SportMatch } from "@/domain/matches";

import styles from "./match-stats.module.css";

/**
 * A two-sided trace: both teams on one axis, scrubbable, with the events that
 * happened along it pinned to their sample.
 *
 * The design system's chart draws one series and is shared by XP and odds; a
 * match trace is always a contest between two sides and knows which team each
 * line belongs to, so it lives with the feature that knows that.
 */

const viewWidth = 1000;
const viewHeight = 220;
const inningsModes = ["FULL GAME", "POWERPLAY", "DEATH OVERS"] as const;

type InningsMode = (typeof inningsModes)[number];

function phaseBounds(mode: InningsMode, pointCount: number) {
  if (mode === "POWERPLAY") return { start: 0, end: Math.min(6, pointCount) };
  if (mode === "DEATH OVERS") return { start: Math.max(0, pointCount - 4), end: pointCount };
  return { start: 0, end: pointCount };
}

export function MatchTraceChart({
  match,
  trace,
  homeLabel,
  awayLabel,
  showInningsModes = false,
}: {
  match: SportMatch;
  trace: MatchTrace;
  homeLabel?: string;
  awayLabel?: string;
  /** Adds full-game, powerplay, and death-over views plus native fullscreen. */
  showInningsModes?: boolean;
}) {
  const canvas = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const sourcePoints = Math.max(trace.home.length, trace.away.length, 1);
  const [mode, setMode] = useState<InningsMode>(inningsModes[0]);
  const [selected, setSelected] = useState(sourcePoints - 1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { start, end } = phaseBounds(mode, sourcePoints);
  const home = trace.home.slice(start, end);
  const away = trace.away.slice(start, end);
  const ticks = trace.ticks.slice(start, end);
  const markers = (trace.markers ?? [])
    .filter((marker) => marker.index >= start && marker.index < end)
    .map((marker) => ({ ...marker, index: marker.index - start }));
  const points = Math.max(home.length, away.length, 1);
  const index = Math.min(Math.max(selected, 0), Math.max(0, points - 1));
  const homeColor = match.home.secondaryTextColor ?? match.home.color;
  const awayColor = match.away.secondaryTextColor ?? match.away.color;

  useEffect(() => {
    const updateFullscreenState = () => {
      setIsFullscreen(document.fullscreenElement === panel.current);
    };
    document.addEventListener("fullscreenchange", updateFullscreenState);
    return () => document.removeEventListener("fullscreenchange", updateFullscreenState);
  }, []);

  const all = [...home, ...away];
  const min = Math.min(...all, 0);
  const max = Math.max(...all, 1);
  const spread = Math.max(1, max - min);
  const x = (i: number) => (points <= 1 ? viewWidth : (viewWidth * i) / (points - 1));
  const y = (value: number) => viewHeight - ((value - min) / spread) * viewHeight;
  const path = (values: number[]) =>
    values.map((value, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(value).toFixed(1)}`).join(" ");

  const scrub = (event: PointerEvent<HTMLDivElement>) => {
    const rect = canvas.current?.getBoundingClientRect();
    if (!rect) return;
    const percent = Math.min(1, Math.max(0, (event.clientX - rect.left) / Math.max(1, rect.width)));
    setSelected(Math.round(percent * (points - 1)));
  };

  const selectMode = (nextMode: string) => {
    const next = nextMode as InningsMode;
    const bounds = phaseBounds(next, sourcePoints);
    setMode(next);
    setSelected(Math.max(0, bounds.end - bounds.start - 1));
  };

  const toggleFullscreen = async () => {
    if (!panel.current) return;
    try {
      if (document.fullscreenElement === panel.current) {
        await document.exitFullscreen();
      } else {
        if (document.fullscreenElement) await document.exitFullscreen();
        await panel.current.requestFullscreen();
      }
    } catch {
      // The browser may reject fullscreen when device policy disables it.
    }
  };

  return (
    <section ref={panel} className={styles.tracePanel}>
      <header className={styles.traceHead}>
        <span className={styles.traceTitleRow}>
          <b>{trace.title}</b>
          {showInningsModes ? (
            <span className={styles.traceActions}>
              <button
                type="button"
                className={styles.traceFullscreen}
                aria-label={isFullscreen ? "Exit run race fullscreen" : "Open run race fullscreen"}
                aria-pressed={isFullscreen}
                onClick={toggleFullscreen}
              >
                {isFullscreen ? <FullscreenExitIcon size={18} /> : <FullscreenIcon size={18} />}
              </button>
              <small>{points} OVERS</small>
            </span>
          ) : null}
        </span>
        {showInningsModes ? (
          <FilterChips
            options={[...inningsModes]}
            selected={mode}
            onSelect={selectMode}
            label="Run race period"
            className={styles.traceModes}
          />
        ) : null}
        <span className={styles.traceReadout}>
          <span style={{ color: homeColor }} className="ds-tabular">
            {homeLabel ?? match.home.shortName} {home[index] ?? 0}
          </span>
          <small>{ticks[index] ?? ""}</small>
          <span style={{ color: awayColor }} className="ds-tabular">
            {awayLabel ?? match.away.shortName} {away[index] ?? 0}
          </span>
        </span>
      </header>

      <div
        ref={canvas}
        className={styles.traceCanvas}
        role="slider"
        tabIndex={0}
        aria-label={`${trace.title} scrubber`}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, points - 1)}
        aria-valuenow={index}
        aria-valuetext={`${ticks[index] ?? index}: ${match.home.shortName} ${home[index] ?? 0} ${trace.unit}, ${match.away.shortName} ${away[index] ?? 0} ${trace.unit}`}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          scrub(event);
        }}
        onPointerMove={(event) => {
          if (event.buttons === 1) scrub(event);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") setSelected((value) => Math.min(points - 1, value + 1));
          if (event.key === "ArrowLeft") setSelected((value) => Math.max(0, value - 1));
        }}
      >
        <svg viewBox={`0 0 ${viewWidth} ${viewHeight}`} preserveAspectRatio="none" aria-hidden="true">
          <path d={path(away)} fill="none" stroke={awayColor} strokeWidth={3} vectorEffect="non-scaling-stroke" />
          <path d={path(home)} fill="none" stroke={homeColor} strokeWidth={3} vectorEffect="non-scaling-stroke" />
        </svg>

        <span
          className={styles.traceGuide}
          style={{ left: `${(x(index) / viewWidth) * 100}%` }}
          aria-hidden="true"
        />

        {markers.map((marker) => (
          <span
            key={`${marker.index}-${marker.label}`}
            className={[styles.traceMarker, marker.decisive ? styles.traceMarkerFocal : ""].filter(Boolean).join(" ")}
            style={{
              left: `${(x(Math.min(marker.index, points - 1)) / viewWidth) * 100}%`,
              "--marker-color": marker.side === "home" ? homeColor : awayColor,
            } as CSSProperties}
            title={marker.label}
          />
        ))}
      </div>

      <footer className={styles.traceAxis}>
        <span>{ticks[0]}</span>
        <span>{ticks[Math.floor(points / 2)]}</span>
        <span>{ticks.at(-1)}</span>
      </footer>
    </section>
  );
}
