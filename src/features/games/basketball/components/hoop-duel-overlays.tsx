"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { accentVar, feedbackVar, Glyph, withAlpha } from "@statoz/design-system/games";

import { overtimeStingerMs } from "../constants";
import { buildLook } from "../data/looks";
import type { HoopDuelGame } from "../engine/game-loop";

import styles from "./hoop-duel.module.css";

/**
 * The between-play overlays — the web port of `basketball_overlays.dart` plus
 * the confirm dialog the match screen raises on the way out.
 *
 * Each one owns a beat the match cannot continue through: who plays the second
 * half, that the scores are level, or whether you really mean to walk off.
 */

const gold = accentVar("gold");
const cyan = accentVar("cyan");
const violet = accentVar("violet");
const success = feedbackVar("success");
const danger = feedbackVar("danger");

/* ---- Halftime -------------------------------------------------------------- */

export type HalftimeOverlayProps = {
  game: HoopDuelGame;
  /** Called with the roster index to field for the second half. */
  onResume: (rosterIndex: number) => void;
};

/**
 * Halftime: the score, and the one decision worth making — who takes the second
 * half. The bench has rested to full, so this is a real trade between the legs
 * you have left and the player you would rather have on the floor.
 */
export function HalftimeOverlay({ game, onResume }: HalftimeOverlayProps) {
  const team = game.engine.teams[0];
  const activeIndex = team.activeIndex;
  const [selected, setSelected] = useState(activeIndex);

  const staminaFor = (index: number) =>
    index === activeIndex ? game.engine.playerBody.stamina : team.staminas[index];

  const chosen = team.roster[selected];

  return (
    <Scrim>
      <div className="flex w-full max-w-110 flex-col px-6 py-4">
        <h2
          className="text-center font-display font-black leading-none"
          style={{
            fontSize: typography.sizeRem.p24,
            letterSpacing: "3px",
            textShadow: `0 0 16px ${withAlpha(gold, 0.5)}`,
          }}
        >
          HALFTIME
        </h2>

        <div className="mt-2.5 flex items-center justify-center gap-1">
          <span
            className="font-display font-black leading-none tabular-nums"
            style={{ fontSize: typography.sizeRem.p30, color: cyan }}
          >
            {game.engine.teams[0].score}
          </span>
          <span
            className="px-2 font-display font-black leading-none text-muted"
            style={{ fontSize: typography.sizeRem.p16 }}
          >
            —
          </span>
          <span
            className="font-display font-black leading-none tabular-nums"
            style={{ fontSize: typography.sizeRem.p30, color: violet }}
          >
            {game.engine.teams[1].score}
          </span>
        </div>

        <p
          className="mt-5 font-display font-black leading-none text-muted"
          style={{ fontSize: typography.sizeRem.p9, letterSpacing: "2px" }}
        >
          WHO TAKES THE SECOND HALF?
        </p>
        <p className="mt-1 text-[length:var(--ds-size-p11)] leading-body text-muted">
          The bench rested to full stamina.
        </p>

        <div className="mt-3 flex flex-col gap-2">
          {team.roster.map((athlete, index) => (
            <SubCard
              key={athlete.id}
              name={athlete.name}
              position={athlete.position}
              accent={buildLook(athlete).accent}
              stamina={staminaFor(index)}
              wasOn={index === activeIndex}
              selected={index === selected}
              onSelect={() => setSelected(index)}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => onResume(selected)}
          className="mt-5 w-full cursor-pointer px-4 py-3 text-center"
          style={{
            backgroundColor: withAlpha(gold, 0.14),
            border: `1.6px solid ${gold}`,
          }}
        >
          <span className="flex items-center justify-center gap-2" style={{ color: gold }}>
            <Glyph name="sports_basketball" size={16} />
            <span
              className="font-display font-black leading-none"
              style={{ fontSize: typography.sizeRem.p13, letterSpacing: "1.6px" }}
            >
              START 2ND HALF
            </span>
          </span>
          <span
            className="mt-1.5 block font-display font-black leading-none text-muted"
            style={{ fontSize: typography.sizeRem.p8, letterSpacing: "1.2px" }}
          >
            {selected === activeIndex
              ? `STAY WITH ${chosen.name.toUpperCase()}`
              : `SUB IN ${chosen.name.toUpperCase()} — FRESH LEGS`}
          </span>
        </button>
      </div>
    </Scrim>
  );
}

function SubCard({
  name,
  position,
  accent,
  stamina,
  wasOn,
  selected,
  onSelect,
}: {
  name: string;
  position: string;
  accent: string;
  stamina: number;
  wasOn: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const low = stamina < 35;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-left"
      style={{
        backgroundColor: selected
          ? `color-mix(in srgb, ${accent} 12%, var(--ds-color-background-elevated))`
          : "var(--ds-color-background-elevated)",
        border: `${selected ? 1.6 : 1}px solid ${
          selected ? accent : "color-mix(in srgb, var(--ds-color-border-default) 60%, transparent)"
        }`,
      }}
    >
      <span
        aria-hidden
        className="size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: accent }}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span
            className="truncate font-display font-black leading-none"
            style={{ fontSize: typography.sizeRem.p13, letterSpacing: "1px" }}
          >
            {name}
          </span>
          {wasOn ? (
            <Chip label="ON COURT" color={cyan} />
          ) : stamina >= 99 ? (
            <Chip label="FRESH" color={success} />
          ) : null}
          <span
            className="ml-auto shrink-0 font-display font-black leading-none text-muted"
            style={{ fontSize: typography.sizeRem.p8, letterSpacing: "1px" }}
          >
            {position}
          </span>
        </span>
        <span
          className="mt-1.5 block h-1.25 w-full overflow-hidden rounded-xs"
          style={{ backgroundColor: withAlpha(success, 0.12) }}
        >
          <span
            className="block h-full rounded-xs"
            style={{
              width: `${stamina}%`,
              backgroundColor: low ? danger : success,
            }}
          />
        </span>
      </span>
    </button>
  );
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="shrink-0 px-1.5 py-0.5 font-display font-black leading-none"
      style={{
        fontSize: typography.sizeRem.p7,
        letterSpacing: "1px",
        color,
        border: `1px solid ${withAlpha(color, 0.5)}`,
      }}
    >
      {label}
    </span>
  );
}

/* ---- Overtime -------------------------------------------------------------- */

/**
 * The OVERTIME stinger. It auto-advances, and a tap skips it — it exists to
 * make the moment land, not to ask anything.
 */
export function OvertimeOverlay({ onBegin }: { onBegin: () => void }) {
  const done = useRef(false);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onBegin();
  }, [onBegin]);

  useEffect(() => {
    const timer = window.setTimeout(finish, overtimeStingerMs);
    return () => window.clearTimeout(timer);
  }, [finish]);

  return (
    <button
      type="button"
      onClick={finish}
      aria-label="Begin overtime"
      className="absolute inset-0 z-30 grid cursor-pointer place-items-center"
      style={{ backgroundColor: withAlpha("#0d111a", 0.94) }}
    >
      <span className={`${styles.overtimeStinger} flex flex-col items-center`}>
        <span
          className="font-display font-black leading-none"
          style={{
            fontSize: typography.sizeRem.p34,
            letterSpacing: "4px",
            color: gold,
            textShadow: `0 0 22px ${withAlpha(gold, 0.6)}`,
          }}
        >
          OVERTIME
        </span>
        <span
          className="mt-2.5 font-display font-black leading-none"
          style={{ fontSize: typography.sizeRem.p10, letterSpacing: "2.4px" }}
        >
          SUDDEN DEATH — FIRST BASKET WINS
        </span>
      </span>
    </button>
  );
}

/* ---- Quit ------------------------------------------------------------------ */

/**
 * Walking off abandons the attempt: no record, no XP. The dialog says so
 * plainly, because the cost is real and it is not obvious.
 */
export function QuitDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="absolute inset-0 z-40 grid place-items-center px-6"
      style={{ backgroundColor: withAlpha("#0d111a", 0.92) }}
      role="dialog"
      aria-modal
      aria-label="Leave the court?"
    >
      <div
        className="w-full max-w-88 p-5"
        style={{
          backgroundColor: "var(--ds-color-background-elevated)",
          border: `1px solid ${withAlpha(danger, 0.5)}`,
        }}
      >
        <h2
          className="font-display font-black leading-none"
          style={{ fontSize: typography.sizeRem.p15, letterSpacing: "1.8px", color: danger }}
        >
          LEAVE THE COURT?
        </h2>
        <p className="mt-3 text-[length:var(--ds-size-p12)] leading-body text-muted">
          Walking out abandons the match — no XP, no record.
        </p>
        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 cursor-pointer px-3 py-2.5 font-display font-black leading-none"
            style={{
              fontSize: typography.sizeRem.p10,
              letterSpacing: "1.4px",
              color: cyan,
              border: `1px solid ${withAlpha(cyan, 0.5)}`,
            }}
          >
            KEEP PLAYING
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 cursor-pointer px-3 py-2.5 font-display font-black leading-none"
            style={{
              fontSize: typography.sizeRem.p10,
              letterSpacing: "1.4px",
              color: danger,
              backgroundColor: withAlpha(danger, 0.14),
              border: `1px solid ${danger}`,
            }}
          >
            LEAVE
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- Shared ---------------------------------------------------------------- */

function Scrim({ children }: { children: ReactNode }) {
  return (
    <div
      className="absolute inset-0 z-30 grid place-items-center overflow-y-auto"
      style={{ backgroundColor: withAlpha("#0d111a", 0.95) }}
    >
      {children}
    </div>
  );
}
