"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import { useEffect, useRef, type ReactNode } from "react";

import {
  AccentPanel,
  accentVar,
  BoltIcon,
  Button,
  CloseIcon,
  feedbackVar,
  Glyph,
  PaidIcon,
  QuizIcon,
  SavingsIcon,
  StarIcon,
  WarningIcon,
  withAlpha,
} from "@statoz/design-system/games";
import { sportModuleFor, type Sport } from "@/domain/sports";
import { formatInt } from "@/shared/utils";

import { entryCost, questionsPerSet } from "../constants";
import { modeAccent, modeBlurb, modeGlyph, modeLabels, modeRewards } from "@/mocks/games/quiz";
import type { QuizMode } from "../types";

/**
 * What a set costs and pays, shown before it opens.
 *
 * The app puts this in a modal bottom sheet; here it docks to the bottom edge
 * on a phone and centres once there is room, which is the same thing a sheet
 * and a dialog are. It is the last point at which the run is free to abandon,
 * so it states the price plainly and refuses rather than failing afterwards.
 */

const gold = accentVar("gold");
const orange = accentVar("orange");

export type QuizBriefingProps = {
  sport: Sport;
  mode: QuizMode;
  setNumber: number;
  coins: number;
  onCancel: () => void;
  onStart: () => void;
};

export function QuizBriefing({
  sport,
  mode,
  setNumber,
  coins,
  onCancel,
  onStart,
}: QuizBriefingProps) {
  const accent = modeAccent(mode);
  const canAfford = coins >= entryCost;
  const missing = Math.min(Math.max(entryCost - coins, 0), entryCost);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  useEffect(() => {
    panel.current?.focus();
  }, []);

  return (
    <div
      className="absolute inset-0 z-40 flex items-end justify-center sm:items-center"
      style={{ background: "var(--ds-color-overlay-scrim)" }}
    >
      {/* The scrim dismisses. A sibling rather than a wrapper, so the sheet's
          own clicks never have to be stopped from bubbling. */}
      <button
        type="button"
        aria-label="Close entry briefing"
        tabIndex={-1}
        onClick={onCancel}
        className="absolute inset-0 cursor-default"
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Entry briefing"
        tabIndex={-1}
        className="relative max-h-[92dvh] w-full overflow-y-auto overscroll-contain px-5 pb-6 pt-4.5 outline-none sm:max-w-107.5"
        style={{
          background: "var(--ds-color-background-primary)",
          borderTop: `2px solid ${accent}`,
        }}
      >
        <div className="flex items-center gap-2">
          <h2
            className="flex-1 font-display font-black leading-none"
            style={{ fontSize: typography.sizeRem.p17, letterSpacing: "var(--ds-tracking-ultra)" }}
          >
            ENTRY BRIEFING
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close entry briefing"
            className="-mr-2 grid size-9 cursor-pointer place-items-center text-muted transition-colors hover:text-foreground"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="mt-2">
          <AccentPanel accent={accent} glow>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <Glyph
                  name={modeGlyph(mode, sport)}
                  size={26}
                  style={{ color: accent }}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate font-display font-black leading-none"
                    style={{ fontSize: typography.sizeRem.p18, letterSpacing: "var(--ds-tracking-ultra)" }}
                  >
                    {modeLabels[mode]} · SET {setNumber}
                  </p>
                  <p
                    className="mt-1.25 truncate font-display font-black leading-none text-muted"
                    style={{ fontSize: typography.sizeRem.p8_5, letterSpacing: "var(--ds-tracking-wide)" }}
                  >
                    {sportModuleFor(sport).label.toUpperCase()} ·{" "}
                    {modeBlurb(mode, sport)}
                  </p>
                </div>
              </div>

              <div className="mt-4.5 flex flex-col gap-2.25">
                <BriefingStat
                  icon={<QuizIcon size={18} />}
                  label="QUESTIONS"
                  value={`${questionsPerSet}`}
                  accent={accent}
                />
                <BriefingStat
                  icon={<StarIcon size={18} />}
                  label="3-STAR SCORE"
                  value={`${questionsPerSet} / ${questionsPerSet}`}
                  accent={gold}
                />
                <BriefingStat
                  icon={<BoltIcon size={18} />}
                  label="REWARD"
                  value={`+${modeRewards[mode]} XP / CORRECT`}
                  accent={gold}
                />
                <BriefingStat
                  icon={<PaidIcon size={18} />}
                  label="ENTRY"
                  value={`${entryCost} COINS`}
                  accent={orange}
                />
              </div>
            </div>
          </AccentPanel>
        </div>

        <div
          className="mt-3.5 flex items-center gap-2.5 border p-3"
          style={{
            background: canAfford
              ? "var(--ds-color-background-secondary)"
              : withAlpha(feedbackVar("danger"), 0.08),
            borderColor: canAfford
              ? "var(--ds-color-border-default)"
              : feedbackVar("danger"),
          }}
        >
          {canAfford ? (
            <SavingsIcon size={19} style={{ color: gold }} />
          ) : (
            <WarningIcon size={19} style={{ color: feedbackVar("danger") }} />
          )}
          <span
            className="font-display font-black leading-none"
            style={{
              fontSize: typography.sizeRem.p10,
              letterSpacing: "var(--ds-tracking-ultra)",
              color: canAfford ? undefined : feedbackVar("danger"),
            }}
          >
            {canAfford
              ? `BALANCE · ${formatInt(coins)} COINS`
              : `NEED ${missing} MORE COINS`}
          </span>
        </div>

        <div className="mt-4.5">
          <Button
            accent={accent}
            glow={canAfford}
            fullWidth
            disabled={!canAfford}
            onClick={onStart}
          >
            START SET
          </Button>
          <p
            className="mt-2 text-center font-display font-black leading-none text-muted"
            style={{ fontSize: typography.sizeRem.p8_5, letterSpacing: "var(--ds-tracking-ultra)" }}
          >
            {canAfford
              ? `${entryCost} COINS WILL BE SPENT`
              : `NEED ${missing} MORE COINS`}
          </p>
        </div>
      </div>
    </div>
  );
}

function BriefingStat({
  icon,
  label,
  value,
  accent,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-2.25">
      <span aria-hidden style={{ color: accent }}>
        {icon}
      </span>
      <span
        className="flex-1 font-display font-black leading-none text-muted"
        style={{ fontSize: typography.sizeRem.p9, letterSpacing: "var(--ds-tracking-ultra)" }}
      >
        {label}
      </span>
      <span
        className="font-display font-black leading-none"
        style={{ fontSize: typography.sizeRem.p10, letterSpacing: "var(--ds-tracking-label)", color: accent }}
      >
        {value}
      </span>
    </div>
  );
}
