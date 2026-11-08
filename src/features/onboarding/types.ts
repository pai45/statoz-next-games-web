import type { Sport } from "@/domain/sports";

export type AvatarOption = {
  id: string;
  label: string;
  /** Portrait served from `public/assets/avatars`. */
  src: string;
};

export type ProfileBannerOption = {
  id: string;
  label: string;
  /**
   * The flag colors the banner is built from, darkest first. Brand data rather
   * than palette, so it lives here instead of in the design system.
   */
  colors: [string, string, string];
  /** The hairline that rakes across the banner art. */
  accent: string;
  /**
   * Finished banner artwork, when the project ships it. While null the banner
   * is drawn procedurally from `colors` and `accent`.
   */
  src?: string;
};

export type FollowableTeam = {
  id: string;
  name: string;
  shortName: string;
  /** The club's own brand color — data, not a design-system accent. */
  color: string;
};

export type FollowableLeague = {
  sport: Sport;
  id: string;
  name: string;
  shortCode: string;
  teams: FollowableTeam[];
};

/** Everything the player chose, handed over in one piece when setup ends. */
export type ProfileSetupResult = {
  displayName: string;
  avatarId: string;
  bannerId: string;
  primarySport: Sport;
  followedLeagueIds: string[];
  /** League id to the club they picked inside it. */
  favoriteTeams: Record<string, string>;
};

export type SetupStepId = "name" | "avatar" | "banner" | "clubs";
