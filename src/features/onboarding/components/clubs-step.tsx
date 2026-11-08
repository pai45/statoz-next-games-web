import { SelectableTile } from "@statoz/design-system/games";
import type { Sport } from "@/domain/sports";
import { TeamBadge } from "@/features/matches";

import { followableLeagueById } from "@/mocks/onboarding";
import type { FollowableLeague } from "../types";

import { LeaguePills } from "./league-pills";
import { SportPills } from "./sport-pills";
import { StepShell } from "./step-shell";

export type ClubsStepProps = {
  sport: Sport;
  activeLeagueId: string;
  leagues: FollowableLeague[];
  followedIds: string[];
  favoriteTeams: Record<string, string>;
  onSelectSport: (sport: Sport) => void;
  onSelectLeague: (league: FollowableLeague) => void;
  onToggleLeague: (league: FollowableLeague) => void;
  onSelectTeam: (league: FollowableLeague, teamId: string) => void;
};

function subtitleFor(isFormulaOne: boolean, followedCount: number): string {
  if (isFormulaOne) {
    return "Pick your Formula 1 constructor. No league selection needed.";
  }
  if (followedCount === 0) {
    return "Pick a sport, choose leagues, or tap any club to follow it.";
  }
  return `${followedCount} followed — tap any club to update your picks.`;
}

/** Step three: sports, leagues, and clubs, all on one surface. */
export function ClubsStep({
  sport,
  activeLeagueId,
  leagues,
  followedIds,
  favoriteTeams,
  onSelectSport,
  onSelectLeague,
  onToggleLeague,
  onSelectTeam,
}: ClubsStepProps) {
  const isFormulaOne = sport === "motorsport";
  const activeLeague = followableLeagueById(activeLeagueId) ?? leagues[0];
  const selectedTeamId = favoriteTeams[activeLeague.id];
  const followed = followedIds.includes(activeLeague.id);

  return (
    <StepShell
      title="CHOOSE CLUBS"
      subtitle={subtitleFor(isFormulaOne, followedIds.length)}
    >
      <SportPills selected={sport} onSelect={onSelectSport} />

      {/* Formula 1 has a single championship, so there is nothing to choose. */}
      {isFormulaOne ? null : (
        <div className="mt-3">
          <LeaguePills
            leagues={leagues}
            activeId={activeLeague.id}
            followedIds={followedIds}
            onSelect={onSelectLeague}
            onToggle={onToggleLeague}
          />
        </div>
      )}

      {activeLeague.teams.length === 0 ? (
        <p className="mt-6 text-sm leading-body text-muted">
          {activeLeague.name} fields individual athletes, so its line-up arrives
          with each tournament. Follow it now and pick a favourite later.
        </p>
      ) : (
        <div
          role="radiogroup"
          aria-label={`${activeLeague.name} clubs`}
          className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6"
        >
          {activeLeague.teams.map((team) => (
            <SelectableTile
              key={team.id}
              label={team.name}
              selected={team.id === selectedTeamId}
              onSelect={() => onSelectTeam(activeLeague, team.id)}
              dimmed={!followed}
              sealSize={20}
              className="aspect-[0.92] w-full"
            >
              <span className="flex size-full flex-col items-center justify-center gap-[7px] px-1.5 py-2">
                <TeamBadge team={team} size={40} />
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
    </StepShell>
  );
}
