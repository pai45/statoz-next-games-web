import type { GlyphName, PaletteName } from "@statoz/design-system/games";

/**
 * The five channels of the direct line, in the order the hub lists them. The
 * index is the channel number a card shows, so appending is safe and reordering
 * is not.
 *
 * Copy is the app's, verbatim: these lines set the tone a player answers in.
 */

export type SupportChannelId =
  | "bug"
  | "feature"
  | "mismatch"
  | "shoutout";

export type SupportChannel = {
  id: SupportChannelId;
  title: string;
  /** The hub card's one-line description. */
  tagline: string;
  /** The compose header's `// SUB LINE`. */
  composeSubtitle: string;
  /** What to write, said once at the top of the form. */
  composeHint: string;
  summaryHint: string;
  detailsHint: string;
  icon: GlyphName;
  accent: PaletteName;
};

export const supportChannels: SupportChannel[] = [
  {
    id: "bug",
    title: "Bug",
    tagline: "Something broke, crashed, or refused to load.",
    composeSubtitle: "// CHANNEL 01 · DEFECT SIGNAL",
    composeHint:
      "Tell us what you tapped, what you expected, and what actually happened.",
    summaryHint: "Short summary of the bug",
    detailsHint: "Steps to reproduce, screens, match IDs…",
    icon: "bug_report",
    accent: "danger",
  },
  {
    id: "feature",
    title: "Feature Request",
    tagline: "A mode, tool, or unlock you want on the pitch.",
    composeSubtitle: "// CHANNEL 02 · NEW BUILD",
    composeHint: "Pitch the feature. What would it unlock for you?",
    summaryHint: "Name the feature",
    detailsHint: "How should it work? Why does it matter?",
    icon: "auto_awesome",
    accent: "cyan",
  },
  {
    id: "mismatch",
    title: "Score / Data Mismatch",
    tagline: "Wrong score, odds, lineup, or live feed drift.",
    composeSubtitle: "// CHANNEL 03 · DATA SYNC",
    composeHint: "Flag the fixture, market, or stat that doesn't match reality.",
    summaryHint: "Match / market that looks wrong",
    detailsHint: "What did you see vs what should it be?",
    icon: "sync_alt",
    accent: "orange",
  },
  {
    id: "shoutout",
    title: "Shoutout",
    tagline: "Love a moment, mode, or beat? Send it up.",
    composeSubtitle: "// CHANNEL 04 · FAN SIGNAL",
    composeHint: "Tell us what slapped. We live for these.",
    summaryHint: "What made you cheer?",
    detailsHint: "Share the moment — mode, card, streak, vibe…",
    icon: "favorite",
    accent: "gold",
  },
];

/** The channel a slug names, or `undefined` when it names none. */
export function supportChannelFor(id: string): SupportChannel | undefined {
  return supportChannels.find((channel) => channel.id === id);
}

/** The two-digit number a channel wears on its card and in its subtitle. */
export function channelNumber(channel: SupportChannel): string {
  return String(supportChannels.indexOf(channel) + 1).padStart(2, "0");
}
