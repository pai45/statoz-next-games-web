import type { SportTeam } from "./matches";

/** Canonical profile seeds, shared with friends and profile dossiers. */
export type RivalSeed = {
  name: string;
  base: number;
  movement: number;
  isNew?: boolean;
  badge?: string;
};

export type TeamSeed = {
  team: SportTeam;
  score: number;
  movement: number;
  isBacked?: boolean;
};

export type LeaderboardParticipant = {
  id: string;
  name: string;
  xp: number;
  badge?: string;
  isUser?: boolean;
  avatarSrc?: string;
  frameColor?: string;
};

/** Zero points means no sample ranked result for this game and period. */
export type LeaderboardGameResult = { gameId: string; rp: number };
