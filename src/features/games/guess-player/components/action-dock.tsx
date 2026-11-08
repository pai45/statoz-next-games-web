"use client";

import { accentVar, Button, Glyph, withAlpha } from "@statoz/design-system/games";

import { extraAttemptCost, maxAttempts } from "../constants";

import { Label } from "./guess-chrome";
import styles from "./guess-player.module.css";

/**
 * The dock at the foot of the play screen — `_ActionDock` and its heart meter.
 *
 * Six hearts and one button, until the hearts run out; then the choice is to
 * buy one more guess or to declassify the player. The dock is pinned so the
 * count and the commit never scroll away from each other.
 */

export type ActionDockProps = {
  attemptsRemaining: number;
  selected: boolean;
  potentialXp: number;
  onSubmit: () => void;
  onGiveUp: () => void;
  onBuyExtraAttempt: () => void;
};

export function ActionDock({
  attemptsRemaining,
  selected,
  potentialXp,
  onSubmit,
  onGiveUp,
  onBuyExtraAttempt,
}: ActionDockProps) {
  const exhausted = attemptsRemaining <= 0;

  return (
    <div
      className="shrink-0 px-4 pt-3"
      style={{
        background: withAlpha("var(--ds-color-background-primary)", 0.96),
        borderTop: "1px solid var(--ds-color-border-subtle)",
        paddingBottom: "calc(0.875rem + env(safe-area-inset-bottom))",
      }}
    >
      <div className="mx-auto w-full max-w-107.5">
        <HeartMeter attemptsRemaining={attemptsRemaining} />

        {exhausted ? (
          <div className="mt-3">
            <Label className="text-center" color="var(--ds-color-danger)" tracking="var(--ds-tracking-mega)">
              NO GUESSES LEFT
            </Label>
            <div className="mt-2 flex gap-2">
              <Button
                className="flex-1"
                accent={accentVar("orange")}
                variant="tonal"
                size="md"
                leadingIcon={<Glyph name="favorite" size={16} />}
                onClick={onBuyExtraAttempt}
              >
                {`+1 GUESS  //  ${extraAttemptCost} COINS`}
              </Button>
              <button
                type="button"
                onClick={onGiveUp}
                className={`${styles.plate} h-11 flex-1 cursor-pointer font-display font-black leading-compact`}
                style={{
                  color: "var(--ds-color-danger)",
                  background: "var(--ds-color-background-secondary)",
                  border: `1px solid ${withAlpha("var(--ds-color-danger)", 0.65)}`,
                  fontSize: "var(--ds-text-xs)",
                  letterSpacing: "var(--ds-tracking-ultra)",
                }}
              >
                GIVE UP
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <Button
              accent={accentVar("cyan")}
              variant="solid"
              size="lg"
              fullWidth
              glow={selected}
              disabled={!selected}
              leadingIcon={<Glyph name="lock" size={18} />}
              onClick={onSubmit}
            >
              LOCK PLAYER
            </Button>
            <Label className="mt-2 text-center" tracking="var(--ds-tracking-mega)">
              {selected ? `CURRENT PAYOUT · +${potentialXp} XP` : "PICK A PLAYER TO LOCK IN"}
            </Label>
          </div>
        )}
      </div>
    </div>
  );
}

function HeartMeter({ attemptsRemaining }: { attemptsRemaining: number }) {
  const remaining = Math.min(Math.max(attemptsRemaining, 0), maxAttempts);

  return (
    <div
      role="img"
      aria-label={`${remaining} of ${maxAttempts} guesses remaining`}
      className="flex items-center justify-center gap-1.5"
    >
      {Array.from({ length: maxAttempts }, (_, index) => (
        <span
          key={index}
          style={{
            color:
              index < remaining
                ? "var(--ds-color-danger)"
                : withAlpha("var(--ds-color-text-muted)", 0.35),
          }}
        >
          <Glyph name="favorite" size={21} />
        </span>
      ))}
    </div>
  );
}
