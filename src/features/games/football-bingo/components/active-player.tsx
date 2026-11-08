"use client";

import type { RefObject } from "react";

import { accentVar, Badge, Glyph, withAlpha } from "@statoz/design-system/games";

import { bingoStatus, formatCountdown } from "../engine/day-keys";
import type { BingoCareer, BingoProgress } from "../types";

import { FlatPanel, Label } from "./bingo-chrome";

/**
 * Who to place next — the web port of `_PlayerPanel`.
 *
 * The app shows a portrait plate and two tags. It never prints the player's
 * name: the plate falls back to a generic ball for any player it has no
 * portrait for, which is all but twenty-four of the two hundred and thirteen on
 * these grids, and the game is unplayable when you cannot tell who you are
 * being asked about. The name is printed here for that reason — the same
 * information the picture was carrying, by the only means the web has.
 */

export type ActivePlayerProps = {
  career: BingoCareer | null;
  progress: BingoProgress;
  isToday: boolean;
  now: Date;
  plateRef: RefObject<HTMLDivElement | null>;
};

export function ActivePlayer({
  career,
  progress,
  isToday,
  now,
  plateRef,
}: ActivePlayerProps) {
  const orange = accentVar("orange");

  if (career === null) {
    if (!isToday) {
      return (
        <FlatPanel className="text-center">
          <p
            className="font-display font-black leading-compact"
            style={{ color: orange, fontSize: "var(--ds-text-md)" }}
          >
            GRID COMPLETE
          </p>
          <p
            className="mt-1.5 leading-body text-muted"
            style={{ fontSize: "var(--ds-text-xs)" }}
          >
            Return to logs for more grids.
          </p>
        </FlatPanel>
      );
    }

    const status = bingoStatus(progress, now);
    return (
      <FlatPanel borderColor={orange} className="text-center">
        <Label>NEXT GRID UNLOCKS IN</Label>
        <p
          className="mt-2 font-display font-black leading-compact ds-tabular"
          style={{ color: orange, fontSize: "var(--ds-text-2xl)" }}
        >
          {formatCountdown(status.remainingMs)}
        </p>
      </FlatPanel>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <Label>ACTIVE PLAYER</Label>

      <div
        ref={plateRef}
        className="mt-2.5 grid size-30 place-items-center gap-1"
        style={{
          background: "var(--ds-color-background-secondary)",
          border: `1px solid ${orange}`,
          color: orange,
        }}
      >
        <Glyph name="sports_soccer" size={40} />
        <span
          className="max-w-28 truncate font-display font-black leading-compact"
          style={{
            fontSize: "var(--ds-text-xs)",
            letterSpacing: "var(--ds-tracking-tight)",
          }}
        >
          {career.shortName}
        </span>
      </div>

      <p
        className="mt-3 text-center font-display font-black leading-tight"
        style={{
          fontSize: "var(--ds-text-lg)",
          letterSpacing: "var(--ds-tracking-tight)",
        }}
      >
        {career.name}
      </p>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Badge accent={accentVar("cyan")} variant="outlined">
          POS PLAYER
        </Badge>
        <Badge accent={orange} variant="outlined">
          TAG CAREER ROUTE
        </Badge>
      </div>

      <p
        className="mt-3 max-w-72 text-center leading-body text-muted"
        style={{ fontSize: "var(--ds-text-xs)" }}
      >
        Tap the cell where their two clubs meet.
      </p>
      <span
        className="mt-2 block h-px w-24"
        style={{ background: withAlpha(orange, 0.35) }}
      />
    </div>
  );
}
