import { Avatar, hudChamferPath, withAlpha } from "@statoz/design-system/games";

import type { MatchmakingFighter } from "./types";

/**
 * One side of the face-off: an octagon portrait overlapping a chamfered
 * nameplate, with a level tab hanging off its lower corner.
 *
 * Flutter measures every part of this off the portrait, and clamps the portrait
 * to a phone's width. The web column is capped at a width where that clamp
 * always lands on its ceiling, so the portrait is simply stated at that size
 * and the plate — the only part that has any reason to grow — takes the rest of
 * the row.
 *
 * A clip path crops a border away, so the plate is an accent-coloured shape
 * with its fill inset inside it: the same construction the design system's
 * button and avatar already use.
 */

/** The plate's silhouette, and the tighter cut its level tab wears. */
const plateClip = hudChamferPath(22, 8);
const badgeClip = hudChamferPath(8, 4);

/** Portrait edge, and the geometry Flutter derives from it. */
const portrait = 112;
const overlap = Math.round(portrait * 0.68);
const nameInset = Math.round(portrait * 0.38);
const badgeWidth = Math.max(58, Math.round(portrait * 0.56));

export type MatchmakingPlayerBannerProps = {
  fighter: MatchmakingFighter;
  /** Used when the fighter names no accent of its own. */
  accent: string;
  /** The rival's side: portrait and tab move to the right, the plate to the left. */
  mirrored?: boolean;
  className?: string;
};

export function MatchmakingPlayerBanner({
  fighter,
  accent: fallback,
  mirrored = false,
  className,
}: MatchmakingPlayerBannerProps) {
  const accent = fighter.accent ?? fallback;
  const name = fighter.name.toUpperCase();
  const side = mirrored ? "right" : "left";
  const far = mirrored ? "left" : "right";

  return (
    <div
      className={["relative h-31 w-full", className ?? ""].filter(Boolean).join(" ")}
      role="group"
      aria-label={`${name} matchmaking identity`}
    >
      {/* The nameplate, tucked under the portrait's inner edge. */}
      <div
        className="absolute top-5.5 h-19.5"
        style={{
          [side]: overlap,
          [far]: 0,
          clipPath: plateClip,
          background: withAlpha(accent, 0.72),
        }}
      >
        <div
          className="absolute inset-px flex items-center"
          style={{
            clipPath: plateClip,
            background: `color-mix(in srgb, ${accent} 14%, var(--ds-color-background-elevated))`,
            paddingInlineStart: mirrored ? 22 : nameInset,
            paddingInlineEnd: mirrored ? nameInset : 22,
          }}
        >
          {/* The lit top edge — the one bright line on the plate. */}
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-0.5"
            style={{ background: withAlpha(accent, 0.82) }}
          />
          <span
            className="w-full truncate text-center font-display font-black leading-compact"
            style={{
              fontSize: "var(--ds-text-2xl)",
              letterSpacing: "var(--ds-tracking-display)",
            }}
          >
            {name}
          </span>
        </div>
      </div>

      {/* The portrait, riding above the plate's top edge. */}
      <span className="absolute top-0" style={{ [side]: 0 }}>
        <Avatar
          src={fighter.avatar}
          alt=""
          size={portrait}
          ring={withAlpha(accent, 0.9)}
          ringWidth={2}
        />
      </span>

      {/* The level tab, hanging off the portrait's outer lower corner. */}
      {fighter.badge === undefined ? null : (
        <div
          className="absolute bottom-0 h-7"
          style={{
            [side]: 4,
            width: badgeWidth,
            clipPath: badgeClip,
            background: withAlpha(accent, 0.72),
          }}
        >
          <div
            className="ds-tabular absolute inset-px grid place-items-center font-display font-black leading-compact"
            style={{
              clipPath: badgeClip,
              color: accent,
              background: `color-mix(in srgb, ${accent} 18%, var(--ds-color-background-primary))`,
              fontSize: "var(--ds-text-micro)",
              letterSpacing: "var(--ds-tracking-ultra)",
            }}
          >
            {fighter.badge.toUpperCase()}
          </div>
        </div>
      )}
    </div>
  );
}
