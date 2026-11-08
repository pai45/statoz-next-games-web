import type { Sport } from "@/domain/sports";

/** A club or competitor available from the onboarding follow picker. */
export type FollowableTeam = {
  id: string;
  name: string;
  shortName: string;
  color: string;
};

/** A competition and the teams a player can follow within it. */
export type FollowableLeague = {
  sport: Sport;
  id: string;
  name: string;
  shortCode: string;
  teams: FollowableTeam[];
};
