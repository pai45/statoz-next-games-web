"use client";

import { useEffect, useState } from "react";

import { accentVar, hudChamferPath, withAlpha } from "@statoz/design-system/games";

import { usePrefersReducedMotion } from "../../state/use-reduced-motion";

import { MatchmakingArenaBackground } from "./matchmaking-arena-background";
import { countdownTickMs, goStampMs } from "./constants";
import styles from "./matchmaking.module.css";

/**
 * Three, two, one, and the stamp the mode kicks off on.
 *
 * The port of Flutter's `GameKickoffCountdown`. Each number is its own element,
 * keyed by its value, so replacing it replays the slam keyframe — the web's
 * answer to resetting and re-forwarding a controller.
 *
 * It keeps the arena bed behind it so the handoff out of matchmaking does not
 * cut to a different screen.
 */

const lime = accentVar("lime");
const stampClip = hudChamferPath(14, 4);

export type GameKickoffCountdownProps = {
  /** The stamp after the count: `KICK OFF!`, `TIP OFF!`, `PLAY!`. */
  goLabel?: string;
  onComplete: () => void;
  /** Arena art to keep behind the numbers, matching the screen just left. */
  backgroundAsset?: string;
};

export function GameKickoffCountdown({
  goLabel = "GO!",
  onComplete,
  backgroundAsset,
}: GameKickoffCountdownProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (reducedMotion) {
      onComplete();
      return;
    }
    if (count > 0) {
      const timer = window.setTimeout(() => setCount((n) => n - 1), countdownTickMs);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(onComplete, goStampMs);
    return () => window.clearTimeout(timer);
  }, [count, onComplete, reducedMotion]);

  if (reducedMotion) return null;

  const stamped = count === 0;

  return (
    <div
      className="relative grid min-h-dvh place-items-center overflow-hidden"
      role="status"
      aria-live="assertive"
      aria-label={stamped ? goLabel : `Starting in ${count}`}
    >
      <MatchmakingArenaBackground asset={backgroundAsset} />

      {stamped ? (
        <>
          {/* The wash the stamp lands with. */}
          <div
            aria-hidden
            className={`${styles.flash} absolute inset-0`}
            style={{ background: lime }}
          />
          <span
            className={`${styles.stamp} relative px-5.5 py-2.5 font-display font-black leading-compact`}
            style={{
              clipPath: stampClip,
              color: lime,
              background: withAlpha(lime, 0.13),
              boxShadow: `inset 0 0 0 2.5px ${lime}, 0 0 44px ${withAlpha(lime, 0.6)}`,
              fontSize: "var(--ds-text-hero)",
              letterSpacing: "var(--ds-tracking-mega)",
              textShadow: `0 0 22px ${lime}`,
            }}
          >
            {goLabel}
          </span>
        </>
      ) : (
        <div className="relative flex flex-col items-center">
          <p
            className="font-display font-black leading-compact"
            style={{
              color: withAlpha(accentVar("cyan"), 0.55),
              fontSize: "var(--ds-text-xs)",
              letterSpacing: "var(--ds-tracking-max)",
            }}
          >
            MATCH STARTING IN
          </p>
          <span
            key={count}
            className={`${styles.tick} mt-4.5 font-display font-black leading-compact`}
            style={{
              color: lime,
              fontSize: "var(--ds-text-countdown)",
              textShadow: `0 0 52px ${withAlpha(lime, 0.85)}, 0 0 80px ${withAlpha(accentVar("cyan"), 0.47)}`,
            }}
          >
            {count}
          </span>
        </div>
      )}
    </div>
  );
}
