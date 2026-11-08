import type { GlyphName } from "@statoz/design-system/games";
import type { CardTier } from "@/domain/cards";
import type { Sport } from "@/domain/sports";

/**
 * Everything the player chose about themselves, and the small settings that
 * belong to them rather than to any one mode.
 *
 * Flutter keeps these as eight separate keys in `SecureGameStorage`; on the web
 * they are one record, because a single parse is what the profile actually
 * wants and a partial write can never leave two keys disagreeing.
 */
export type ProfileIdentity = {
  /** The name chosen during first-run setup. */
  displayName: string;
  avatarId: string;
  bannerId: string;
  primarySport: Sport;
  followedLeagueIds: string[];
  /** League id to the club chosen inside it. */
  favoriteTeams: Record<string, string>;
  /**
   * The shareable `XXXX-XXXX` tag. Minted on first read in the browser and
   * never regenerated, so it can be handed to another player.
   */
  playerTag: string | null;
  /** IANA zone id, or `device` to follow the browser. Null until chosen. */
  timeZoneId: string | null;
  featuredGameId?: string | null;
  equippedTitleAchievementId?: string | null;
  /** Undefined uses the earned-trophy preview; an empty list is deliberately empty. */
  pinnedAchievementIds?: string[];
};

/** A career line derived from every mode this browser has played. */
export type CareerRecord = {
  played: number;
  won: number;
  /** Whole percent, 0–100. */
  winRate: number;
  /** Best win streak reached in any single mode. */
  bestStreak: number;
  /** Win streak currently running in any mode. */
  currentStreak: number;
};

/**
 * A snapshot of every value the achievement catalog measures, built once from
 * the stores the modes write to. Plain data, so the catalog stays pure.
 *
 * Fields whose feature has not shipped yet read zero, which is exactly what a
 * player who has not done that thing sees.
 */
export type AchievementStats = {
  level: number;
  totalXp: number;
  matchesPlayed: number;
  matchWins: number;
  bestMatchStreak: number;
  cleanSheets: number;
  shootoutWins: number;
  basketballWins: number;
  tennisAchievements: string[];
  predictionsMade: number;
  correctPredictions: number;
  picksPlaced: number;
  picksWon: number;
  pickStreak: number;
  pickProfit: number;
  ownedCards: number;
  platinumOwned: number;
  coins: number;
};

export type AchievementCategory =
  | "matches"
  | "progression"
  | "predictions"
  | "picks"
  | "collection";

/**
 * The three groups the showcase files badges under. Categories fold into them:
 * predictions and picks keep their own, and everything about the card game
 * itself — matches, progression, collection — is one "GAMES" group.
 */
export type AchievementGroup = "prediction" | "picks" | "games";

/**
 * One earnable badge. Unlock state and progress are derived live from
 * [AchievementStats] through `measure`; there is no stored unlocked flag.
 */
export type Achievement = {
  id: string;
  title: string;
  description: string;
  /** The glyph the badge plate shows, named as the registry knows it. */
  icon: GlyphName;
  /** Drives the plate colour, bronze through platinum, grading difficulty. */
  tier: CardTier;
  category: AchievementCategory;
  target: number;
  measure: (stats: AchievementStats) => number;
};

/**
 * One cell of a telemetry band. `value` counts up on first paint; `text` is a
 * static string for anything that is not a number.
 */
export type ProfileStat = {
  label: string;
  value?: number;
  text?: string;
  /** Appended to a counted value, e.g. `%`. */
  suffix?: string;
};

export type TimeZoneOption = {
  /** IANA zone id. */
  id: string;
  label: string;
  /** Pre-formatted standard offset, e.g. `UTC+05:30`. */
  utcOffset: string;
};
