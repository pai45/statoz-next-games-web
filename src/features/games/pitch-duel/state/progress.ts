"use client";

import { useSyncExternalStore } from "react";

import { grantCards, settleCoinReward } from "@/features/economy";
import { promotionCard } from "@/mocks/packs/pitch-duel-fictional";
import { recordStreakActivity } from "@/features/streaks/activity";

import type { DebutSquad } from "../engine/debut";
import type { ClubSetup } from "../engine/lineup";
import { minuteLabel, mvp } from "../engine/match";
import { divisions } from "../engine/setup";
import type { MatchState } from "../engine/types";
import {
  applyResult,
  careerKey,
  coinsFor,
  emptyCareer,
  legacyCareerKey,
  migrateV2,
  migrateV3,
  sanitizeCareer,
  v3CareerKey,
  type Career,
  type MatchResult,
} from "./career-schema";

export type { Career, MatchResult } from "./career-schema";

/**
 * Browser-local store for the v4 career. A v3 or v2 save is migrated in
 * memory on read (nothing is written during render) and persisted by
 * `ensureMigrated` from an effect, or by the next write. Older keys are never
 * deleted.
 */

const listeners = new Set<() => void>();
let lastRaw: string | null = null;
let snapshot: Career = emptyCareer;

function rawPair(): string | null {
  try {
    return [careerKey, v3CareerKey, legacyCareerKey].map((key) => localStorage.getItem(key) ?? "").join("\u0000");
  } catch {
    return null;
  }
}

function read(): Career {
  if (typeof window === "undefined") return emptyCareer;
  const raw = rawPair();
  if (raw === null) return snapshot;
  if (raw === lastRaw) return snapshot;
  lastRaw = raw;
  const [current, v3, legacy] = raw.split("\u0000");
  try {
    snapshot = current ? sanitizeCareer(JSON.parse(current)) : (migrateV3(v3 || null) ?? migrateV2(legacy || null));
  } catch {
    snapshot = emptyCareer;
  }
  return snapshot;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key === careerKey || e.key === v3CareerKey || e.key === legacyCareerKey || e.key === null) {
      lastRaw = null;
      fn();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

function write(next: Career) {
  const value = sanitizeCareer(next);
  try {
    localStorage.setItem(careerKey, JSON.stringify(value));
    lastRaw = null;
  } catch {
    snapshot = value;
  }
  for (const fn of listeners) fn();
}

export function usePitchDuelCareer(): Career {
  return useSyncExternalStore(subscribe, read, () => emptyCareer);
}

export function readPitchDuelCareer(): Career {
  return read();
}

/** Persists a migrated v3 or v2 career the first time v4 opens. Safe to call repeatedly. */
export function ensureMigrated(): void {
  try {
    if (localStorage.getItem(careerKey) || (!localStorage.getItem(v3CareerKey) && !localStorage.getItem(legacyCareerKey))) return;
  } catch {
    return;
  }
  write(read());
}

export function saveClub(club: ClubSetup) {
  write({ ...read(), club });
}

export function markTutorialSeen() {
  write({ ...read(), tutorialSeen: true });
}

export function setHaptics(haptics: boolean) {
  const current = read();
  write({ ...current, settings: { ...current.settings, haptics } });
}

export function setSound(sound: boolean) {
  const current = read();
  write({ ...current, settings: { ...current.settings, sound } });
}

/** The economy grant id for the debut XI: one per account, ever. */
export const debutGrantId = "pitch-duel-debut-xi";

/** Saves a freshly drawn debut XI before its reveal plays. An existing draw is kept. */
export function saveDebutDraw(squad: DebutSquad): void {
  const current = read();
  if (current.debut) return;
  write({ ...current, debut: { ...squad, claimed: false } });
}

/** Signs the debut XI: grants the eleven cards once and makes them the club. Call from a handler. */
export function claimDebut(tactics: string[]): void {
  const current = read();
  const debut = current.debut;
  if (!debut || debut.claimed) return;
  grantCards({ id: debutGrantId, playerCardIds: [debut.keeperId, ...debut.outfield], title: "PITCH DUEL DEBUT XI" });
  write({
    ...current,
    debut: { ...debut, claimed: true },
    club: { formation: debut.formation, keeperId: debut.keeperId, outfield: debut.outfield, tactics },
  });
}

export type MatchSettlement = { result: MatchResult; promoted: number | null; coins: number; prize: { id: string; name: string } | null };

/**
 * Banks a finished match: league points, XP, streak, coins and any promotion
 * card. Idempotent by match id; call from an event handler, never in render.
 */
export function settleMatch(state: MatchState): MatchSettlement {
  if (state.phase !== "fulltime") throw new Error("Match unfinished");
  const best = mvp(state);
  const bestCard = state.teams[best.side].cards[best.id];
  const playedAt = new Date().toISOString();
  const scorers = state.log
    .filter((e) => e.kind === "goal")
    .map((e) => ({ side: e.side, name: state.teams[e.side].cards[e.playerIds[0]]?.shortName ?? "", minute: e.minute }));

  const settlement = applyResult(read(), {
    id: state.id,
    playedAt,
    opponentName: state.opponentName,
    playerScore: state.score.home,
    opponentScore: state.score.away,
    division: state.division,
    decisions: state.decisions,
    mvp: { id: best.id, name: bestCard?.shortName ?? "", rating: best.rating, side: best.side },
    scorers,
  });
  const coins = coinsFor(settlement.result.result);
  if (settlement.duplicate) return { result: settlement.result, promoted: null, coins, prize: null };

  write(settlement.career);
  recordStreakActivity("pitchDuel", new Date(playedAt));
  settleCoinReward({
    id: `pitch-duel-v3-${state.id}`,
    coins,
    title: "PITCH DUEL MATCH",
    subtitle: `${state.score.home}-${state.score.away} vs ${state.opponentName} · ${minuteLabel(state)}`,
  });

  let prize: MatchSettlement["prize"] = null;
  if (settlement.promoted) {
    const card = promotionCard(settlement.promoted);
    if (card) {
      // Same grant id as v2, so a promotion already paid there is not paid twice.
      grantCards({ id: `pitch-duel-promotion-${settlement.promoted}`, playerCardIds: [card.id], title: `${divisions[settlement.promoted - 1]} REWARD` });
      prize = { id: card.id, name: card.name };
    }
  }
  return { result: settlement.result, promoted: settlement.promoted, coins, prize };
}
