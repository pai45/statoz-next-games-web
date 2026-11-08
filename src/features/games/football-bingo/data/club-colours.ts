import { accentVar } from "@statoz/design-system/games";

/**
 * Club brand colours for the grid's axis badges.
 *
 * These are data, not palette: a club's colour belongs to the club, and naming
 * Barcelona's claret as a design token would make it a decision the rest of the
 * product could reuse. The app carries the same nine in `_clubColors` on the
 * bingo screen, and everything else falls through to the accent it uses as a
 * default.
 */
const brandColours: Record<string, string> = {
  psg: "#0b1f5e",
  barca: "#9b1238",
  realmadrid: "#f5f0d7",
  manutd: "#d71920",
  mancity: "#74acde",
  chelsea: "#034694",
  bayern: "#dc052d",
  liverpool: "#c8102e",
  arsenal: "#ef0107",
};

/** The badge colour for a club, falling back to the neutral accent. */
export function clubAccent(clubId: string): string {
  return brandColours[clubId] ?? accentVar("cyan");
}
