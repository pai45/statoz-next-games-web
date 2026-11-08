/**
 * The XP tracks a player can earn on.
 *
 * One per mode, plus a meta track for everything that happens off the pitch.
 * The profile's level is the whole sum put through the same curve as any one
 * track, so a player who only ever plays one mode still levels up.
 *
 * The list carries every track the app plans to ship, not only the modes that
 * are playable today: a track with no XP simply does not appear in the mastery
 * strip, so an unbuilt mode costs nothing to name here and keeps the ids stable
 * for when it lands.
 */
export type ProgressTrack =
  | "pitchDuel"
  | "shootout"
  | "footballChess"
  | "quiz"
  | "bingo"
  | "guessPlayer"
  | "finalOver"
  | "hoopDuel"
  | "grandPrix"
  | "tennis"
  | "prediction"
  | "cardsMeta";

/** Stable display order, mirroring the Flutter enum. */
export const progressTracks: ProgressTrack[] = [
  "pitchDuel",
  "shootout",
  "footballChess",
  "quiz",
  "bingo",
  "guessPlayer",
  "finalOver",
  "hoopDuel",
  "grandPrix",
  "tennis",
  "prediction",
  "cardsMeta",
];

/** The label a mastery chip carries, where space is tight. */
export const trackShortLabels: Record<ProgressTrack, string> = {
  pitchDuel: "PITCH",
  shootout: "SHOOTOUT",
  footballChess: "CHESS",
  quiz: "QUIZ",
  bingo: "BINGO",
  guessPlayer: "GUESS",
  finalOver: "FINAL OVER",
  hoopDuel: "HOOP",
  grandPrix: "GP",
  tennis: "TENNIS",
  prediction: "PREDICT",
  cardsMeta: "CARDS",
};

/** The track's full name. */
export const trackDisplayLabels: Record<ProgressTrack, string> = {
  pitchDuel: "PITCH DUEL",
  shootout: "PENALTY SHOOTOUT",
  footballChess: "FOOTBALL CHESS",
  quiz: "QUIZ",
  bingo: "FOOTBALL BINGO",
  guessPlayer: "GUESS PLAYER",
  finalOver: "FINAL OVER",
  hoopDuel: "HOOP DUEL",
  grandPrix: "GRAND PRIX",
  tennis: "TENNIS RALLY",
  prediction: "PREDICTIONS",
  cardsMeta: "CARDS / META",
};

/** XP per track. Absent means none earned; a zero is never stored. */
export type TrackXp = Partial<Record<ProgressTrack, number>>;

/** Tracks carrying any XP, in display order. */
export function earnedTracks(xp: TrackXp): ProgressTrack[] {
  return progressTracks.filter((track) => (xp[track] ?? 0) > 0);
}

/** Every track's XP added together. */
export function totalTrackXp(xp: TrackXp): number {
  return progressTracks.reduce((sum, track) => sum + (xp[track] ?? 0), 0);
}
