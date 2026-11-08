"use client";

import { accentVar, AdaptiveDrawer, Badge } from "@statoz/design-system/games";

import { bingoCareerFor } from "../data/careers";
import type { BingoCell } from "../types";

import { Label } from "./bingo-chrome";

/**
 * A solved player's route — the web port of `_showCareerForCell`.
 *
 * Every senior club they turned out for, with the two the cell was made of
 * picked out. It opens only from a solved cell: before that it would be the
 * answer.
 *
 * The app uses a modal bottom sheet. `AdaptiveDrawer` is that on a phone and a
 * side panel on a desktop, where a sheet climbing out of the bottom of a wide
 * window reads as a phone pattern rather than a considered one.
 */

export type CareerSheetProps = {
  cell: BingoCell | null;
  onClose: () => void;
};

export function CareerSheet({ cell, onClose }: CareerSheetProps) {
  const career = cell === null ? null : bingoCareerFor(cell.playerId);
  const orange = accentVar("orange");

  return (
    <AdaptiveDrawer
      open={career !== null}
      onClose={onClose}
      title={career?.name ?? "Career route"}
    >
      {career === null || cell === null ? null : (
        <div className="flex flex-col gap-3.5 px-4 pb-6 pt-4">
          <Label color={orange}>ROUTE UNLOCKED</Label>

          <div className="flex flex-wrap gap-2">
            {career.clubHistory.map((spell) => {
              const onAxis = spell.clubId === cell.rowId || spell.clubId === cell.columnId;
              return (
                <Badge
                  key={spell.clubId}
                  accent={onAxis ? orange : "var(--ds-color-text-muted)"}
                  variant="outlined"
                >
                  {spell.label.toUpperCase()}
                </Badge>
              );
            })}
          </div>

          <Label tracking="var(--ds-tracking-mega)">VERIFIED SENIOR CLUB ROUTE</Label>
        </div>
      )}
    </AdaptiveDrawer>
  );
}
