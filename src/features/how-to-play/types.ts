import type { GlyphName, PaletteName } from "@statoz/design-system/games";

/**
 * The playable modes that carry a guide, in the order the hub lists them.
 *
 * The app keys its guides by enum index and warns that new modes must be
 * appended. A slug is a stabler key than a position, so each guide names
 * itself — and names itself the way the rest of the web already names that
 * game, which is what lets a lobby link straight to its own guide.
 */
export type HowToPlayMode =
  | "predict"
  | "pick"
  | "pitch-duel"
  | "penalty-shootout"
  | "penalty-cup"
  | "football-bingo"
  | "football-chess"
  | "hoop-duel"
  | "cricketer" | "yorker" | "stick-cricket" | "archery-test" | "longbow" | "rim-rush" | "hoop-legacy" | "penalty-shooters-2" | "football-shooting"
  | "tennis-bits" | "soccer-real" | "retro-innings" | "f1-racing";

/**
 * Which palette token drives a guide's edges, tiles and step numbers.
 *
 * The whole palette, not a hand-picked subset: the modes take accents, but the
 * bingo lives counter and the hoop-duel shot clock take danger.
 */
export type GuideAccent = PaletteName;

/** One cell of the three-up strip that opens a guide: the mode at a glance. */
export type GuideStat = {
  icon: GlyphName;
  label: string;
  sub: string;
  accent: GuideAccent;
};

/** One numbered move in HOW IT WORKS. */
export type GuideStep = {
  title: string;
  body: string;
};

/** One rule worth knowing that is not a step. */
export type GuideFact = {
  icon: GlyphName;
  label: string;
  body: string;
};

export type ModeGuide = {
  id: HowToPlayMode;
  /** Local arcade guides can launch their maintained game directly. */
  playHref?: string;
  /** Display name, on the hub card and as the guide's own title. */
  title: string;
  /** The hub card's one-line pitch. */
  tagline: string;
  /** The guide header's `// SUB LINE`. */
  subtitle: string;
  /** What the mode is for, in a sentence or two. */
  purpose: string;
  icon: GlyphName;
  accent: GuideAccent;
  stats: GuideStat[];
  steps: GuideStep[];
  facts: GuideFact[];
};
