"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import { cardCuts, playerCardWidths, rarityPack } from "@statoz/design-system/games";
import { cardTierRank, type CardTier } from "@/domain/cards";

import {
  cardFlipMs,
  cardPhaseMs,
  cardSettleMs,
  dismissMs,
  flashMs,
  idleAutoAdvanceMs,
  ovrCountMs,
  ovrHoldMs,
  packEntryMs,
  packPulseMs,
  packShakeMs,
  rarityTitleMs,
} from "../constants";
import {
  revealItemId,
  revealItemRating,
  revealItemTier,
  type PackRevealItem,
} from "../types";

import styles from "./card-unpack.module.css";
import { RevealCardFace } from "./reveal-card-face";
import {
  Confetti,
  HoloSweep,
  PackRevealBackdrop,
  Shockwave,
  tierGlow,
} from "./reveal-effects";

/** Where the pack becomes the card: the peak of the white-out. */
const swapAtMs = packEntryMs + packPulseMs + packShakeMs + flashMs / 2;
const flashStartsAtMs = packEntryMs + packPulseMs + packShakeMs;
/** Everything that celebrates the card waits for the flip to finish. */
const landingMs = cardFlipMs;
/** The rarity word lands once the card has settled. */
const rarityDelayMs = cardFlipMs + cardSettleMs;

const tierLabels: Record<CardTier, string> = {
  bronze: "BRONZE",
  silver: "SILVER",
  gold: "GOLD",
  platinum: "PLATINUM",
};

type Phase = "pack" | "card" | "idle" | "dismissing";

/**
 * A shortened schedule for anyone who asked for less motion. globals.css stills
 * the animations but cannot shorten a timer, so without this the reveal would
 * hold on a motionless screen for four seconds.
 */
const reducedSchedule = { pack: 100, card: 400, idle: 800, dismiss: 50 };

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export type CardUnpackProps = {
  item: PackRevealItem;
  /** Runs once the card has been dismissed, or the moment it is skipped. */
  onComplete: () => void;
  /** Shows the tap-to-continue hint while the card hovers. */
  showTapHint?: boolean;
};

/**
 * One card's reveal: a sealed pack slides in, breathes, rattles itself apart in
 * a white-out, and the card flips through it inside confetti, a shockwave, and
 * — from silver up — rotating god-rays.
 *
 * Flutter runs eighteen AnimationControllers to do this. Here the motion is all
 * CSS and React only decides what is mounted, so four timers replace the lot.
 */
export function CardUnpack({
  item,
  onComplete,
  showTapHint = true,
}: CardUnpackProps) {
  const [phase, setPhase] = useState<Phase>("pack");
  const finished = useRef(false);
  const tier = revealItemTier(item);
  const rank = cardTierRank(tier);
  const isPlatinum = tier === "platinum";

  // Walk pack -> card -> idle on a fixed schedule; the card half is longer for
  // platinum, which spends two shimmers on its own name.
  useEffect(() => {
    const reduced = prefersReducedMotion();
    const toCard = reduced ? reducedSchedule.pack : swapAtMs;
    const toIdle = reduced ? reducedSchedule.card : cardPhaseMs(isPlatinum);

    const first = window.setTimeout(() => setPhase("card"), toCard);
    const second = window.setTimeout(() => setPhase("idle"), toCard + toIdle);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(second);
    };
  }, [isPlatinum]);

  // Once it hovers, it dismisses itself unless the player gets there first.
  useEffect(() => {
    if (phase !== "idle") return;
    const reduced = prefersReducedMotion();
    const timer = window.setTimeout(
      dismiss,
      reduced ? reducedSchedule.idle : idleAutoAdvanceMs,
    );
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "dismissing") return;
    const reduced = prefersReducedMotion();
    const timer = window.setTimeout(
      () => {
        if (finished.current) return;
        finished.current = true;
        onComplete();
      },
      reduced ? reducedSchedule.dismiss : dismissMs,
    );
    return () => window.clearTimeout(timer);
  }, [phase, onComplete]);

  function dismiss() {
    setPhase((current) => (current === "idle" ? "dismissing" : current));
  }

  const showCard = phase !== "pack";
  const glow = tierGlow(tier);

  const style = {
    "--reveal-glow": glow,
    "--reveal-glow-rest": `color-mix(in srgb, ${glow} 50%, transparent)`,
    "--rarity-delay": `${rarityDelayMs}ms`,
    "--shimmer-delay": `${rarityDelayMs + rarityTitleMs}ms`,
    "--ovr-delay": `${landingMs}ms`,
    "--ovr-fade-delay": `${landingMs + ovrCountMs + ovrHoldMs}ms`,
  } as CSSProperties;

  return (
    <div className="relative isolate h-full min-h-dvh w-full" style={style}>
      <PackRevealBackdrop
        tier={tier}
        showRays={showCard && rank >= 1}
        delayMs={landingMs}
      />

      {showCard ? (
        <>
          <Shockwave tier={tier} delayMs={landingMs} />
          <Confetti tier={tier} seed={revealItemId(item)} delayMs={landingMs} />
        </>
      ) : null}

      <div
        className="absolute inset-0 grid place-items-center px-6"
        style={{ perspective: "1200px" }}
      >
        {showCard ? (
          <CardStage item={item} phase={phase} />
        ) : (
          <SealedPack tier={tier} />
        )}
      </div>

      {showCard ? (
        <>
          <RarityTitle tier={tier} />
          <OvrPop tier={tier} rating={revealItemRating(item)} />
        </>
      ) : null}

      {/* The white-out. Mounted from the start so its delay is its cue. */}
      <div
        aria-hidden
        className={`${styles.flash} pointer-events-none absolute inset-0`}
        style={{
          animationDelay: `${flashStartsAtMs}ms`,
          background: "var(--ds-color-text-default)",
        }}
      />

      {/* While it hovers, anywhere is a dismiss target — as in the app. */}
      {phase === "idle" ? (
        <button
          type="button"
          onClick={dismiss}
          className="absolute inset-0 z-10 cursor-default"
        >
          <span className="sr-only">Continue to the next card</span>
        </button>
      ) : null}

      {showTapHint && phase === "idle" ? (
        <span
          aria-hidden
          className={`${styles.tapHint} absolute inset-x-0 bottom-16 text-center font-display text-3xl font-bold text-muted`}
        >
          TAP TO CONTINUE
        </span>
      ) : null}
    </div>
  );
}

/* ---- The sealed pack --------------------------------------------------- */

function SealedPack({ tier }: { tier: CardTier }) {
  return (
    <div className={`${styles.pack} relative`}>
      <div
        aria-hidden
        className={`${styles.packGlow} absolute -inset-1`}
        style={{ background: "var(--reveal-glow)", filter: "blur(8px)" }}
      />
      <PackShell tier={tier} width={196}>
        <span
          className="font-display text-hero font-black"
          style={{ color: "var(--ds-color-text-default)" }}
        >
          ?
        </span>
      </PackShell>
    </div>
  );
}

/** The pack shell, which doubles as the card's back during the flip. */
function PackShell({
  tier,
  width,
  children,
}: {
  tier: CardTier;
  width: number;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="relative grid place-items-center overflow-hidden"
      style={{
        width,
        height: width * 1.5,
        background: rarityPack[tier],
        border: `1px solid var(--reveal-glow)`,
      }}
    >
      {/* The diagonal weave printed on every pack back. */}
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, color-mix(in srgb, var(--ds-color-accent-cyan) 30%, transparent) 0 1px, transparent 1px 12px)",
        }}
      />
      {children}
    </div>
  );
}

/* ---- The card ---------------------------------------------------------- */

/** The reveal shows cards at their largest size. */
const revealCuts = cardCuts(playerCardWidths.lg);

function CardStage({ item, phase }: { item: PackRevealItem; phase: Phase }) {
  const tier = revealItemTier(item);
  const chamfered = item.kind === "player";

  return (
    <div
      className={[
        styles.settle,
        phase === "idle" ? styles.idle : "",
        phase === "dismissing" ? styles.dismissing : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={`${styles.flipper} relative`}>
        {/* In flow, so the flipper takes the card's own size. The cuts are
            declared here rather than only on the card, so the foil sweep
            lying over it clips to the identical silhouette. */}
        <div
          className={`${styles.face} ${styles.faceFront} relative`}
          style={
            {
              "--ds-card-cut-big": `${revealCuts.big}px`,
              "--ds-card-cut-small": `${revealCuts.small}px`,
            } as CSSProperties
          }
        >
          <RevealCardFace item={item} size="lg" />
          <HoloSweep tier={tier} chamfered={chamfered} />
        </div>

        <div
          aria-hidden
          className={`${styles.face} absolute inset-0 grid place-items-center`}
        >
          <PackShell tier={tier} width={224} />
        </div>
      </div>
    </div>
  );
}

/* ---- Overlays ---------------------------------------------------------- */

function RarityTitle({ tier }: { tier: CardTier }) {
  const isPlatinum = tier === "platinum";

  return (
    <div
      className={`${styles.rarityTitle} pointer-events-none absolute inset-x-0 top-[22%] text-center`}
    >
      <span
        className={`${isPlatinum ? styles.shimmer : ""} font-display font-bold`}
        style={{
          color: `var(--ds-color-rarity-${tier}-base)`,
          fontSize: isPlatinum ? "var(--ds-text-2xl)" : "var(--ds-text-xl)",
          letterSpacing: isPlatinum
            ? "var(--ds-tracking-max)"
            : "var(--ds-tracking-ultra)",
        }}
      >
        {tierLabels[tier]}
      </span>
    </div>
  );
}

/**
 * The number slamming in over the card. It is decoration — the card face
 * already carries the real rating — so it is hidden from assistive technology
 * and the count is the one place per-frame JavaScript earns its keep.
 */
function OvrPop({ tier, rating }: { tier: CardTier; rating: number }) {
  const value = useCountUp(rating, ovrCountMs, landingMs);

  return (
    <div
      aria-hidden
      className={`${styles.ovrPop} pointer-events-none absolute inset-x-0 bottom-[20%] flex flex-col items-center`}
    >
      <span
        className="ds-tabular font-display font-black leading-compact"
        style={{
          color: "var(--ds-color-text-default)",
          fontSize: "var(--ds-text-celebration)",
          textShadow: `0 0 24px var(--ds-color-rarity-${tier}-base)`,
        }}
      >
        {value}
      </span>
      <span
        className="font-display font-black leading-compact"
        style={{
          color: `var(--ds-color-rarity-${tier}-base)`,
          fontSize: "var(--ds-text-md)",
          letterSpacing: "var(--ds-tracking-max)",
        }}
      >
        OVR
      </span>
    </div>
  );
}

/**
 * Counts 0 to `target` once `delayMs` has passed, or lands straight on it under
 * reduced motion. This is the one place per-frame JavaScript earns its keep:
 * the number has to change, and CSS cannot change a number.
 */
function useCountUp(target: number, durationMs: number, delayMs = 0): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame = 0;

    // Landing straight on the number is still a change of state, so it is
    // scheduled rather than written during the effect itself.
    if (prefersReducedMotion()) {
      frame = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(frame);
    }

    const start = performance.now() + delayMs;
    const tick = (now: number) => {
      const progress = Math.min(Math.max(now - start, 0) / durationMs, 1);
      // Ease-out, matching the slam it rides in on.
      setValue(Math.round(target * (1 - (1 - progress) ** 2)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, delayMs]);

  return value;
}
