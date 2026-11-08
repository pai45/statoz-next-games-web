"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";

import { Button, TrophyIcon } from "@statoz/design-system/games";

import {
  introExitFlashMs,
  introHoldMs,
  introTitleMs,
  slotStaggerStartMs,
  slotStaggerStepMs,
  summaryStaggerStartMs,
  summaryStaggerStepMs,
} from "../constants";
import {
  revealAnimatedItems,
  revealGroupedActionItems,
  revealItemId,
  revealItems,
  type PackRevealData,
  type PackRevealItem,
} from "../types";

import { CardUnpack } from "./card-unpack";
import {
  BottomCtaBar,
  MysterySlot,
  PackSkipButton,
  ProgressDots,
  SummaryGroupHeader,
} from "./pack-chrome";
import { PackRevealBackdrop } from "./reveal-effects";
import { RevealCardFace } from "./reveal-card-face";
import styles from "./starter-pack-reveal.module.css";

/** The intro's cascade, as fractions of its 1100ms run. */
const cascade = {
  brand: [0, 0.28],
  headline: [0.12, 0.65],
  status: [0.32, 0.72],
  slots: [0.5, 0.88],
  helper: [0.68, 1],
} as const;

function riseVars(
  [from, to]: readonly [number, number],
  rise = 24,
): CSSProperties {
  return {
    "--rise-delay": `${Math.round(from * introTitleMs)}ms`,
    "--rise-duration": `${Math.round((to - from) * introTitleMs)}ms`,
    "--rise-from": `${rise}px`,
  } as CSSProperties;
}

type Phase = "intro" | "reveal" | "actions" | "summary";

export type StarterPackRevealProps = {
  reveal: PackRevealData;
  /** Runs when the player leaves the summary. */
  onComplete: () => void;
  /** Replaces the multi-step opening with one first-launch squad summary. */
  compactSummary?: boolean;
  /** Names the game context without baking a sport or title into shared copy. */
  contextLabel?: string;
};

/**
 * The whole pack-opening flow: the pack announces itself, each card flips in
 * turn, the actions arrive together, and the summary lays the collection out.
 *
 * Flutter stacks the four steps and toggles them with a flag; here each is a
 * whole screen in its own right, so the phase simply picks which one renders.
 */
export function StarterPackReveal({
  reveal,
  onComplete,
  compactSummary = false,
  contextLabel,
}: StarterPackRevealProps) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [cardIndex, setCardIndex] = useState(0);

  const animated = revealAnimatedItems(reveal);
  const groupedActions = revealGroupedActionItems(reveal);
  const hasGroupedActions =
    reveal.groupActionCards && groupedActions.length > 0;

  const toSummary = useCallback(() => setPhase("summary"), []);

  const afterCards = useCallback(() => {
    setPhase(hasGroupedActions ? "actions" : "summary");
  }, [hasGroupedActions]);

  if (compactSummary) {
    return (
      <CompactStarterSummary
        reveal={reveal}
        contextLabel={contextLabel}
        onComplete={onComplete}
      />
    );
  }

  function nextCard() {
    if (cardIndex < animated.length - 1) {
      setCardIndex((current) => current + 1);
      return;
    }
    afterCards();
  }

  if (phase === "intro") {
    return (
      <IntroStep
        reveal={reveal}
        slotCount={animated.length}
        onDone={() => setPhase("reveal")}
      />
    );
  }

  if (phase === "reveal") {
    const item = animated[cardIndex];
    return (
      <div className="relative min-h-dvh">
        {/* Re-keyed so each card replays the reveal from its first frame. */}
        <CardUnpack
          key={revealItemId(item)}
          item={item}
          onComplete={nextCard}
          showTapHint={false}
        />

        <div
          className="pointer-events-none absolute inset-x-0 z-20 flex justify-center"
          style={{ top: "calc(0.875rem + env(safe-area-inset-top))" }}
        >
          <ProgressDots current={cardIndex + 1} total={animated.length} />
        </div>

        <PackSkipButton onClick={afterCards} />
      </div>
    );
  }

  if (phase === "actions") {
    return <ActionsStep items={groupedActions} onContinue={toSummary} />;
  }

  return <SummaryStep reveal={reveal} onComplete={onComplete} />;
}

function CompactStarterSummary({
  reveal,
  contextLabel,
  onComplete,
}: {
  reveal: PackRevealData;
  contextLabel?: string;
  onComplete: () => void;
}) {
  const players = reveal.playerCards.slice(0, 5);
  const remainingPlayers = Math.max(0, reveal.playerCards.length - players.length);

  return (
    <div
      className="relative flex min-h-dvh flex-col overflow-hidden"
      data-ui-role="starter-summary"
    >
      <PackRevealBackdrop tier="gold" showRays={false} />

      <main className="relative flex flex-1 items-center px-6 pb-20 pt-5">
        <div className="mx-auto w-full max-w-4xl text-center">
          <p
            className="font-display font-black text-cyan"
            style={{
              fontSize: "var(--ds-text-2xs)",
              letterSpacing: "var(--ds-tracking-ultra)",
            }}
          >
            {contextLabel ?? reveal.brandLabel}
          </p>
          <h1
            className="mt-2 font-display font-black"
            style={{
              color: "var(--ds-color-accent-lime)",
              fontSize: "clamp(1.75rem, 7vw, 3rem)",
              letterSpacing: "var(--ds-tracking-display)",
            }}
          >
            YOUR STARTER SQUAD
          </h1>
          <p className="mt-1.5 text-xs font-bold text-muted">
            {reveal.playerCards.length} players and {reveal.actionCards.length} actions are ready.
          </p>

          <div
            className="mt-5 flex justify-center gap-2 overflow-hidden"
            aria-label={`${reveal.playerCards.length} starter players`}
          >
            {players.map((card, index) => (
              <span
                key={card.id}
                className={`${styles.pop} flex h-20 w-24 flex-col items-center justify-center border border-cyan/30 bg-surface-elevated/80 px-2`}
                style={
                  {
                    "--pop-delay": `${index * 70}ms`,
                  } as CSSProperties
                }
              >
                <b className="font-display text-lg text-gold">{card.rating}</b>
                <span className="mt-1 max-w-full truncate text-2xs font-black text-default">{card.shortName}</span>
                <small className="mt-0.5 text-2xs font-bold text-muted">{card.position}</small>
              </span>
            ))}
          </div>

          {remainingPlayers > 0 ? (
            <p className="mt-2 text-2xs font-bold text-muted">
              +{remainingPlayers} more players in your squad
            </p>
          ) : null}

          <div className="mx-auto mt-5 w-full max-w-sm">
            <Button fullWidth size="lg" onClick={onComplete}>
              {reveal.ctaLabel}
            </Button>
          </div>
        </div>
      </main>

      <PackSkipButton onClick={onComplete} label="SKIP REVEAL" />
    </div>
  );
}

/* ---- Intro ------------------------------------------------------------- */

function IntroStep({
  reveal,
  slotCount,
  onDone,
}: {
  reveal: PackRevealData;
  slotCount: number;
  onDone: () => void;
}) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setLeaving(true), introHoldMs);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(onDone, introExitFlashMs);
    return () => window.clearTimeout(timer);
  }, [leaving, onDone]);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-8">
      <PackRevealBackdrop tier="platinum" showRays={false} />

      <div className="relative flex w-full max-w-lg flex-col items-center text-center">
        <p
          className={`${styles.rise} font-display font-extrabold leading-compact`}
          style={{
            ...riseVars(cascade.brand),
            color: "color-mix(in srgb, var(--ds-color-accent-cyan) 50%, transparent)",
            fontSize: "var(--ds-text-xs)",
            letterSpacing: "var(--ds-tracking-max)",
          }}
        >
          {reveal.brandLabel}
        </p>

        <h1
          className={`${styles.rise} ${styles.headline} mt-4 font-display font-black leading-tight`}
          style={{
            ...riseVars(cascade.headline, 80),
            fontSize: "clamp(2.625rem, 12vw, 3.375rem)",
            letterSpacing: "var(--ds-tracking-display)",
            whiteSpace: "pre-line",
          }}
        >
          {reveal.headline}
        </h1>

        <p
          className={`${styles.rise} mt-2.5 font-display font-black leading-compact text-orange`}
          style={{
            ...riseVars(cascade.status, 20),
            fontSize: "var(--ds-text-md)",
            letterSpacing: "var(--ds-tracking-max)",
          }}
        >
          {reveal.statusLabel}
        </p>

        <div
          className={`${styles.rise} mt-9 flex flex-wrap justify-center gap-2`}
          style={riseVars(cascade.slots)}
        >
          {Array.from({ length: slotCount }, (_, index) => (
            <span
              key={index}
              className={styles.pop}
              style={
                {
                  "--pop-delay": `${slotStaggerStartMs + index * slotStaggerStepMs}ms`,
                } as CSSProperties
              }
            >
              <MysterySlot />
            </span>
          ))}
        </div>

        <p
          className={`${styles.rise} mt-8`}
          style={riseVars(cascade.helper, 12)}
        >
          <span
            className={`${styles.breathe} font-bold leading-compact text-muted`}
            style={{
              fontSize: "var(--ds-text-2xs)",
              letterSpacing: "var(--ds-tracking-ultra)",
            }}
          >
            PREPARING YOUR SQUAD...
          </span>
        </p>
      </div>

      {leaving ? (
        <div
          aria-hidden
          className={`${styles.exitFlash} pointer-events-none absolute inset-0`}
          style={{ background: "var(--ds-color-text-default)" }}
        />
      ) : null}

      <PackSkipButton onClick={onDone} />
    </div>
  );
}

/* ---- The grouped actions ----------------------------------------------- */

function ActionsStep({
  items,
  onContinue,
}: {
  items: PackRevealItem[];
  onContinue: () => void;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <PackRevealBackdrop tier="platinum" showRays={false} />

      <div className="relative flex-1 overflow-y-auto px-6 pb-6 pt-8">
        <div className="mx-auto w-full max-w-4xl text-center">
          <h1
            className="font-display font-black text-cyan"
            style={{
              fontSize: "var(--ds-text-2xl)",
              letterSpacing: "var(--ds-tracking-ultra)",
            }}
          >
            ACTION CARDS
          </h1>
          <p
            className="mt-1.5 font-bold text-muted"
            style={{
              fontSize: "var(--ds-text-2xs)",
              letterSpacing: "var(--ds-tracking-wide)",
            }}
          >
            {items.length} ACTIONS UNLOCKED TOGETHER
          </p>

          <CardShelf items={items} align="center" className="mt-7" />
        </div>
      </div>

      <div className="relative">
        <BottomCtaBar>
          <Button fullWidth size="lg" onClick={onContinue}>
            CONTINUE
          </Button>
        </BottomCtaBar>
      </div>
    </div>
  );
}

/* ---- Summary ----------------------------------------------------------- */

function SummaryStep({
  reveal,
  onComplete,
}: {
  reveal: PackRevealData;
  onComplete: () => void;
}) {
  const [leaving, setLeaving] = useState(false);
  const items = revealItems(reveal);
  const players = items.filter((item) => item.kind === "player");
  const actions = items.filter((item) => item.kind === "action");

  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(onComplete, 420);
    return () => window.clearTimeout(timer);
  }, [leaving, onComplete]);

  const lime = "var(--ds-color-accent-lime)";

  return (
    <div
      className={[
        leaving ? styles.fadeOut : "",
        "relative flex min-h-dvh flex-col overflow-hidden",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <PackRevealBackdrop tier="gold" showRays={false} />

      <div className="relative flex-1 overflow-y-auto px-6 pb-6 pt-7">
        <div className="mx-auto w-full max-w-4xl">
          <div className="text-center">
            <span className="inline-block text-gold">
              <TrophyIcon size={54} />
            </span>
            <h1
              className="mt-3.5 font-display font-black"
              style={{
                color: lime,
                fontSize: "var(--ds-text-2xl)",
                letterSpacing: "var(--ds-tracking-ultra)",
              }}
            >
              SQUAD ASSEMBLED!
            </h1>
            <p
              className="mt-1.5 font-bold text-muted"
              style={{
                fontSize: "var(--ds-text-2xs)",
                letterSpacing: "var(--ds-tracking-ultra)",
              }}
            >
              {reveal.summaryLabel}
            </p>

            {reveal.detailLabel ? (
              <p
                className="mt-2 font-bold"
                style={{
                  color: "color-mix(in srgb, var(--ds-color-accent-cyan) 85%, transparent)",
                  fontSize: "var(--ds-text-2xs)",
                  letterSpacing: "var(--ds-tracking-wide)",
                }}
              >
                {reveal.detailLabel}
              </p>
            ) : null}

            {reveal.xpGained > 0 ? (
              <p
                className="ds-tabular mt-2 font-display font-black"
                style={{
                  color: `color-mix(in srgb, ${lime} 90%, transparent)`,
                  fontSize: "var(--ds-text-md)",
                  letterSpacing: "var(--ds-tracking-wide)",
                }}
              >
                +{reveal.xpGained} XP
              </p>
            ) : null}

            {reveal.levelsGained.length > 0 ? (
              <p
                className="mt-1.5 font-display font-black text-gold/90"
                style={{
                  fontSize: "var(--ds-text-2xs)",
                  letterSpacing: "var(--ds-tracking-ultra)",
                }}
              >
                LEVEL {reveal.levelsGained.at(-1)} REACHED
              </p>
            ) : null}
          </div>

          <div className="mt-8 flex flex-col gap-7">
            {players.length > 0 ? (
              <section className="flex flex-col gap-3.5">
                <SummaryGroupHeader title="PLAYER CARDS" count={players.length} />
                <CardShelf items={players} />
              </section>
            ) : null}

            {actions.length > 0 ? (
              <section className="flex flex-col gap-3.5">
                <SummaryGroupHeader title="ACTION CARDS" count={actions.length} />
                <CardShelf items={actions} offset={players.length} />
              </section>
            ) : null}
          </div>
        </div>
      </div>

      <div className="relative">
        <BottomCtaBar>
          <Button
            fullWidth
            size="lg"
            accent={lime}
            onClick={() => setLeaving(true)}
          >
            {reveal.ctaLabel}
          </Button>
        </BottomCtaBar>
      </div>
    </div>
  );
}

/**
 * A group of cards dealt in one after another.
 *
 * Flutter lays these out with a `Wrap` sized for a phone; a grid that counts
 * its own columns fills a wide window without stretching the cards.
 */
function CardShelf({
  items,
  offset = 0,
  align = "start",
  className,
}: {
  items: PackRevealItem[];
  offset?: number;
  /** Follows the heading above it: centred under a centred title, else flush. */
  align?: "start" | "center";
  className?: string;
}) {
  return (
    <div
      className={[
        "grid gap-2.5",
        align === "center" ? "justify-center" : "justify-center sm:justify-start",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(128px, 128px))" }}
    >
      {items.map((item, index) => (
        <span
          key={revealItemId(item)}
          className={styles.pop}
          style={
            {
              "--pop-delay": `${summaryStaggerStartMs + (offset + index) * summaryStaggerStepMs}ms`,
            } as CSSProperties
          }
        >
          <RevealCardFace item={item} size="sm" />
        </span>
      ))}
    </div>
  );
}
