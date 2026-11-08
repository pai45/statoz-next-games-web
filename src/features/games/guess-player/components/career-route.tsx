"use client";

import { accentVar, Glyph, withAlpha } from "@statoz/design-system/games";

import type { GuessPlayerClue } from "../types";

import { Label } from "./guess-chrome";
import styles from "./guess-player.module.css";

/**
 * The six-stop career route — `_CareerRouteStrip` and its node.
 *
 * One badge per clue: locked badges carry a question mark, decrypted ones carry
 * the club's initials and the year it began. The arrow between two stops lights
 * only once both ends are out, so the route reads as a path being walked rather
 * than six separate facts.
 *
 * The app measures the row and clamps each badge between 31 and 48 pixels. Here
 * the six columns divide the row instead, so the strip fits a 320-pixel phone
 * and a wide panel without either being a special case.
 */

const ignoredWords = new Set(["fc", "cf", "club", "bc", "cc"]);

/**
 * A club's badge letters. `Manchester City` reads MC, `Barcelona` reads BAR,
 * and the filler words a club name carries are dropped first so `FC Porto`
 * does not come out as FP.
 */
export function teamInitials(teamName: string): string {
  const words = teamName.match(/[A-Za-z0-9]+/g) ?? [];
  const meaningful = words.filter((word) => !ignoredWords.has(word.toLowerCase()));
  const source = meaningful.length === 0 ? words : meaningful;
  if (source.length === 0) return "?";
  if (source.length === 1) return source[0].slice(0, 3).toUpperCase();
  return source
    .slice(0, 3)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export type CareerRouteProps = {
  clues: GuessPlayerClue[];
  revealedClueCount: number;
};

export function CareerRoute({ clues, revealedClueCount }: CareerRouteProps) {
  return (
    <div className="flex items-start justify-center gap-1.5 sm:gap-2.5">
      {Array.from({ length: 6 }, (_, index) => {
        const clue = index < clues.length ? clues[index] : undefined;
        return (
          <div key={index} className="contents">
            <RouteNode
              index={index}
              clue={clue}
              revealed={index < revealedClueCount}
              next={index === revealedClueCount}
            />
            {index < 5 ? (
              <span
                aria-hidden
                className="mt-4 block shrink-0"
                style={{
                  color:
                    index < revealedClueCount - 1
                      ? accentVar("cyan")
                      : "var(--ds-color-text-muted)",
                }}
              >
                <Glyph name="arrow_forward" size={11} />
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function RouteNode({
  index,
  clue,
  revealed,
  next,
}: {
  index: number;
  clue: GuessPlayerClue | undefined;
  revealed: boolean;
  /** The badge the next miss decrypts. */
  next: boolean;
}) {
  const cyan = accentVar("cyan");
  const pink = accentVar("pink");
  const year = clue?.year ?? null;
  const isStop = year !== null;
  const teamName = clue?.value ?? "Unknown team";

  const description = revealed
    ? isStop
      ? `Career stop ${index + 1}. ${teamName}. Joined in ${year}.`
      : `Career route ${index + 1}. Route complete.`
    : isStop
      ? `Career stop ${index + 1} hidden. Joined in ${year}.`
      : `Career stop ${index + 1} hidden.`;

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center">
      <span
        // Keyed on the reveal so the badge replays its flip the moment it falls.
        key={revealed ? "open" : "shut"}
        role="img"
        aria-label={description}
        title={revealed ? teamName : "Encrypted team"}
        className={`${styles.decrypt} ${next && !revealed ? styles.nextNode : ""} grid aspect-square w-full max-w-12 place-items-center font-display font-black leading-none`}
        style={{
          clipPath: "var(--ds-clip-octagon)",
          background: revealed
            ? `color-mix(in srgb, ${cyan} 20%, var(--ds-color-background-primary))`
            : withAlpha("var(--ds-color-text-muted)", 0.22),
          border: `1px solid ${next && !revealed ? pink : "var(--ds-color-border-subtle)"}`,
          color: revealed ? cyan : "var(--ds-color-text-default)",
          fontSize: revealed && isStop ? "clamp(9px, 2.6vw, 12px)" : "clamp(12px, 3.4vw, 17px)",
          letterSpacing: "var(--ds-tracking-tight)",
        }}
      >
        {revealed ? (
          isStop ? (
            teamInitials(teamName)
          ) : (
            <Glyph name="flag" size={18} />
          )
        ) : (
          "?"
        )}
      </span>
      <Label
        className="mt-1 ds-tabular"
        color={revealed ? cyan : "var(--ds-color-text-muted)"}
        tracking="var(--ds-tracking-tight)"
      >
        {year ?? "—"}
      </Label>
    </div>
  );
}
