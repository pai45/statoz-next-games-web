import type { PlayerCard } from "@/domain/cards";
import { footballPlayerCards } from "@/mocks/packs/football-cards";
import { academyCards, academyIds } from "@/mocks/packs/pitch-duel-academy";
import { fictionalCards } from "@/mocks/packs/pitch-duel-fictional";

import type { DebutSquad } from "../engine/debut";
import { defaultFormation, fillFormation, isFormationId, maxTactics, outfieldSize, type ClubSetup } from "../engine/lineup";
import { divisionFor } from "../engine/setup";

/**
 * Pitch Duel's saved career, v4 (eleven a side). Pure — no React, no window —
 * so migration and settlement are testable in Node. The store in
 * `progress.ts` wraps it. v3 saves load through the same sanitizer, which
 * moves a five-a-side club onto a 4-4-2.
 */

export const careerKey = "statoz.next.games-web.pitch-duel.v4";
export const v3CareerKey = "statoz.next.games-web.pitch-duel.v3";
export const legacyCareerKey = "statoz.next.games-web.pitch-duel.reboot.v2";
export const historyLimit = 30;

export type MatchResult = {
  id: string;
  at: string;
  playedAt: string;
  opponent: string;
  opponentName: string;
  home: number;
  away: number;
  playerScore: number;
  opponentScore: number;
  result: "Victory" | "Draw" | "Defeat";
  points: number;
  division: number;
  decisions: number;
  mvp?: { id: string; name: string; rating: number; side: "home" | "away" };
  scorers?: { side: "home" | "away"; name: string; minute: string }[];
};

export type Career = {
  version: 4;
  club: ClubSetup | null;
  points: number;
  xp: number;
  wins: number;
  draws: number;
  losses: number;
  played: number;
  goalsFor: number;
  goalsAgainst: number;
  currentStreak: number;
  bestStreak: number;
  tutorialSeen: boolean;
  history: MatchResult[];
  rewardedDivisions: number[];
  settings: { haptics: boolean; sound: boolean };
  migratedFrom?: 2 | 3;
  /**
   * The debut XI a first-time player signs in the opening reveal. It is drawn
   * and saved before the reveal plays, so a reload shows the same eleven, and
   * `claimed` turns true once the cards are granted.
   */
  debut?: DebutSquad & { claimed: boolean };
};

/**
 * A first-time player: nothing played, nothing migrated, no debut claimed.
 * Existing careers never see the debut reveal.
 */
export function needsDebut(career: Career): boolean {
  return career.played === 0 && !career.migratedFrom && !career.debut?.claimed;
}

export const emptyCareer: Career = {
  version: 4,
  club: null,
  points: 0,
  xp: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  played: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  currentStreak: 0,
  bestStreak: 0,
  tutorialSeen: false,
  history: [],
  rewardedDivisions: [],
  settings: { haptics: true, sound: true },
};

const count = (value: unknown) => Math.max(0, Math.floor(Number(value) || 0));
const strings = (value: unknown) => (Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []);

const knownCards = new Map<string, PlayerCard>([...footballPlayerCards, ...fictionalCards, ...academyCards].map((c) => [c.id, c]));
const knownCard = (id: string) => knownCards.get(id);

/**
 * A saved club, made safe. A five-a-side club (v3 shapes, or fewer than ten
 * outfield ids) keeps its keeper and players, re-seated in a 4-4-2 by
 * position, with academy players in the places left over.
 */
function sanitizeClub(value: unknown): ClubSetup | null {
  if (!value || typeof value !== "object") return null;
  const c = value as Partial<ClubSetup>;
  if (typeof c.keeperId !== "string") return null;
  const tactics = strings(c.tactics).slice(0, maxTactics);
  const outfield = strings(c.outfield);
  if (isFormationId(c.formation) && outfield.length === outfieldSize) {
    return { formation: c.formation, keeperId: c.keeperId, outfield, tactics };
  }
  const placed = fillFormation(defaultFormation, outfield.slice(0, outfieldSize), knownCard);
  const filled = fillFormation(defaultFormation, academyIds, knownCard, placed);
  return { formation: defaultFormation, keeperId: c.keeperId, outfield: filled.map((id) => id ?? ""), tactics };
}

function sanitizeResult(value: unknown): MatchResult | null {
  if (!value || typeof value !== "object") return null;
  const r = value as Partial<MatchResult> & { decisions?: unknown };
  if (typeof r.id !== "string") return null;
  const playerScore = count(r.playerScore ?? r.home);
  const opponentScore = count(r.opponentScore ?? r.away);
  const at = typeof r.playedAt === "string" ? r.playedAt : typeof r.at === "string" ? r.at : new Date(0).toISOString();
  const name = typeof r.opponentName === "string" ? r.opponentName : typeof r.opponent === "string" ? r.opponent : "Opponent";
  const result = r.result === "Victory" || r.result === "Draw" || r.result === "Defeat"
    ? r.result
    : playerScore > opponentScore ? "Victory" : playerScore === opponentScore ? "Draw" : "Defeat";
  return {
    ...(r.mvp ? { mvp: r.mvp } : {}),
    ...(Array.isArray(r.scorers) ? { scorers: r.scorers } : {}),
    id: r.id,
    at,
    playedAt: at,
    opponent: name,
    opponentName: name,
    home: playerScore,
    away: opponentScore,
    playerScore,
    opponentScore,
    result,
    points: count(r.points),
    division: Math.min(5, Math.max(1, count(r.division) || 1)),
    // v2 stored its six decisions as an array; v3 stores a count.
    decisions: Array.isArray(r.decisions) ? r.decisions.length : count(r.decisions),
  };
}

export function sanitizeCareer(value: unknown): Career {
  if (!value || typeof value !== "object") return emptyCareer;
  const c = value as Partial<Career>;
  const history = (Array.isArray(c.history) ? c.history : []).map(sanitizeResult).filter((r): r is MatchResult => r !== null).slice(0, historyLimit);
  const debut = sanitizeDebut(c.debut);
  return {
    version: 4,
    club: sanitizeClub(c.club),
    points: count(c.points),
    xp: count(c.xp),
    wins: count(c.wins),
    draws: count(c.draws),
    losses: count(c.losses),
    played: count(c.played),
    goalsFor: count(c.goalsFor),
    goalsAgainst: count(c.goalsAgainst),
    currentStreak: count(c.currentStreak),
    bestStreak: count(c.bestStreak),
    tutorialSeen: c.tutorialSeen === true,
    history,
    rewardedDivisions: (Array.isArray(c.rewardedDivisions) ? c.rewardedDivisions : []).map(count).filter((d) => d >= 2 && d <= 5),
    settings: { haptics: c.settings?.haptics !== false, sound: c.settings?.sound !== false },
    ...(c.migratedFrom === 2 || c.migratedFrom === 3 ? { migratedFrom: c.migratedFrom } : {}),
    ...(debut ? { debut } : {}),
  };
}

/** A saved debut XI, kept only if every id is a known card in a real shape. */
function sanitizeDebut(value: unknown): Career["debut"] | null {
  if (!value || typeof value !== "object") return null;
  const d = value as Partial<NonNullable<Career["debut"]>>;
  const outfield = strings(d.outfield);
  if (!isFormationId(d.formation) || typeof d.keeperId !== "string" || typeof d.marqueeId !== "string" || outfield.length !== outfieldSize) return null;
  const ids = [d.keeperId, ...outfield];
  if (!ids.every((id) => knownCard(id)) || !ids.includes(d.marqueeId)) return null;
  return { formation: d.formation, keeperId: d.keeperId, outfield, marqueeId: d.marqueeId, claimed: d.claimed === true };
}

type LegacyDeck = { attackers?: unknown; defenders?: unknown; keeper?: unknown; tactics?: unknown };

/**
 * v2 → v4: every counter and the history carry over (the streak calendar reads
 * the history), the v2 deck seeds the club, and the rules tutorial shows once
 * more because the game changed.
 */
export function migrateV2(raw: string | null): Career {
  if (!raw) return emptyCareer;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return emptyCareer;
  }
  if (!parsed || typeof parsed !== "object") return emptyCareer;

  const base = sanitizeCareer({ ...parsed, club: null, tutorialSeen: false, settings: undefined });
  const draws = base.history.filter((r) => r.result === "Draw").length;
  const losses = Math.max(0, base.played - base.wins - draws);
  const goalsFor = base.history.reduce((sum, r) => sum + r.playerScore, 0);
  const goalsAgainst = base.history.reduce((sum, r) => sum + r.opponentScore, 0);

  let club: ClubSetup | null = null;
  const deck = parsed.deck as LegacyDeck | null | undefined;
  if (deck && typeof deck.keeper === "string" && deck.keeper) {
    const outfield = [...strings(deck.defenders).slice(0, 2), ...strings(deck.attackers).slice(0, 2)];
    if (outfield.length === 4) club = sanitizeClub({ formation: "2-2", keeperId: deck.keeper, outfield, tactics: strings(deck.tactics) });
  }

  return { ...base, club, draws, losses, goalsFor, goalsAgainst, tutorialSeen: false, migratedFrom: 2 };
}

/**
 * v3 → v4: everything carries over; the five-a-side club is re-seated in a
 * 4-4-2 (see `sanitizeClub`) and the guide shows once for the new rules.
 */
export function migrateV3(raw: string | null): Career | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return null;
    return { ...sanitizeCareer(parsed), tutorialSeen: false, migratedFrom: 3 };
  } catch {
    return null;
  }
}

export type Settlement = { career: Career; result: MatchResult; promoted: number | null; earned: number; duplicate: boolean };

/** Folds one finished match into the career. Idempotent by match id. */
export function applyResult(career: Career, result: Omit<MatchResult, "points" | "result" | "home" | "away" | "opponent" | "at">): Settlement {
  const existing = career.history.find((r) => r.id === result.id);
  if (existing) return { career, result: existing, promoted: null, earned: existing.points, duplicate: true };

  const win = result.playerScore > result.opponentScore;
  const draw = result.playerScore === result.opponentScore;
  const earned = win ? 3 : draw ? 1 : 0;
  const points = career.points + earned;
  const division = divisionFor(points);
  const promoted = division > divisionFor(career.points) && !career.rewardedDivisions.includes(division) ? division : null;
  const streak = win ? career.currentStreak + 1 : 0;
  const full: MatchResult = {
    ...result,
    at: result.playedAt,
    opponent: result.opponentName,
    home: result.playerScore,
    away: result.opponentScore,
    result: win ? "Victory" : draw ? "Draw" : "Defeat",
    points: earned,
  };

  return {
    career: {
      ...career,
      points,
      xp: career.xp + earned * 40,
      wins: career.wins + Number(win),
      draws: career.draws + Number(draw),
      losses: career.losses + Number(!win && !draw),
      played: career.played + 1,
      goalsFor: career.goalsFor + result.playerScore,
      goalsAgainst: career.goalsAgainst + result.opponentScore,
      currentStreak: streak,
      bestStreak: Math.max(career.bestStreak, streak),
      history: [full, ...career.history].slice(0, historyLimit),
      rewardedDivisions: promoted ? [...career.rewardedDivisions, promoted] : career.rewardedDivisions,
    },
    result: full,
    promoted,
    earned,
    duplicate: false,
  };
}

/** Coins per result, unchanged from v2. */
export function coinsFor(result: MatchResult["result"]): number {
  return result === "Victory" ? 120 : result === "Draw" ? 75 : 45;
}
