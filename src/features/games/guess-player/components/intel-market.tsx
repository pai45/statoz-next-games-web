"use client";

import type { PlayerCard } from "@/domain/cards";

import { accentVar, Glyph, withAlpha } from "@statoz/design-system/games";

import { hintCost } from "../constants";
import type { GuessPlayerHintType } from "../types";
import type { GuessPlayerSport } from "../engine/deck";

import { Label } from "./guess-chrome";
import styles from "./guess-player.module.css";

/**
 * The two paid profile scans — `_IntelHintMarket` and `DailyMysteryCoinHint`.
 *
 * Neither costs an attempt; both cost coins. They sit outside the career route
 * on purpose, because the route is what the six free guesses buy and these are
 * what the wallet buys.
 */

/** The affiliation scan is a nationality in football and a team elsewhere. */
export function hintLabel(type: GuessPlayerHintType, sport: GuessPlayerSport): string {
  if (type === "position") return "POSITION";
  return sport === "football" ? "NATIONALITY" : "TEAM";
}

export function hintValue(
  type: GuessPlayerHintType,
  player: PlayerCard | null,
): string {
  if (player === null) return "INTEL UNAVAILABLE";
  return type === "position"
    ? player.position.toUpperCase()
    : player.country.toUpperCase();
}

export type IntelMarketProps = {
  sport: GuessPlayerSport;
  target: PlayerCard | null;
  revealed: GuessPlayerHintType[];
  coins: number;
  /** False in review, where nothing is for sale any more. */
  live: boolean;
  onUnlock: (type: GuessPlayerHintType) => void;
};

const types: GuessPlayerHintType[] = ["position", "affiliation"];

export function IntelMarket({
  sport,
  target,
  revealed,
  coins,
  live,
  onUnlock,
}: IntelMarketProps) {
  const affordable = coins >= hintCost;

  return (
    <div>
      <Label tracking="var(--ds-tracking-mega)">INTEL // {hintCost} COINS EACH</Label>
      <div className="mt-2 flex gap-1.5">
        {types.map((type) => (
          <CoinHint
            key={type}
            label={hintLabel(type, sport)}
            value={hintValue(type, target)}
            revealed={revealed.includes(type)}
            affordable={affordable}
            live={live}
            onUnlock={() => onUnlock(type)}
          />
        ))}
      </div>
    </div>
  );
}

function CoinHint({
  label,
  value,
  revealed,
  affordable,
  live,
  onUnlock,
}: {
  label: string;
  value: string;
  revealed: boolean;
  affordable: boolean;
  live: boolean;
  onUnlock: () => void;
}) {
  const cyan = accentVar("cyan");
  const accent = revealed
    ? cyan
    : affordable
      ? "var(--ds-color-text-muted)"
      : "var(--ds-color-danger)";
  const status = revealed ? "DECRYPTED" : `${hintCost} COINS`;
  const locked = revealed || !live;

  return (
    <button
      type="button"
      onClick={onUnlock}
      disabled={locked}
      aria-label={
        revealed
          ? `${label} hint decrypted. ${value}.`
          : `${label} hint. Unlock for ${hintCost} coins.`
      }
      className={`${styles.plate} flex min-h-13 flex-1 flex-col justify-center px-2.5 py-2 text-left ${
        locked ? "cursor-default" : "cursor-pointer"
      }`}
      style={{
        background: revealed
          ? `color-mix(in srgb, ${cyan} 8%, transparent)`
          : "var(--ds-color-background-muted)",
        border: `1px solid ${
          revealed ? withAlpha(cyan, 0.55) : "var(--ds-color-border-subtle)"
        }`,
      }}
    >
      <Label className="truncate" tracking="var(--ds-tracking-mega)">
        {label}
      </Label>
      <span className="mt-1.5 flex items-center gap-1">
        <span className="shrink-0" style={{ color: accent }}>
          <Glyph name={revealed ? "visibility" : "lock"} size={11} />
        </span>
        <Label className="min-w-0 flex-1 truncate" color={accent} tracking="var(--ds-tracking-tight)">
          {revealed ? value : status}
        </Label>
      </span>
    </button>
  );
}
