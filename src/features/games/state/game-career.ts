"use client";

import { useMemo } from "react";

import { isTrackEnabled } from "@/domain/demo-product";
import type { TrackXp } from "@/domain/progression";

import { useHoopDuelStats } from "../basketball/state/hoop-duel-progress";
import { useQuizStats } from "../quiz/state/quiz-progress";
import { useFinalOverStats } from "../final-over/state/final-over-progress";
import { useGrandPrixStats } from "../grand-prix/state/grand-prix-progress";
import { useGuessPlayerStats } from "../guess-player/state/guess-player-store";
import { useShootoutProgress } from "../penalty-shootout/state/shootout-progress";
import { usePitchDuelCareer as usePitchDuelProgress } from "../pitch-duel/state/progress";
import type { Career as PitchDuelProgress } from "../pitch-duel/state/progress";
import { useTennisProgress } from "../tennis/state/tennis-progress";

/**
 * What every playable mode adds up to.
 *
 * Each game keeps its own browser-local store and its own public API deliberately
 * narrow, so nothing outside a game can reach its engine. The profile still has
 * to know how much has been played, which is what this is: one read-only summary
 * that this feature — the owner of all four stores — assembles and publishes.
 *
 * The Flutter app has no equivalent because it keeps everything in one global
 * game bloc; the summary is the boundary the web needs in its place.
 */
export type GameCareer = {
  /** XP per mode, ready to fold into the profile's tracks. */
  xpByTrack: TrackXp;
  /** Matches finished across every mode. */
  played: number;
  won: number;
  /** Whole percent, 0–100. */
  winRate: number;
  /** The best streak reached in any single mode. */
  bestStreak: number;
  /** The longest streak currently running in any mode. */
  currentStreak: number;
  shootoutWins: number;
  basketballWins: number;
  /** Pitch Duel's complete read-only record, including capped match results. */
  pitchDuel: PitchDuelProgress;
  /** Ids of the tennis feats earned, as the badge catalogue names them. */
  tennisAchievements: string[];
  /** How many of the five sports have a mode with a match on the board. */
  modesPlayed: number;
};

function percent(won: number, played: number): number {
  return played === 0 ? 0 : Math.round((won / played) * 100);
}

/**
 * Live career totals, recomputed only when one of the four stores changes.
 *
 * Tennis is the one mode that does not persist its match XP — it keeps
 * per-athlete mastery instead — so its track carries the mastery it has banked.
 * That is the XP tennis actually holds on to, and it moves for the same reasons
 * match XP would.
 */
export function useGameCareer(): GameCareer {
  const finalOver = useFinalOverStats();
  const hoopDuel = useHoopDuelStats();
  const shootout = useShootoutProgress();
  const pitchDuel = usePitchDuelProgress();
  const tennis = useTennisProgress();
  const quiz = useQuizStats();
  const guessPlayer = useGuessPlayerStats();
  const grandPrix = useGrandPrixStats();

  return useMemo(() => {
    const tennisXp = Object.values(tennis.masteryXp).reduce(
      (sum, xp) => sum + xp,
      0,
    );

    const xpByTrack: TrackXp = {};
    if (finalOver.xp > 0) xpByTrack.finalOver = finalOver.xp;
    if (hoopDuel.xp > 0) xpByTrack.hoopDuel = hoopDuel.xp;
    if (shootout.xp > 0) xpByTrack.shootout = shootout.xp;
    if (pitchDuel.xp > 0) xpByTrack.pitchDuel = pitchDuel.xp;
    if (tennisXp > 0) xpByTrack.tennis = tennisXp;
    if (quiz.xp > 0) xpByTrack.quiz = quiz.xp;
    if (guessPlayer.xp > 0) xpByTrack.guessPlayer = guessPlayer.xp;
    if (grandPrix.xp > 0) xpByTrack.grandPrix = grandPrix.xp;

    for (const track of Object.keys(xpByTrack)) if (!isTrackEnabled(track)) delete xpByTrack[track as keyof TrackXp];
    const played =
      finalOver.chases +
      hoopDuel.games +
      shootout.played +
      pitchDuel.played +
      tennis.setsPlayed +
      grandPrix.races;
    const won =
      finalOver.wins +
      hoopDuel.wins +
      shootout.wins +
      pitchDuel.wins +
      tennis.setsWon +
      grandPrix.wins;

    const modesPlayed = [
      finalOver.chases,
      hoopDuel.games,
      shootout.played,
      pitchDuel.played,
      tennis.setsPlayed,
      grandPrix.races,
    ].filter((count) => count > 0).length;

    return {
      xpByTrack,
      played,
      won,
      winRate: percent(won, played),
      bestStreak: Math.max(
        hoopDuel.bestStreak,
        pitchDuel.bestStreak,
        tennis.bestWinStreak,
        guessPlayer.bestStreak,
        grandPrix.bestStreak,
      ),
      currentStreak: Math.max(
        hoopDuel.currentStreak,
        pitchDuel.currentStreak,
        tennis.currentWinStreak,
        grandPrix.currentStreak,
      ),
      shootoutWins: shootout.wins,
      basketballWins: hoopDuel.wins,
      pitchDuel,
      tennisAchievements: tennis.achievements,
      modesPlayed,
    };
  }, [finalOver, hoopDuel, shootout, pitchDuel, tennis, quiz, guessPlayer, grandPrix]);
}
