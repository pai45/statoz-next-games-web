"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

import { accentVar, ArrowLeftIcon, FlameIcon } from "@statoz/design-system/games";
import { sportModuleFor, sportOrder, type Sport } from "@/domain/sports";

import { SportIcon } from "./sport-icon";
import type { SportHubSelection } from "./sport-hub-tabs";
import styles from "./all-sports-selector.module.css";

export type SportSelectorCount = {
  total: number;
  live?: number;
};

export type AllSportsSelectorProps = {
  open: boolean;
  mode: "matches" | "games";
  selected: SportHubSelection;
  counts: Record<Sport, SportSelectorCount>;
  onSelect: (selection: SportHubSelection) => void;
  onClose: () => void;
};

/** Full-screen sport catalogue shared by MATCH and GAMES. */
export function AllSportsSelector({
  open,
  mode,
  selected,
  counts,
  onSelect,
  onClose,
}: AllSportsSelectorProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const total = sportOrder.reduce((sum, sport) => sum + counts[sport].total, 0);
  const live = sportOrder.reduce((sum, sport) => sum + (counts[sport].live ?? 0), 0);

  function choose(next: SportHubSelection) {
    onSelect(next);
    dialogRef.current?.close();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="all-sports-title"
      className={styles.dialog}
      onClose={onClose}
    >
      <div className={`${styles.surface} flex min-h-full flex-col`}>
        <header className="sticky top-0 z-10 border-b border-line bg-background/95 backdrop-blur-md">
          <div className="mx-auto flex min-h-16 w-full max-w-3xl items-center px-2 sm:px-4">
            <button
              type="button"
              aria-label="Back to home"
              title="Back"
              onClick={() => dialogRef.current?.close()}
              className="grid size-11 shrink-0 place-items-center text-cyan"
            >
              <ArrowLeftIcon size={23} />
            </button>
            <div className="min-w-0 pl-2">
              <h2 id="all-sports-title" className="font-display text-base font-black tracking-mega">
                ALL SPORTS
              </h2>
              <p className="mt-0.5 font-display text-2xs font-extrabold tracking-ultra text-muted">
                {mode === "matches" ? "MATCH CENTRE" : "GAME ARCADE"}
              </p>
            </div>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 sm:px-6">
          <p className="mb-3 font-display text-2xs font-black tracking-max text-muted">
            SELECT DESTINATION
          </p>
          <div className="flex flex-col gap-3">
            <SelectorRow
              label="TRENDING"
              detail={mode === "matches" ? "THE BIGGEST FIXTURES NOW" : "QUICK PLAY ACROSS SPORTS"}
              count={mode === "matches" && live > 0 ? `${live} LIVE · ${total}` : `${total} GAMES`}
              accent={accentVar("cyan")}
              selected={selected === null}
              icon={<FlameIcon size={25} />}
              onClick={() => choose(null)}
            />
            {sportOrder.map((sport) => {
              const sportModule = sportModuleFor(sport);
              const count = counts[sport];
              const countLabel = mode === "matches"
                ? count.live
                  ? `${count.live} LIVE · ${count.total}`
                  : `${count.total} FIXTURES`
                : `${count.total} GAMES`;
              return (
                <SelectorRow
                  key={sport}
                  label={sport === "basketball" ? "BASKETBALL" : sportModule.label.toUpperCase()}
                  detail={mode === "matches" ? "FIXTURES & RESULTS" : "SPORT GAME DECK"}
                  count={countLabel}
                  accent={accentVar(sportModule.accent)}
                  selected={selected === sport}
                  live={mode === "matches" && Boolean(count.live)}
                  icon={<SportIcon sport={sport} size={25} />}
                  onClick={() => choose(sport)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </dialog>
  );
}

function SelectorRow({
  label,
  detail,
  count,
  accent,
  selected,
  live = false,
  icon,
  onClick,
}: {
  label: string;
  detail: string;
  count: string;
  accent: string;
  selected: boolean;
  live?: boolean;
  icon: ReactNode;
  onClick: () => void;
}) {
  const style = { "--selector-accent": accent } as CSSProperties;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`${styles.row} ${selected ? styles.selected : ""}`}
      style={style}
    >
      <span className={styles.rowInner}>
        <span className={styles.iconPlate}>{icon}</span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate font-display text-sm font-black tracking-display">
            {label}
          </span>
          <span className="mt-1 block truncate font-display text-2xs font-bold tracking-ultra text-muted">
            {detail}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {live ? <span className={styles.liveDot} aria-hidden /> : null}
          <span className="ds-tabular font-display text-2xs font-black tracking-wide text-muted">
            {count}
          </span>
        </span>
      </span>
    </button>
  );
}
