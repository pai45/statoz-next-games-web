"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import type { CSSProperties } from "react";

import { accentVar, withAlpha } from "@statoz/design-system/games";

import { padScore } from "../arcade";

import styles from "./arcade.module.css";

/**
 * The top of the cabinet: the 1UP / HI-SCORE / RANK readout, the neon
 * HIGH SCORES title and the stage line naming the sport and game.
 */

const cyan = accentVar("cyan");
const gold = accentVar("gold");
const muted = "var(--ds-color-text-muted)";

export type ArcadeMarqueeProps = {
  accent: string;
  sportLabel: string;
  gameTitle: string;
  /** First place's score, or null on an empty board. */
  hiScore: number | null;
  /** The player's row, or null for a guest or a player not yet on the board. */
  user: { rank: number; score: number } | null;
  /** Shown in place of the player's score when there is no row. */
  guest: boolean;
  total: number;
};

export function ArcadeMarquee({
  accent,
  sportLabel,
  gameTitle,
  hiScore,
  user,
  guest,
  total,
}: ArcadeMarqueeProps) {
  return (
    <header className="flex flex-col items-center text-center">
      <div className="grid w-full grid-cols-3 items-start gap-2">
        <Readout
          label="1UP"
          labelColor={cyan}
          blink
          value={user ? padScore(user.score) : guest ? "INSERT COIN" : "------"}
          valueColor={user ? cyan : muted}
          small={!user}
          align="start"
        />
        <Readout
          label="HI-SCORE"
          labelColor={gold}
          value={hiScore == null ? "------" : padScore(hiScore)}
          valueColor={gold}
          align="center"
        />
        <Readout
          label="RANK"
          labelColor={accent}
          value={user ? `${user.rank}/${total}` : `--/${total}`}
          valueColor={user ? accent : muted}
          align="end"
        />
      </div>

      <h2
        className={`${styles.title} ${styles.glow} mt-4 flex items-center gap-2.5 font-display font-black sm:gap-3.5`}
        style={{ color: accent }}
      >
        <Chevrons accent={accent} />
        <span>HIGH&nbsp;SCORES</span>
        <Chevrons accent={accent} flip />
      </h2>

      <p
        className="mt-2.5 flex max-w-full items-center gap-2 font-display font-black leading-none"
        style={{ fontSize: typography.sizeRem.p10, letterSpacing: "var(--ds-tracking-ultra)" }}
      >
        <span style={{ color: muted }}>STAGE</span>
        <span aria-hidden style={{ color: withAlpha(accent, 0.7) }}>
          ▸
        </span>
        <span className="truncate" style={{ color: "var(--ds-color-text-primary)" }}>
          {`${sportLabel} // ${gameTitle}`}
        </span>
      </p>
    </header>
  );
}

function Readout({
  label,
  labelColor,
  value,
  valueColor,
  align,
  blink = false,
  small = false,
}: {
  label: string;
  labelColor: string;
  value: string;
  valueColor: string;
  align: "start" | "center" | "end";
  blink?: boolean;
  small?: boolean;
}) {
  const alignment = align === "start" ? "items-start text-left" : align === "end" ? "items-end text-right" : "items-center text-center";
  return (
    <div className={`flex min-w-0 flex-col ${alignment}`}>
      <span
        className={`font-display font-black leading-none ${blink ? styles.blink : ""}`}
        style={{ fontSize: typography.sizeRem.p10, letterSpacing: "var(--ds-tracking-ultra)", color: labelColor }}
      >
        {label}
      </span>
      <span
        className={`ds-tabular mt-1.5 max-w-full truncate font-display font-black leading-none ${styles.glow}`}
        style={{
          fontSize: small ? typography.sizeRem.p10 : typography.sizeRem.p15,
          letterSpacing: small ? "var(--ds-tracking-wide)" : "var(--ds-tracking-label)",
          color: valueColor,
          "--arcade-glow": valueColor,
        } as CSSProperties}
      >
        {value}
      </span>
    </div>
  );
}

function Chevrons({ accent, flip = false }: { accent: string; flip?: boolean }) {
  return (
    <span
      aria-hidden
      className="font-display font-black leading-none"
      style={{
        fontSize: typography.sizeRem.p16,
        letterSpacing: "-0.1em",
        color: withAlpha(accent, 0.55),
        transform: flip ? "scaleX(-1)" : undefined,
        display: "inline-block",
      }}
    >
      ›››
    </span>
  );
}
