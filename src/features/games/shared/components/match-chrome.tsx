import type { ReactNode } from "react";

import { accentVar, withAlpha } from "@statoz/design-system/games";

/**
 * The frame every in-play phase wears: a title, a way out, the running score,
 * and one action docked at the bottom.
 *
 * Flutter's `MatchPhaseScaffold` does the same job for every game in the app.
 * It lived inside the shootout until Final Over became the second game to want
 * it; it sits here rather than in the design system because it knows what a
 * match is, which the design system deliberately does not.
 */

export type MatchScaffoldProps = {
  title: string;
  /** The `// GOAL` line under the title. */
  subtitle: string;
  scoreLabel?: string;
  /** What the close button announces. Names the game, not the screen. */
  quitLabel?: string;
  onQuit: () => void;
  children: ReactNode;
  bottomAction?: ReactNode;
};

export function MatchScaffold({
  title,
  subtitle,
  scoreLabel,
  quitLabel = "Quit match",
  onQuit,
  children,
  bottomAction,
}: MatchScaffoldProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header
        className="flex shrink-0 items-center gap-3 px-4 py-3"
        style={{
          borderBottom: `1px solid ${withAlpha(accentVar("cyan"), 0.16)}`,
        }}
      >
        <button
          type="button"
          onClick={onQuit}
          aria-label={quitLabel}
          className="grid size-11 shrink-0 cursor-pointer place-items-center"
          style={{ color: accentVar("cyan") }}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden fill="none">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="min-w-0 flex-1">
          <h1
            className="truncate font-display font-black leading-compact"
            style={{
              fontSize: "var(--ds-text-sm)",
              letterSpacing: "var(--ds-tracking-display)",
            }}
          >
            {title}
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

        {scoreLabel ? (
          <span
            className="shrink-0 px-3 py-2 font-display font-black leading-compact"
            style={{
              fontSize: "var(--ds-text-2xs)",
              letterSpacing: "var(--ds-tracking-ultra)",
              color: accentVar("cyan"),
              background: withAlpha(accentVar("cyan"), 0.1),
              border: `1px solid ${withAlpha(accentVar("cyan"), 0.32)}`,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {scoreLabel}
          </span>
        ) : null}
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3.5 px-4 py-4">
        {children}
      </div>

      {bottomAction ? (
        <div className="sticky bottom-0 mx-auto w-full max-w-md shrink-0 px-4 pb-8">
          {bottomAction}
        </div>
      ) : null}
    </div>
  );
}

/**
 * The chamfered plate the panels on these screens sit on. Square-ish corners
 * and a tinted edge, matching the HUD language the rest of the app uses.
 */
export function MatchPanel({
  accent,
  children,
  className,
}: {
  accent: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={["p-3", className ?? ""].filter(Boolean).join(" ")}
      style={{
        background: `linear-gradient(160deg, ${withAlpha("var(--ds-color-background-secondary)", 0.72)}, ${withAlpha("var(--ds-color-background-primary)", 0.42)})`,
        border: `1px solid ${withAlpha(accent, 0.28)}`,
        boxShadow: `0 0 18px ${withAlpha(accent, 0.1)}`,
      }}
    >
      {children}
    </div>
  );
}
