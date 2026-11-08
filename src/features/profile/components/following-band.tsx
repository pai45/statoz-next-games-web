"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import { useState } from "react";

import { accentVar, EditIcon, Monogram, withAlpha } from "@statoz/design-system/games";
import { sportModuleFor, type Sport } from "@/domain/sports";
import { followableLeagueById } from "@/features/onboarding";
import { SportIcon } from "@/features/matches";

import { saveFollowing } from "../state/profile-identity";
import type { ProfileIdentity } from "../types";

import { FollowingEditor } from "./following-editor";
import { ProfilePanel } from "./profile-panel";

/**
 * The strip under the hero: the primary sport, then a badge per followed league
 * with the club named inside it. Static chrome, no glow, and it says so plainly
 * when nothing has been picked rather than disappearing.
 *
 * Flutter renders nothing at all until a favourite exists, which leaves a new
 * player no way in. The web keeps the row and lets the empty state carry the
 * invitation — the edit control has to stay reachable either way.
 */

const cyan = accentVar("cyan");

export type FollowingBandProps = {
  identity: ProfileIdentity;
};

type Favourite = {
  leagueId: string;
  leagueCode: string;
  teamName: string;
  teamShortName: string;
  teamColor: string;
};

/** Resolves the stored ids into the pairs the row prints. */
function favouritesOf(identity: ProfileIdentity): Favourite[] {
  const out: Favourite[] = [];
  for (const leagueId of identity.followedLeagueIds) {
    const league = followableLeagueById(leagueId);
    const teamId = identity.favoriteTeams[leagueId];
    if (!league || !teamId) continue;
    const team = league.teams.find((entry) => entry.id === teamId);
    if (!team) continue;
    out.push({
      leagueId,
      leagueCode: league.shortCode,
      teamName: team.name,
      teamShortName: team.shortName,
      teamColor: team.color,
    });
  }
  return out;
}

export function FollowingBand({ identity }: FollowingBandProps) {
  const [editing, setEditing] = useState(false);
  const favourites = favouritesOf(identity);

  return (
    <>
      <ProfilePanel>
        <div className="flex items-center gap-2.5 px-3.5 pb-3.5 pt-3">
          <PrimarySportChip sport={identity.primarySport} />

          <div className="min-w-0 flex-1">
            {favourites.length === 0 ? (
              <p className="text-sm leading-body text-muted">
                Pick the teams and clubs you follow.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2.5">
                {favourites.map((favourite) => (
                  <li key={favourite.leagueId}>
                    <FollowedTeamChip favourite={favourite} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Edit followed teams"
            className="grid size-8 shrink-0 cursor-pointer place-items-center border transition-colors"
            style={{
              color: cyan,
              borderColor: withAlpha(cyan, 0.55),
              background: withAlpha(cyan, 0.12),
            }}
          >
            <EditIcon size={16} />
          </button>
        </div>
      </ProfilePanel>

      {editing ? (
        <FollowingEditor
          primarySport={identity.primarySport}
          followedLeagueIds={identity.followedLeagueIds}
          favoriteTeams={identity.favoriteTeams}
          onCancel={() => setEditing(false)}
          onSave={(next) => {
            saveFollowing(next);
            setEditing(false);
          }}
        />
      ) : null}
    </>
  );
}

function PrimarySportChip({ sport }: { sport: Sport }) {
  const entry = sportModuleFor(sport);
  const accent = accentVar(entry.accent);

  return (
    // The plate reads "FTBL / MODULE", which says nothing out loud; the label
    // is what the chip actually means.
    <div
      role="img"
      aria-label={`Primary sport: ${entry.label}`}
      className="flex min-w-19 shrink-0 items-center gap-1.75 border px-2.25 py-2"
      style={{
        background: withAlpha(accent, 0.12),
        borderColor: withAlpha(accent, 0.58),
      }}
    >
      <SportIcon sport={sport} size={20} style={{ color: accent }} />
      <span className="min-w-0">
        <span className="block font-display text-sm font-black leading-none">
          {entry.shortLabel}
        </span>
        <span
          className="mt-0.5 block font-display font-black leading-none text-muted"
          style={{ fontSize: typography.sizeRem.p8, letterSpacing: "var(--ds-tracking-wide)" }}
        >
          MODULE
        </span>
      </span>
    </div>
  );
}

function FollowedTeamChip({ favourite }: { favourite: Favourite }) {
  return (
    <div
      className="flex min-w-21.5 items-center gap-2 border px-2.25 py-2"
      style={{
        background: withAlpha("var(--ds-color-background-secondary)", 0.56),
        borderColor: "var(--ds-color-border-strong)",
      }}
    >
      <Monogram
        name={favourite.teamName}
        initials={favourite.teamShortName}
        accent={favourite.teamColor}
        size={30}
      />
      <span className="min-w-0 max-w-14.5">
        <span className="block truncate font-display text-sm font-black leading-none">
          {favourite.teamShortName.toUpperCase()}
        </span>
        <span
          className="mt-0.5 block font-display font-black leading-none text-muted"
          style={{ fontSize: typography.sizeRem.p8, letterSpacing: "var(--ds-tracking-wide)" }}
        >
          {favourite.leagueCode}
        </span>
      </span>
    </div>
  );
}
