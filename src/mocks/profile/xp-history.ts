import type {
  ProgressTrack,
  XpTransactionSource,
} from "@/domain/progression";

export type XpHistoryEventTemplate = {
  source: XpTransactionSource;
  title: string;
  details: string;
};

/**
 * Display records used when the cumulative web stores are imported into the XP
 * ledger. The amount is always supplied by the owning game store; this module
 * owns only the presentation copy, never game tuning.
 */
export const xpHistoryEventTemplates: Record<
  ProgressTrack,
  XpHistoryEventTemplate
> = {
  pitchDuel: {
    source: "match",
    title: "FOT DUEL PROGRESS",
    details: "Imported match XP",
  },
  shootout: {
    source: "shootout",
    title: "SHOOTOUT PROGRESS",
    details: "Imported shootout XP",
  },
  footballChess: {
    source: "footballChess",
    title: "FOOTBALL CHESS PROGRESS",
    details: "Imported tactical match XP",
  },
  quiz: {
    source: "quiz",
    title: "QUIZ PROGRESS",
    details: "Imported quiz XP",
  },
  bingo: {
    source: "bingo",
    title: "BINGO PROGRESS",
    details: "Imported bingo XP",
  },
  guessPlayer: {
    source: "guessPlayer",
    title: "GUESS PLAYER PROGRESS",
    details: "Imported daily-game XP",
  },
  finalOver: {
    source: "finalOver",
    title: "FINAL OVER PROGRESS",
    details: "Imported chase XP",
  },
  hoopDuel: {
    source: "basketball",
    title: "HOOP DUEL PROGRESS",
    details: "Imported game XP",
  },
  grandPrix: {
    source: "grandPrix",
    title: "GRAND PRIX PROGRESS",
    details: "Imported race XP",
  },
  tennis: {
    source: "tennis",
    title: "TENNIS RALLY PROGRESS",
    details: "Imported mastery XP",
  },
  prediction: {
    source: "prediction",
    title: "PREDICTION PROGRESS",
    details: "Imported prediction XP",
  },
  cardsMeta: {
    source: "pack",
    title: "COLLECTION PROGRESS",
    details: "Imported cards and rewards XP",
  },
};
