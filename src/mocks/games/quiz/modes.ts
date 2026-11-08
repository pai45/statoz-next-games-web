import { accentVar, feedbackVar, type GlyphName } from "@statoz/design-system/games";
import type { Sport } from "@/domain/sports";

import { modeRewards, quizModes } from "@/features/games/quiz/constants";
import type { QuizMode } from "@/features/games/quiz/types";

/**
 * What separates the four modes: their name, their pitch, what a correct answer
 * pays, and the colour they carry.
 *
 * The accent climbs the skill ladder — lime, amber, danger — with violet
 * marking the global capstone, so a mode's difficulty is legible before you
 * read a word of it.
 */

export { modeRewards, quizModes };

export const modeLabels: Record<QuizMode, string> = {
  easy: "EASY",
  medium: "MEDIUM",
  hard: "HARD",
  global: "GLOBAL",
};

export function modeAccent(mode: QuizMode): string {
  switch (mode) {
    case "easy":
      return accentVar("lime");
    case "medium":
      return accentVar("orange");
    case "hard":
      return feedbackVar("danger");
    case "global":
      return accentVar("violet");
  }
}

const sportGlyphs: Record<Sport, GlyphName> = {
  football: "sports_soccer",
  cricket: "sports_cricket",
  basketball: "sports_basketball",
  tennis: "sports_tennis",
  motorsport: "sports_motorsports",
};

/**
 * Easy wears the sport's own glyph — it is the sport's basics — while the three
 * rungs above it keep the ladder's icons.
 */
export function modeGlyph(mode: QuizMode, sport: Sport): GlyphName {
  switch (mode) {
    case "easy":
      return sportGlyphs[sport];
    case "medium":
      return "emoji_events";
    case "hard":
      return "local_fire_department";
    case "global":
      return "public";
  }
}

/**
 * The one-line pitch on a mode tile. Written per sport so cricket, tennis,
 * basketball and motorsport never inherit football's wording.
 */
const blurbs: Record<QuizMode, Record<Sport, string> | string> = {
  easy: {
    football: "FOOTBALL BASICS",
    cricket: "CRICKET BASICS",
    tennis: "TENNIS BASICS",
    basketball: "BASKETBALL BASICS",
    motorsport: "MOTORSPORT BASICS",
  },
  medium: {
    football: "CLUBS & CUPS",
    cricket: "TEAMS & TOURNAMENTS",
    tennis: "SLAMS & TOURS",
    basketball: "TEAMS & TITLES",
    motorsport: "TEAMS & SERIES",
  },
  hard: "DEEP-CUT TRIVIA",
  global: {
    football: "WORLD FOOTBALL",
    cricket: "WORLD CRICKET",
    tennis: "WORLD TENNIS",
    basketball: "WORLD BASKETBALL",
    motorsport: "WORLD MOTORSPORT",
  },
};

export function modeBlurb(mode: QuizMode, sport: Sport): string {
  const entry = blurbs[mode];
  return typeof entry === "string" ? entry : entry[sport];
}
