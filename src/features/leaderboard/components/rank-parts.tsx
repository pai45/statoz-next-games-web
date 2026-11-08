"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import type { CSSProperties } from "react";

import {
  accentVar,
  Avatar,
  feedbackVar,
  Monogram,
  ScheduleIcon,
  withAlpha,
} from "@statoz/design-system/games";
import type { SportTeam } from "@/domain/matches";
import { avatarForName } from "@/features/onboarding";
import { useCountUp } from "@/shared/hooks";
import { formatInt } from "@/shared/utils";

import { padScore } from "../arcade";
import { plateFill, RankPlate } from "./rank-plate";

/**
 * The small parts every rank board is built from — the face, the tag pill, the
 * movement delta, the counted score and the countdown.
 */

const cyan = accentVar("cyan");
const gold = accentVar("gold");
const orange = accentVar("orange");

/* ---- Avatar -------------------------------------------------------------- */

export type RivalAvatarProps = {
  name: string;
  size: number;
  /** Marks the player's own face: a thicker, brighter ring. */
  highlight?: boolean;
  /** Overrides the ring colour — the podium tints it by placing. */
  ring?: string;
  /** Equipped shop frame color for the player's own avatar. */
  frameColor?: string;
  /** A team row shows a crest instead of a face, and no ring. */
  team?: SportTeam;
  /**
   * The portrait to use. Only the player passes one; every rival's face is
   * derived from their name so they look the same wherever they appear.
   */
  src?: string;
  className?: string;
};

/** Octagon-clipped portrait, or a team's crest. */
export function RivalAvatar({
  name,
  size,
  highlight = false,
  ring,
  frameColor,
  team,
  src,
  className,
}: RivalAvatarProps) {
  if (team) {
    return (
      <Monogram
        name={team.name}
        initials={team.shortName}
        accent={team.color}
        size={size}
        className={className}
      />
    );
  }

  const color = frameColor ?? ring ?? (highlight ? cyan : "var(--ds-color-border-default)");

  return (
    <Avatar
      src={src ?? avatarForName(name).src}
      alt={name}
      size={size}
      ring={withAlpha(color, highlight ? 0.9 : 0.42)}
      ringWidth={highlight ? 2 : 1.2}
      className={className}
    />
  );
}

/* ---- Pills --------------------------------------------------------------- */

/** A tiny chamfered label — YOU, PRO, a team's short name. */
export function RankTag({ label, color }: { label: string; color: string }) {
  return (
    <RankPlate
      cut={4}
      background={plateFill(color, 0.16)}
      borderColor={withAlpha(color, 0.7)}
      className="inline-block shrink-0"
    >
      <span
        className="block px-1.5 py-px font-display font-black leading-normal"
        style={{
          fontSize: typography.sizeRem.p9,
          letterSpacing: "var(--ds-tracking-wide)",
          color,
        }}
      >
        {label}
      </span>
    </RankPlate>
  );
}

/** The rank delta: climbed, dropped, held, or a first-time entrant. */
export function MovementBadge({
  movement,
  isNew,
}: {
  movement: number;
  isNew: boolean;
}) {
  const [label, color, description] = isNew
    ? ["NEW", gold, "New entry"]
    : movement > 0
      ? [`▲${movement}`, feedbackVar("success"), `Up ${movement}`]
      : movement < 0
        ? [`▼${-movement}`, feedbackVar("danger"), `Down ${-movement}`]
        : ["—", "var(--ds-color-text-muted)", "Unchanged"];

  return (
    <span
      className="ds-tabular shrink-0 font-display font-black leading-none"
      style={{
        fontSize: typography.sizeRem.p11,
        letterSpacing: "var(--ds-tracking-tight)",
        color,
      }}
      aria-label={description}
    >
      {label}
    </span>
  );
}

/**
 * A score that counts up to its value the first time it lands.
 *
 * The app re-keys the widget so a board change restarts the count; give this
 * the same `key` and React remounts it for exactly the same effect.
 */
export function ScoreText({
  value,
  suffix = "",
  pad,
  className,
  style,
}: {
  value: number;
  suffix?: string;
  /** Zero-pads to this many digits (`000071`) instead of grouping thousands. */
  pad?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const shown = useCountUp(value);
  return (
    <span className={className} style={style}>
      {pad ? padScore(shown, pad) : formatInt(shown)}
      {suffix}
    </span>
  );
}

/**
 * `04h 12m` above an hour, `12m 05s` below — the granularity a board countdown
 * wants. Ported as written; the web feeds it a real clock rather than the
 * app's frozen fixture.
 */
export function formatBoardCountdown(remainingMs: number): string {
  if (remainingMs <= 0) return "00m 00s";
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (hours > 0) return `${pad(hours)}h ${pad(minutes)}m`;
  return `${pad(minutes)}m ${pad(totalSeconds % 60)}s`;
}

/** The amber "time left" pill above a live board. */
export function CountdownPill({
  remaining,
  label,
  accent = orange,
}: {
  remaining: string;
  label?: string;
  accent?: string;
}) {
  return (
    <RankPlate
      cut={8}
      background={plateFill(accent, 0.14)}
      borderColor={withAlpha(accent, 0.55)}
      className="inline-block"
    >
      <span className="flex items-center gap-1.25 px-2.5 py-1.5">
        <ScheduleIcon size={13} style={{ color: accent }} />
        <span
          className="ds-tabular font-display font-black leading-none"
          style={{
            fontSize: typography.sizeRem.p10,
            letterSpacing: "var(--ds-tracking-label)",
            color: accent,
          }}
        >
          {label ? `${label} ${remaining}` : remaining}
        </span>
      </span>
    </RankPlate>
  );
}
