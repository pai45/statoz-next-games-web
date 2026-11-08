"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { accentVar, ArrowLeftIcon, Glyph, withAlpha, type GlyphName } from "@statoz/design-system/games";

import styles from "./football-bingo.module.css";

/**
 * The small pieces every Football Bingo screen is built from — the app's
 * `_FlatPanel`, `_TelemetryStrip`, header bar and label type, in one place
 * because all three screens wear them.
 */

/** Staggers a `CyberSlideUpFadeIn`. */
export function enterAfter(delayMs: number, offset = 18): CSSProperties {
  return {
    "--enter-delay": `${delayMs}ms`,
    "--enter-offset": `${offset}px`,
  } as CSSProperties;
}

/** The app's `_FlatPanel`: a flat plate with a one-pixel edge. */
export function FlatPanel({
  children,
  borderColor = "var(--ds-color-border-muted)",
  className,
}: {
  children: ReactNode;
  borderColor?: string;
  className?: string;
}) {
  return (
    <div
      className={["p-3.5", className ?? ""].filter(Boolean).join(" ")}
      style={{
        background: withAlpha("var(--ds-color-background-secondary)", 0.86),
        border: `1px solid ${borderColor}`,
      }}
    >
      {children}
    </div>
  );
}

/** The all-caps micro type the app calls `Cyber.label`. */
export function Label({
  children,
  color = "var(--ds-color-text-muted)",
  tracking = "var(--ds-tracking-label)",
  className,
}: {
  children: ReactNode;
  color?: string;
  tracking?: string;
  className?: string;
}) {
  return (
    <p
      className={["font-bold leading-compact", className ?? ""]
        .filter(Boolean)
        .join(" ")}
      style={{ color, fontSize: "var(--ds-text-2xs)", letterSpacing: tracking }}
    >
      {children}
    </p>
  );
}

/** `ONLINE ———— SYS://3X3 BINGO GAME | 1.0.0`. */
export function TelemetryStrip() {
  const cyan = accentVar("cyan");
  const lime = accentVar("lime");

  return (
    <div
      className="flex h-7.5 items-center gap-2 px-2.5"
      style={{
        background: withAlpha("var(--ds-color-background-muted)", 0.82),
        borderLeft: `1px solid ${withAlpha(cyan, 0.35)}`,
        borderRight: `1px solid ${withAlpha(cyan, 0.35)}`,
      }}
    >
      <span
        className={`${styles.statusDot} block size-[7px] shrink-0 rounded-full`}
        style={{ background: lime }}
      />
      <span
        className="font-display font-black leading-compact"
        style={{ color: lime, fontSize: "var(--ds-text-2xs)" }}
      >
        ONLINE
      </span>
      <span className="h-px flex-1" style={{ background: withAlpha(cyan, 0.18) }} />
      <span
        className="truncate font-bold leading-compact text-muted"
        style={{
          fontSize: "var(--ds-text-2xs)",
          letterSpacing: "var(--ds-tracking-label)",
        }}
      >
        SYS://3X3 BINGO GAME | 1.0.0
      </span>
    </div>
  );
}

/**
 * The bar at the top of both full screens: a way back, an optional two-line
 * title, and the game's mark on the right.
 */
export function BingoHeader({
  eyebrow,
  title,
  onBack,
  backHref,
  backLabel,
  markGlyph = "grid_on",
}: {
  eyebrow?: string;
  title?: string;
  /** Ignored when `backHref` is given. */
  onBack?: () => void;
  /** Leaving the game entirely is a link, so it behaves like one. */
  backHref?: string;
  backLabel: string;
  markGlyph?: GlyphName;
}) {
  const backClass = `${styles.link} grid size-11 shrink-0 cursor-pointer place-items-center`;
  return (
    <header
      className="flex h-16.5 shrink-0 items-center gap-1 px-3.5"
      style={{ borderBottom: "1px solid var(--ds-color-border-muted)" }}
    >
      {backHref === undefined ? (
        <button type="button" onClick={onBack} aria-label={backLabel} className={backClass}>
          <ArrowLeftIcon size={22} />
        </button>
      ) : (
        <Link href={backHref} aria-label={backLabel} className={backClass}>
          <ArrowLeftIcon size={22} />
        </Link>
      )}

      {title === undefined ? (
        <span className="flex-1" />
      ) : (
        <div className="min-w-0 flex-1">
          {eyebrow === undefined ? null : <Label color="var(--ds-color-text-default)">{eyebrow}</Label>}
          <h1
            className="mt-1.5 truncate font-display font-black leading-compact"
            style={{
              fontSize: "var(--ds-text-xl)",
              letterSpacing: "var(--ds-tracking-display)",
            }}
          >
            {title}
          </h1>
        </div>
      )}

      <span className="shrink-0" style={{ color: accentVar("orange") }}>
        <Glyph name={markGlyph} size={24} />
      </span>
    </header>
  );
}

/**
 * The app's snackbar, as a plate above the lifeline dock. Keyed by the caller
 * so a repeat of the same message replays the animation.
 */
export function Toast({ message }: { message: string }) {
  return (
    <div
      className={`${styles.toast} pointer-events-none absolute inset-x-4 bottom-3 z-30 px-3.5 py-2.5`}
      role="status"
      style={{
        background: withAlpha("var(--ds-color-background-elevated)", 0.96),
        border: `1px solid ${withAlpha(accentVar("orange"), 0.5)}`,
      }}
    >
      <p
        className="text-center leading-body"
        style={{ fontSize: "var(--ds-text-xs)" }}
      >
        {message}
      </p>
    </div>
  );
}
