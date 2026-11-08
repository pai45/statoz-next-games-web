"use client";

import { useEffect, useState } from "react";

import { Button, Glyph, accentVar, feedbackVar, withAlpha } from "@statoz/design-system/games";

import { usePrefersReducedMotion } from "../../state/use-reduced-motion";

import { MatchmakingArenaBackground } from "./matchmaking-arena-background";
import { MatchmakingPlayerBanner } from "./matchmaking-player-banner";
import {
  foundHoldMs,
  reducedMotionHoldMs,
  rivalRevealMs,
  searchMs,
} from "./constants";
import styles from "./matchmaking.module.css";
import type { GameMatchmakingConfig } from "./types";

/**
 * The matchmaking beat: the player's banner, a turning VS, a queue that scans,
 * and the rival dropping into the slot the scan leaves behind.
 *
 * The port of Flutter's `GameMatchmakingView`. It owns nothing past the lock —
 * `GameMatchGate` decides what happens next — so a mode that wants the reveal
 * without a countdown, as the shootout does, can use this on its own.
 *
 * Someone who asked for less motion gets the beat collapsed to a held frame
 * rather than a cinematic with the motion taken out, which is what Flutter's
 * `disableAnimations` path does.
 */

export type GameMatchmakingViewProps = {
  config: GameMatchmakingConfig;
  /** The rival is locked and the hold after it is over. */
  onMatched: () => void;
  onCancel: () => void;
};

export function GameMatchmakingView({
  config,
  onMatched,
  onCancel,
}: GameMatchmakingViewProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [scanned, setScanned] = useState(false);

  /* Less motion means the scan never runs, so the rival is already standing there. */
  const locked = reducedMotion || scanned;

  const searchAccent = config.searchAccent ?? accentVar("cyan");
  const lockedAccent = config.lockedAccent ?? accentVar("gold");

  useEffect(() => {
    if (reducedMotion) return;
    const timer = window.setTimeout(() => setScanned(true), searchMs);
    return () => window.clearTimeout(timer);
  }, [reducedMotion]);

  useEffect(() => {
    if (!locked) return;
    const timer = window.setTimeout(
      onMatched,
      reducedMotion ? reducedMotionHoldMs : rivalRevealMs + foundHoldMs,
    );
    return () => window.clearTimeout(timer);
  }, [locked, onMatched, reducedMotion]);

  return (
    <div className="relative flex min-h-dvh flex-col">
      <MatchmakingArenaBackground asset={config.backgroundAsset} />

      <MatchmakingHeader
        title={config.title}
        subtitle={config.subtitle ?? "// MATCHMAKING"}
      />

      <div
        className="relative z-10 flex flex-1 flex-col justify-center px-4 pt-5"
        style={{ paddingBottom: "calc(7.5rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex w-full max-w-105 flex-col" aria-live="polite">
          <MatchmakingPlayerBanner fighter={config.player} accent={searchAccent} />

          <div className="mt-6 flex justify-center">
            <VsMedallion accent={locked ? lockedAccent : searchAccent} />
          </div>

          {/*
           * A fixed slot, so the rival's banner lands exactly where the queue
           * status was rather than pushing the medallion up the screen.
           */}
          <div
            className="mt-6 flex min-h-34 flex-col justify-center"
            style={{ ["--mm-reveal" as string]: `${rivalRevealMs}ms` }}
          >
            {locked ? (
              <MatchmakingPlayerBanner
                className={styles.reveal}
                fighter={config.opponent}
                accent={lockedAccent}
                mirrored
              />
            ) : (
              <SearchingStatus
                accent={searchAccent}
                queueLabel={config.queueLabel ?? "SCANNING GLOBAL QUEUE"}
              />
            )}
          </div>
        </div>
      </div>

      <CancelDock onCancel={onCancel} />
    </div>
  );
}

/* ---- Chrome ---------------------------------------------------------------- */

/** Title and status line. The way out is the dock, so the bar carries no button. */
function MatchmakingHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <header
      className="relative z-10 flex shrink-0 items-center px-4 py-3.5"
      style={{ borderBottom: `1px solid ${withAlpha(accentVar("cyan"), 0.16)}` }}
    >
      <div className="min-w-0 flex-1">
        <h1
          className="flex items-baseline gap-1.5 font-display font-black leading-compact"
          style={{
            fontSize: "var(--ds-text-badge)",
            letterSpacing: "var(--ds-tracking-display)",
          }}
        >
          <span aria-hidden style={{ color: accentVar("cyan") }}>
            /
          </span>
          <span className="truncate">{title.toUpperCase()}</span>
        </h1>
        <p
          className="mt-1 truncate font-bold leading-compact text-muted"
          style={{
            fontSize: "var(--ds-text-2xs)",
            letterSpacing: "var(--ds-tracking-wide)",
          }}
        >
          {subtitle}
        </p>
      </div>
    </header>
  );
}

/* ---- The queue ------------------------------------------------------------- */

/** What the screen says while the queue is still looking. */
function SearchingStatus({
  accent,
  queueLabel,
}: {
  accent: string;
  queueLabel: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      {/*
       * Capped short so the line breaks in two, the way the phone screen this
       * came from does — the break is part of how the beat reads.
       */}
      <p
        className="max-w-70 font-display font-black leading-tight"
        style={{
          fontSize: "var(--ds-text-2xl)",
          letterSpacing: "var(--ds-tracking-display)",
        }}
      >
        SEARCHING FOR OPPONENT...
      </p>

      <div
        aria-hidden
        className="mt-3.5 h-1.5 w-55 overflow-hidden rounded-sm"
        style={{ background: withAlpha("var(--ds-color-border-strong)", 0.45) }}
      >
        <div
          className={`${styles.scan} h-full rounded-sm`}
          style={{
            background: accent,
            boxShadow: `0 0 6px -1px ${withAlpha(accent, 0.3)}`,
            ["--mm-search" as string]: `${searchMs}ms`,
          }}
        />
      </div>

      <p
        className="mt-2.5 font-display font-black leading-compact text-muted"
        style={{
          fontSize: "var(--ds-text-nano)",
          letterSpacing: "var(--ds-tracking-ultra)",
        }}
      >
        {queueLabel}
      </p>
    </div>
  );
}

/**
 * The turning medallion between the two banners.
 *
 * Flutter paints the orbit with a `CustomPainter`; it is pure geometry — a
 * hairline ring and two opposed arcs — so it is inline SVG here, turned by one
 * keyframe rather than by an animation controller.
 */
function VsMedallion({ accent }: { accent: string }) {
  return (
    <div
      className="relative grid size-29 place-items-center"
      style={{
        ["--mm-accent" as string]: accent,
        ["--mm-pulse" as string]: "1600ms",
      }}
    >
      <svg
        aria-hidden
        viewBox="0 0 116 116"
        className={`${styles.orbit} absolute inset-0 size-full`}
        fill="none"
        stroke={accent}
      >
        <circle cx="58" cy="58" r="46" strokeWidth="1.5" opacity="0.32" />
        <path
          d="M110.92 47.27 A 54 54 0 0 1 93.64 98.57"
          strokeWidth="3"
          strokeLinecap="square"
          opacity="0.72"
        />
        <path
          d="M5.08 68.73 A 54 54 0 0 1 22.36 17.43"
          strokeWidth="3"
          strokeLinecap="square"
          opacity="0.72"
        />
      </svg>

      <span
        className={`${styles.medallionPulse} grid size-20.5 place-items-center rounded-pill font-display font-black leading-compact transition-colors duration-300`}
        style={{
          background: "var(--ds-color-background-primary)",
          border: `2px solid ${accent}`,
          fontSize: "var(--ds-text-2xl)",
        }}
      >
        VS
      </span>
    </div>
  );
}

/* ---- The way out ----------------------------------------------------------- */

/** The one control on the screen, docked over a fade into the page bed. */
function CancelDock({ onCancel }: { onCancel: () => void }) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 z-10 px-6 pt-4.5"
      style={{
        paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
        background: `linear-gradient(to bottom, transparent, ${withAlpha("var(--ds-color-background-primary)", 0.88)} 55%, var(--ds-color-background-primary))`,
      }}
    >
      <div className="mx-auto w-full max-w-65">
        <Button
          accent={feedbackVar("danger")}
          size="lg"
          fullWidth
          leadingIcon={<Glyph name="close" size={18} />}
          onClick={onCancel}
        >
          CANCEL
        </Button>
      </div>
    </div>
  );
}
