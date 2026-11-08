"use client";

import { accentVar, feedbackVar, withAlpha } from "@statoz/design-system/games";

import styles from "./quiz.module.css";

/**
 * SIGNAL LOCK — the per-question verdict cinematic.
 *
 * The app runs one controller 0→1 over 700ms and every painter reads its own
 * slice of that timeline:
 *
 *   0.00 → 0.30  SCAN     a cyan line sweeps the option stack. Identical for
 *                         right and wrong, so it gives nothing away — which is
 *                         the whole reason the reveal has any tension.
 *   0.30 → 0.62  IMPACT   correct → chevrons and a self-drawing circuit trace;
 *                         wrong    → the panel tears.
 *   0.62 → 1.00  BOOT     (wrong only) the real answer powers on.
 *
 * On the web the timeline is the same numbers expressed as CSS delays, so every
 * layer is declarative and nothing has to be driven frame by frame. The
 * chevrons are drawn at 45° — the same angle as the system's corner chamfer —
 * so the success beat is the shape language in motion rather than confetti.
 */

export const verdictDurationMs = 700;
export const scanEndMs = 210;
export const impactEndMs = 434;

/** How long the player gets to read a verdict before the next question lands. */
export const autoAdvanceMs = 3000;

const cyan = accentVar("cyan");
const gold = accentVar("gold");
const orange = accentVar("orange");

/**
 * Streak escalation is pure feedback — it never multiplies XP. The accent
 * climbs success → amber → gold so a hot run visibly heats up.
 */
export function verdictStreakAccent(streak: number): string {
  if (streak >= 5) return gold;
  if (streak >= 3) return orange;
  return feedbackVar("success");
}

/* ---- Beat 0: the scan ----------------------------------------------------- */

/**
 * A 2px line with a soft tail sweeping the option stack. Verifying, not
 * judging: the same sweep plays whatever the answer turns out to be.
 */
export function VerdictScanline() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <span
        className={`${styles.scan} absolute inset-x-0 h-6`}
        style={{
          background: `linear-gradient(to bottom, ${withAlpha(cyan, 0)}, ${withAlpha(cyan, 0.16)})`,
          borderBottom: `2px solid ${withAlpha(cyan, 0.85)}`,
        }}
      />
    </span>
  );
}

/* ---- Beat 1, correct: the lock -------------------------------------------- */

/**
 * A stroke that runs the tile perimeter clockwise from the letter badge and
 * flashes once it closes, plus chevrons sweeping across the face.
 *
 * The trace is one SVG rect drawn with `stroke-dasharray`, so it draws itself
 * rather than fading in; the dash length is the perimeter of a 100×100 viewBox
 * because `vector-effect` keeps the stroke honest at any real size.
 */
export function SignalLockFx({
  accent,
  chevrons = 3,
}: {
  accent: string;
  /** Grows with the streak: a hotter run sweeps harder. */
  chevrons?: number;
}) {
  const perimeter = 400;

  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg
        className="absolute inset-0 size-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <rect
          className={styles.trace}
          x="0.5"
          y="0.5"
          width="99"
          height="99"
          fill="none"
          stroke={accent}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          strokeDasharray={perimeter}
          style={{ "--trace-length": perimeter } as React.CSSProperties}
        />
        <rect
          className={styles.traceFlash}
          x="0.5"
          y="0.5"
          width="99"
          height="99"
          fill="none"
          stroke={accent}
          strokeWidth={5}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <span className={`${styles.chevrons} absolute inset-y-0 left-0 flex items-center`}>
        {Array.from({ length: chevrons }, (_, index) => (
          <svg
            key={index}
            width={18}
            height={18}
            viewBox="0 0 18 18"
            style={{
              // The leading chevron is brightest; the tail thins out behind it.
              opacity: 1 - index / (chevrons + 1),
              marginLeft: index === 0 ? 0 : -1,
            }}
          >
            <path
              d="M4 2 L11 9 L4 16"
              fill="none"
              stroke={accent}
              strokeWidth={3 - index * 0.5}
              strokeLinecap="round"
            />
          </svg>
        ))}
      </span>
    </span>
  );
}

/* ---- Beat 1, wrong: the tear ---------------------------------------------- */

/**
 * Displaced ghost bands and an additive RGB split over the torn panel.
 *
 * The band geometry is fixed rather than random, exactly as the app fixes it:
 * a tear that re-scrambles on every paint reads as noise instead of a fault.
 */
const bands = [
  { top: "8%", height: "5%", drift: 1 },
  { top: "27%", height: "3%", drift: -0.6 },
  { top: "46%", height: "7%", drift: 0.8 },
  { top: "68%", height: "4%", drift: -1 },
  { top: "85%", height: "5%", drift: 0.5 },
];

export function GlitchTear() {
  const danger = feedbackVar("danger");

  return (
    <span
      aria-hidden
      className={`${styles.glitch} pointer-events-none absolute inset-0`}
      style={{ mixBlendMode: "plus-lighter" }}
    >
      {/* The split: the whole panel doubled either side of itself. */}
      <span
        className="absolute inset-0"
        style={{ background: withAlpha(danger, 0.14), transform: "translateX(2px)" }}
      />
      <span
        className="absolute inset-0"
        style={{ background: withAlpha(cyan, 0.08), transform: "translateX(-2px)" }}
      />

      {bands.map((band, index) => (
        <span
          key={band.top}
          className="absolute inset-x-0"
          style={{
            top: band.top,
            height: band.height,
            transform: `translateX(${band.drift * 7}px)`,
            background: withAlpha(index % 2 === 0 ? danger : cyan, 0.16),
            borderTop: `1px solid ${withAlpha(danger, 0.55)}`,
          }}
        />
      ))}
    </span>
  );
}
