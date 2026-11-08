import { accentVar, CheckBoxBlankIcon, CheckBoxIcon } from "@statoz/design-system/games";

import type { FollowableLeague } from "../types";

const CYAN = accentVar("cyan");
const LIME = accentVar("lime");

export type LeaguePillsProps = {
  leagues: FollowableLeague[];
  /** The league whose clubs the grid below is showing. */
  activeId: string;
  followedIds: string[];
  onSelect: (league: FollowableLeague) => void;
  onToggle: (league: FollowableLeague) => void;
};

/**
 * The league strip. Each pill does two things — the plate brings a league's
 * clubs up in the grid below, the box follows it — so the follow control sits
 * over a stretched selection overlay rather than nesting inside one.
 */
export function LeaguePills({
  leagues,
  activeId,
  followedIds,
  onSelect,
  onToggle,
}: LeaguePillsProps) {
  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1">
      {leagues.map((league) => {
        const active = league.id === activeId;
        const followed = followedIds.includes(league.id);
        const accent = followed ? LIME : CYAN;
        const CheckGlyph = followed ? CheckBoxIcon : CheckBoxBlankIcon;

        return (
          <div
            key={league.id}
            className="relative flex h-23 w-[6.625rem] shrink-0 flex-col p-2"
            style={{
              background: active
                ? "var(--ds-color-background-secondary)"
                : "color-mix(in srgb, var(--ds-color-background-secondary) 64%, transparent)",
              borderColor: active ? accent : "var(--ds-color-border-subtle)",
              borderWidth: active ? "1.5px" : "1px",
              borderStyle: "solid",
            }}
          >
            <button
              type="button"
              aria-label={`Show ${league.name} clubs`}
              aria-current={active || undefined}
              onClick={() => onSelect(league)}
              className="absolute inset-0"
            />

            <div className="pointer-events-none relative flex items-start justify-between gap-1">
              <span
                className="truncate font-display text-sm font-black leading-tight"
                style={{ color: active ? accent : "var(--ds-color-text-muted)" }}
              >
                {league.shortCode}
              </span>
            </div>

            <span
              className="pointer-events-none relative mt-auto line-clamp-2 font-display text-2xs font-extrabold leading-tight text-muted"
              style={{ letterSpacing: "var(--ds-tracking-tight)" }}
            >
              {league.name.toUpperCase()}
            </span>

            <button
              type="button"
              role="checkbox"
              aria-checked={followed}
              aria-label={`Follow ${league.name}`}
              onClick={() => onToggle(league)}
              className="absolute right-1.5 top-1.5 z-10 grid size-6 place-items-center transition-opacity hover:opacity-75"
              style={{ color: accent }}
            >
              <CheckGlyph size={18} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
