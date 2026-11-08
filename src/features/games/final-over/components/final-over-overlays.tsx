"use client";

import { useEffect, type ReactNode } from "react";

import {
  accentVar,
  Button,
  feedbackVar,
  Glyph,
  hudChamferPath,
  withAlpha,
} from "@statoz/design-system/games";

import { bowlerRevealMs } from "../constants";

import styles from "./final-over.module.css";

/**
 * The beats that stop the chase — the web port of `final_over_overlays.dart`,
 * plus the exit confirmation the match screen puts up.
 */

function Panel({
  accent,
  glow = false,
  children,
  className,
}: {
  accent: string;
  glow?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={["p-5", className ?? ""].filter(Boolean).join(" ")}
      style={{
        clipPath: hudChamferPath(14, 4),
        background: `linear-gradient(160deg, ${withAlpha(
          "var(--ds-color-background-secondary)",
          0.94,
        )}, ${withAlpha("var(--ds-color-background-primary)", 0.9)})`,
        border: `1px solid ${withAlpha(accent, 0.5)}`,
        filter: glow ? `drop-shadow(0 0 24px ${withAlpha(accent, 0.28)})` : undefined,
      }}
    >
      {children}
    </div>
  );
}

/* ---- Between overs -------------------------------------------------------- */

export type BowlerRevealProps = {
  overNumber: number;
  bowlerName: string;
  onDone: () => void;
};

/** A new bowler walks in. Auto-dismisses; a tap skips it. */
export function BowlerReveal({ overNumber, bowlerName, onDone }: BowlerRevealProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, bowlerRevealMs);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  const violet = accentVar("violet");

  return (
    <button
      type="button"
      onClick={onDone}
      aria-label={`Over ${overNumber}. ${bowlerName} takes the ball`}
      className={`${styles.overlayIn} absolute inset-0 grid cursor-pointer place-items-center`}
      style={{ background: withAlpha("var(--ds-color-background-primary)", 0.88) }}
    >
      <Panel accent={violet} glow className="px-7 pb-[22px] pt-6 text-center">
        <p
          className="font-bold leading-compact text-muted"
          style={{ fontSize: "var(--ds-text-xs)", letterSpacing: "var(--ds-tracking-mega)" }}
        >
          OVER {overNumber}
        </p>
        <p
          className="mt-2.5 font-display font-black leading-compact"
          style={{
            fontSize: "var(--ds-text-hero)",
            letterSpacing: "var(--ds-tracking-display)",
            textShadow: `0 0 18px ${withAlpha(violet, 0.45)}`,
          }}
        >
          {bowlerName}
        </p>
        <p
          className="mt-2 font-bold leading-compact"
          style={{
            color: violet,
            fontSize: "var(--ds-text-xs)",
            letterSpacing: "var(--ds-tracking-mega)",
          }}
        >
          TAKES THE BALL
        </p>
      </Panel>
    </button>
  );
}

/* ---- Paused --------------------------------------------------------------- */

export type PauseOverlayProps = {
  onResume: () => void;
  onQuit: () => void;
};

/**
 * The chase is frozen exactly where it stood — the engine's clock does not
 * advance while this is up, so nothing is lost.
 */
export function PauseOverlay({ onResume, onQuit }: PauseOverlayProps) {
  return (
    <div
      className={`${styles.overlayIn} absolute inset-0 grid place-items-center px-6`}
      style={{ background: withAlpha("var(--ds-color-background-primary)", 0.92) }}
      role="dialog"
      aria-modal="true"
      aria-label="Chase paused"
    >
      <Panel accent={accentVar("cyan")} className="w-full max-w-97 px-5 pb-[18px] pt-[22px]">
        <p
          className="text-center font-display font-black leading-compact"
          style={{ fontSize: "var(--ds-text-2xl)", letterSpacing: "var(--ds-tracking-mega)" }}
        >
          CHASE PAUSED
        </p>
        <p
          className="mt-2 text-center leading-body text-muted"
          style={{ fontSize: "var(--ds-text-sm)" }}
        >
          The over is held exactly where you left it.
        </p>

        <div className="mt-5">
          <Button
            accent={accentVar("cyan")}
            variant="solid"
            fullWidth
            leadingIcon={<Glyph name="play_arrow" size={18} />}
            onClick={onResume}
          >
            RESUME
          </Button>
        </div>

        <button
          type="button"
          onClick={onQuit}
          className="mt-3 w-full cursor-pointer py-2 font-bold leading-compact"
          style={{
            color: feedbackVar("danger"),
            fontSize: "var(--ds-text-xs)",
            letterSpacing: "var(--ds-tracking-label)",
          }}
        >
          QUIT WITHOUT REWARD
        </button>
      </Panel>
    </div>
  );
}

/* ---- Leaving -------------------------------------------------------------- */

export type QuitDialogProps = {
  onCancel: () => void;
  onConfirm: () => void;
};

/** Walking out abandons the chase — no XP, no record. */
export function QuitDialog({ onCancel, onConfirm }: QuitDialogProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div
      className={`${styles.overlayIn} absolute inset-0 z-20 grid place-items-center px-6`}
      style={{ background: withAlpha("var(--ds-color-background-primary)", 0.92) }}
      role="dialog"
      aria-modal="true"
      aria-label="Leave the chase?"
    >
      <Panel accent={feedbackVar("danger")} className="w-full max-w-97">
        <p
          className="font-display font-black leading-compact"
          style={{ fontSize: "var(--ds-text-xl)", letterSpacing: "var(--ds-tracking-display)" }}
        >
          LEAVE THE CHASE?
        </p>
        <p className="mt-2 leading-body text-muted" style={{ fontSize: "var(--ds-text-sm)" }}>
          Walking out abandons the chase — no XP, no record.
        </p>

        <div className="mt-5 flex gap-2">
          <Button accent={accentVar("cyan")} variant="surface" fullWidth onClick={onCancel}>
            Keep batting
          </Button>
          <Button accent={feedbackVar("danger")} variant="solid" fullWidth onClick={onConfirm}>
            Leave
          </Button>
        </div>
      </Panel>
    </div>
  );
}
