"use client";

import { useState } from "react";

import { Button, Monogram, SelectableTile } from "@statoz/design-system/games";
import type { Sport } from "@/domain/sports";
import {
  followableLeagueById,
  followableLeaguesForSport,
  LeaguePills,
  SportPills,
  type FollowableLeague,
} from "@/features/onboarding";

import { ProfileOverlay } from "./profile-overlay";

/**
 * EDIT CLUBS — the same three choices setup asked for, offered again.
 *
 * The pickers themselves are the onboarding controls, not copies of them: a
 * player who followed a league during setup should meet the identical control
 * when they change their mind. Only the framing differs — an overlay with a
 * SAVE, rather than a wizard step with a NEXT.
 *
 * Edits are held locally and committed on SAVE, so backing out of the overlay
 * leaves what was stored untouched. Flutter does the same, with a `bool` result
 * telling the band whether to re-read.
 */

export type FollowingEditorProps = {
  primarySport: Sport;
  followedLeagueIds: string[];
  favoriteTeams: Record<string, string>;
  onCancel: () => void;
  onSave: (next: {
    primarySport: Sport;
    followedLeagueIds: string[];
    favoriteTeams: Record<string, string>;
  }) => void;
};

export function FollowingEditor({
  primarySport,
  followedLeagueIds,
  favoriteTeams,
  onCancel,
  onSave,
}: FollowingEditorProps) {
  const [sport, setSport] = useState(primarySport);
  const [followed, setFollowed] = useState<string[]>(followedLeagueIds);
  const [teams, setTeams] = useState<Record<string, string>>(favoriteTeams);
  const [activeLeagueId, setActiveLeagueId] = useState(() =>
    initialActiveLeagueId(primarySport, followedLeagueIds),
  );

  const available = followableLeaguesForSport(sport);
  const activeLeague = followableLeagueById(activeLeagueId) ?? available[0];
  const selectedTeamId = teams[activeLeague.id];
  const leagueFollowed = followed.includes(activeLeague.id);

  /** Switching sport clears the picks, because a league belongs to one sport. */
  function selectSport(next: Sport) {
    if (next === sport) return;
    setSport(next);
    setFollowed([]);
    setTeams({});
    setActiveLeagueId(followableLeaguesForSport(next)[0].id);
  }

  function toggleLeague(league: FollowableLeague) {
    if (followed.includes(league.id)) {
      setFollowed((current) => current.filter((id) => id !== league.id));
      setTeams((current) => {
        const next = { ...current };
        delete next[league.id];
        return next;
      });
      if (activeLeagueId === league.id) {
        const remaining = followed.filter((id) => id !== league.id);
        setActiveLeagueId(remaining[0] ?? available[0].id);
      }
      return;
    }

    setFollowed((current) => [...current, league.id]);
    if (league.teams.length > 0) {
      setTeams((current) => ({ ...current, [league.id]: league.teams[0].id }));
    }
    setActiveLeagueId(league.id);
  }

  /** Naming a favourite follows its league, which is the point of naming one. */
  function selectTeam(teamId: string) {
    setFollowed((current) =>
      current.includes(activeLeague.id) ? current : [...current, activeLeague.id],
    );
    setTeams((current) => ({ ...current, [activeLeague.id]: teamId }));
  }

  function save() {
    // Stored in the order the sport lists its leagues, so the band reads the
    // same way every time rather than in the order they happened to be tapped.
    const orderedLeagueIds = available
      .map((league) => league.id)
      .filter((id) => followed.includes(id));
    const orderedTeams: Record<string, string> = {};
    for (const id of orderedLeagueIds) {
      const teamId = teams[id];
      if (teamId) orderedTeams[id] = teamId;
    }
    onSave({
      primarySport: sport,
      followedLeagueIds: orderedLeagueIds,
      favoriteTeams: orderedTeams,
    });
  }

  return (
    <ProfileOverlay
      title="EDIT CLUBS"
      size="full"
      onClose={onCancel}
      footer={
        <Button onClick={save} fullWidth>
          SAVE
        </Button>
      }
    >
      <div className="px-4 pb-4 pt-3.5">
        <SportPills selected={sport} onSelect={selectSport} />

        {/* Formula 1 is a single championship, so there is nothing to choose. */}
        {sport === "motorsport" ? null : (
          <div className="mt-3">
            <LeaguePills
              leagues={available}
              activeId={activeLeague.id}
              followedIds={followed}
              onSelect={(league) => setActiveLeagueId(league.id)}
              onToggle={toggleLeague}
            />
          </div>
        )}

        {activeLeague.teams.length === 0 ? (
          <p className="mt-6 text-sm leading-body text-muted">
            {activeLeague.name} fields individual athletes, so its line-up
            arrives with each tournament. Follow it now and pick a favourite
            later.
          </p>
        ) : (
          <div
            role="radiogroup"
            aria-label={`${activeLeague.name} clubs`}
            className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4"
          >
            {activeLeague.teams.map((team) => (
              <SelectableTile
                key={team.id}
                label={team.name}
                selected={team.id === selectedTeamId}
                onSelect={() => selectTeam(team.id)}
                dimmed={!leagueFollowed}
                sealSize={20}
                className="aspect-[0.92] w-full"
              >
                <span className="flex size-full flex-col items-center justify-center gap-1.75 px-1.5 py-2">
                  <Monogram
                    name={team.name}
                    initials={team.shortName}
                    accent={team.color}
                    size={40}
                  />
                  <span
                    className="w-full truncate text-center font-display text-2xs font-extrabold"
                    style={{
                      color:
                        team.id === selectedTeamId
                          ? "var(--ds-color-text-default)"
                          : "var(--ds-color-text-muted)",
                      letterSpacing: "var(--ds-tracking-tight)",
                    }}
                  >
                    {team.name.toUpperCase()}
                  </span>
                </span>
              </SelectableTile>
            ))}
          </div>
        )}
      </div>
    </ProfileOverlay>
  );
}

/** Opens on a followed league of the current sport, or the sport's first. */
function initialActiveLeagueId(sport: Sport, followedLeagueIds: string[]): string {
  for (const leagueId of followedLeagueIds) {
    if (followableLeagueById(leagueId)?.sport === sport) return leagueId;
  }
  return followableLeaguesForSport(sport)[0].id;
}
