"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import { withAlpha } from "@statoz/design-system/games";

import {
  matchesBoardOrder,
  tournamentScopeOrder,
} from "../scoring";
import { gameRegistry, sportGameDecks } from "@/mocks/games";
import type { Sport } from "@/domain/sports";
import type {
  GameMode,
  LeaderboardType,
  MatchesBoard,
  TournamentScope,
} from "../types";

import styles from "./leaderboard.module.css";
import { plateFill, RankPlate } from "./rank-plate";

/**
 * The row of controls that changes with the board: a countdown on MATCH DAY,
 * a teams/players split and a scope toggle on TOURNEY, a mode strip on GAMES.
 *
 * They are one component because the app treats them as one — the board picks
 * which of the three it is showing, and never shows two at once.
 */

const panel = "var(--ds-color-background-elevated)";
const line = "var(--ds-color-border-strong)";

const boardLabels: Record<MatchesBoard, string> = {
  teams: "TEAMS",
  players: "PLAYERS",
};

const scopeLabels: Record<TournamentScope, string> = {
  weekly: "WEEKLY",
  season: "SEASON",
  allTime: "ALL-TIME",
};

export type LeaderboardFiltersProps = {
  type: LeaderboardType;
  sport: Sport;
  accent: string;
  board: MatchesBoard;
  onBoard: (board: MatchesBoard) => void;
  scope: TournamentScope;
  onScope: (scope: TournamentScope) => void;
  mode: GameMode;
  onMode: (mode: GameMode) => void;
};

export function LeaderboardFilters({
  type,
  sport,
  accent,
  board,
  onBoard,
  scope,
  onScope,
  mode,
  onMode,
}: LeaderboardFiltersProps) {
  if (type === "matches") {
    return (
      <div className="flex flex-col gap-2.5">
        <ChipRow
          label="Tournament board"
          items={matchesBoardOrder.map((id) => ({ id, label: boardLabels[id] }))}
          activeId={board}
          accent={accent}
          onSelect={onBoard}
        />
        <ChipRow
          label="Ranking period"
          items={tournamentScopeOrder.map((id) => ({ id, label: scopeLabels[id] }))}
          activeId={scope}
          accent={accent}
          onSelect={onScope}
        />
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label="Game mode"
      className={`${styles.railScroll} -mx-4 flex gap-1.75 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0`}
    >
      {sportGameDecks[sport].map((id) => (
        <FilterChip
          key={id}
          label={gameRegistry[id].title.toUpperCase()}
          active={id === mode}
          accent={accent}
          transparentWhenIdle
          className="shrink-0 px-3"
          onSelect={() => onMode(id)}
        />
      ))}
    </div>
  );
}

function ChipRow<Id extends string>({
  label,
  items,
  activeId,
  accent,
  onSelect,
}: {
  label: string;
  items: { id: Id; label: string }[];
  activeId: Id;
  accent: string;
  onSelect: (id: Id) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-1.5">
      {items.map((item) => (
        <FilterChip
          key={item.id}
          label={item.label}
          active={item.id === activeId}
          accent={accent}
          className="min-w-0 flex-1"
          onSelect={() => onSelect(item.id)}
        />
      ))}
    </div>
  );
}

function FilterChip({
  label,
  active,
  accent,
  className,
  transparentWhenIdle = false,
  onSelect,
}: {
  label: string;
  active: boolean;
  accent: string;
  className?: string;
  /** The mode strip's chips sit on the page rather than on a plate. */
  transparentWhenIdle?: boolean;
  onSelect: () => void;
}) {
  // The app leaves the mode strip's idle chips transparent over the scaffold.
  // An edge plate sits behind every fill here, so "transparent" has to be
  // spelled as the ground itself or the border would flood the chip.
  const idleBackground = transparentWhenIdle
    ? plateFill(panel, 0)
    : plateFill(panel, 0.5);

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={["block cursor-pointer", className ?? ""].filter(Boolean).join(" ")}
    >
      <RankPlate
        cut={8}
        background={
          active
            ? plateFill(accent, transparentWhenIdle ? 0.16 : 0.14)
            : idleBackground
        }
        borderColor={active ? accent : withAlpha(line, transparentWhenIdle ? 0.4 : 0.35)}
        interactive
      >
        <span
          className="block truncate px-2 py-1.75 text-center font-display font-black leading-none"
          style={{
            fontSize: typography.sizeRem.p10,
            letterSpacing: "var(--ds-tracking-wide)",
            color: active ? accent : "var(--ds-color-text-muted)",
          }}
        >
          {label}
        </span>
      </RankPlate>
    </button>
  );
}
