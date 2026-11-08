"use client";

import type { CSSProperties, RefObject } from "react";

import { accentVar, Glyph, Monogram, withAlpha } from "@statoz/design-system/games";

import { gridSize } from "../constants";
import { bingoCareerFor } from "../data/careers";
import { clubAccent } from "../data/club-colours";
import { cellAt } from "../data/puzzles";
import type { BingoAxis, BingoCell, BingoPuzzle } from "../types";

import styles from "./football-bingo.module.css";

/**
 * The board — the web port of `_BingoGrid` and `_GridCell`.
 *
 * Four tracks by four: a gutter of club badges down the left and across the
 * top, and the nine intersections between them. The app measures a cell and
 * clamps it between 58 and 92 pixels; here the tracks do the sizing and the
 * board's own width caps the result, so it reflows on a narrow phone instead of
 * overflowing.
 */

export type BingoGridProps = {
  puzzle: BingoPuzzle;
  solved: ReadonlySet<string>;
  /** The cell mid-flight: solved, but still showing its empty face. */
  settlingCellId: string | null;
  /** An archived day shows where the answers were rather than asking for them. */
  revealAnswers: boolean;
  /** The cell the last wrong tap landed on. */
  wrongCellId: string | null;
  /** Nothing can be placed: the grid is finished, or out of lifelines. */
  disabled: boolean;
  onTapCell: (cellId: string) => void;
  onOpenRoute: (cell: BingoCell) => void;
  cellRefs: RefObject<Map<string, HTMLElement>>;
};

export function BingoGrid({
  puzzle,
  solved,
  settlingCellId,
  revealAnswers,
  wrongCellId,
  disabled,
  onTapCell,
  onOpenRoute,
  cellRefs,
}: BingoGridProps) {
  const rows = Array.from({ length: gridSize }, (_, row) => row);
  const columns = Array.from({ length: gridSize }, (_, column) => column);

  return (
    <div className={styles.board}>
      {/* The corner where the two gutters meet. */}
      <span className={styles.slot} aria-hidden />
      {puzzle.columns.map((axis) => (
        <AxisBadge key={`column-${axis.id}`} axis={axis} orientation="column" />
      ))}

      {rows.map((row) => (
        <BoardRow
          key={puzzle.rows[row].id}
          axis={puzzle.rows[row]}
          columnAxes={puzzle.columns}
          cells={columns.map((column) => cellAt(puzzle, row, column))}
          firstIndex={row * gridSize}
          solved={solved}
          settlingCellId={settlingCellId}
          revealAnswers={revealAnswers}
          wrongCellId={wrongCellId}
          disabled={disabled}
          onTapCell={onTapCell}
          onOpenRoute={onOpenRoute}
          cellRefs={cellRefs}
        />
      ))}
    </div>
  );
}

/**
 * A fragment rather than an element: the badge and its three cells are four
 * cells of the board's own grid, and wrapping them in a row would break the
 * shared column tracks.
 */
function BoardRow({
  axis,
  columnAxes,
  cells,
  firstIndex,
  solved,
  settlingCellId,
  revealAnswers,
  wrongCellId,
  disabled,
  onTapCell,
  onOpenRoute,
  cellRefs,
}: {
  axis: BingoAxis;
  columnAxes: readonly BingoAxis[];
  cells: BingoCell[];
  firstIndex: number;
} & Omit<BingoGridProps, "puzzle">) {
  return (
    <>
      <AxisBadge axis={axis} orientation="row" />
      {cells.map((cell, index) => (
        <GridCell
          key={cell.id}
          cell={cell}
          dealIndex={firstIndex + index}
          axisLabels={[axis.label, columnAxes[index].label]}
          solved={solved.has(cell.id)}
          settling={settlingCellId === cell.id}
          revealAnswer={revealAnswers}
          wrong={wrongCellId === cell.id}
          disabled={disabled}
          onTap={onTapCell}
          onOpenRoute={onOpenRoute}
          cellRefs={cellRefs}
        />
      ))}
    </>
  );
}

function AxisBadge({
  axis,
  orientation,
}: {
  axis: BingoAxis;
  orientation: "row" | "column";
}) {
  return (
    <span className={`${styles.slot} grid place-items-center`}>
      <Monogram
        name={`${axis.label}, ${orientation} axis`}
        initials={axis.shortLabel}
        accent={clubAccent(axis.id)}
        size={52}
      />
    </span>
  );
}

function GridCell({
  cell,
  dealIndex,
  axisLabels,
  solved,
  settling,
  revealAnswer,
  wrong,
  disabled,
  onTap,
  onOpenRoute,
  cellRefs,
}: {
  cell: BingoCell;
  dealIndex: number;
  axisLabels: [string, string];
  solved: boolean;
  settling: boolean;
  revealAnswer: boolean;
  wrong: boolean;
  disabled: boolean;
  onTap: (cellId: string) => void;
  onOpenRoute: (cell: BingoCell) => void;
  cellRefs: RefObject<Map<string, HTMLElement>>;
}) {
  const lime = accentVar("lime");
  const cyan = accentVar("cyan");
  const settled = solved && !settling;

  /*
   * The app's four fills, as tints of tokens rather than four more hex values:
   * a lime plate once solved, a cyan-washed plate on an archived day, a
   * danger-washed one where the last wrong tap landed, and the panel colour
   * otherwise.
   */
  const fill = settled
    ? lime
    : revealAnswer
      ? `color-mix(in srgb, ${cyan} 8%, var(--ds-color-background-secondary))`
      : wrong
        ? `color-mix(in srgb, var(--ds-color-danger) 22%, var(--ds-color-background-primary))`
        : "var(--ds-color-background-secondary)";
  const edge = settled
    ? lime
    : revealAnswer
      ? cyan
      : wrong
        ? "var(--ds-color-danger)"
        : "var(--ds-color-border-muted)";

  /*
   * On an archived day the answer is shown whether or not it was found. The
   * app prints the word SOLVED on cells that were never solved, which tells the
   * player nothing and contradicts the log tile that sent them here — its call
   * to action is CHECK ANSWER. So the answer is what it shows.
   */
  const revealed = settled || revealAnswer;
  const career = revealed ? bingoCareerFor(cell.playerId) : null;
  const interactive = revealed || !disabled;
  const intersection = `${axisLabels[0]} and ${axisLabels[1]}`;
  const label = revealed
    ? `${career?.name ?? "Solved"} at ${intersection}. Open their career route.`
    : `${intersection}: empty`;

  return (
    <span
      className={`${styles.slot} ${styles.dealt}`}
      style={{ "--deal-index": dealIndex } as CSSProperties}
      ref={(node) => {
        // The flight measures from the active plate to this cell, so each one
        // registers itself and clears the entry when it goes.
        const map = cellRefs.current;
        if (node === null) map.delete(cell.id);
        else map.set(cell.id, node);
      }}
    >
      <button
        type="button"
        disabled={!interactive}
        aria-label={label}
        onClick={() => (revealed ? onOpenRoute(cell) : onTap(cell.id))}
        className={`${styles.cell} ${interactive ? styles.cellLive : ""}`}
        style={{
          background: fill,
          borderColor: edge,
          borderWidth: wrong && !settled ? 2 : 1,
        }}
      >
        {revealed ? (
          <span
            className="grid place-items-center gap-0.5 px-1"
            style={{
              color: settled ? "var(--ds-color-text-inverse)" : cyan,
            }}
          >
            <Glyph name={settled ? "check" : "visibility"} size={20} />
            {/*
              * The app draws a portrait here and falls back to a bare tick for
              * the players it has no art for, which is nearly all of them. The
              * web has no bingo portraits at all, so the short name carries the
              * identity the picture was meant to.
              */}
            <span
              className="max-w-full truncate font-display font-black leading-compact"
              style={{
                fontSize: "var(--ds-text-2xs)",
                letterSpacing: "var(--ds-tracking-tight)",
              }}
            >
              {career?.shortName ?? ""}
            </span>
          </span>
        ) : (
          <span
            className="font-bold leading-compact text-muted"
            style={{
              fontSize: "var(--ds-text-2xs)",
              letterSpacing: "var(--ds-tracking-label)",
            }}
          >
            EMPTY
          </span>
        )}
      </button>
    </span>
  );
}

/** The board's edge-to-edge fill colour, reused by the flying tile. */
export function solvedPlateStyle(): CSSProperties {
  return {
    background: accentVar("lime"),
    border: `2px solid ${accentVar("orange")}`,
    boxShadow: `0 0 18px ${withAlpha(accentVar("orange"), 0.22)}`,
    color: "var(--ds-color-text-inverse)",
  };
}
