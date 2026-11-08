/**
 * Content colours for Final Over's athletes — the web port of the app's
 * `data/final_over_kits.dart`.
 *
 * Two independent sources:
 *   • a kit is *clothing* — shirt, pads, helmet, number. The player picks one
 *     in the lobby; the bowling side gets a contrasting one.
 *   • a look is *the person* — skin and hair. Never a team colour.
 *
 * These are the one place in the module that carries raw hex, and deliberately
 * so: a kit is data the way a team's brand colour is data, not a palette
 * decision. Everything else on screen — pitch, HUD, stumps — comes from
 * design-system tokens.
 *
 * The Flutter app sells seven of these for 100 coins each. The web has no coin
 * system, so all eight are free selections here.
 */

export type FinalOverKit = {
  id: string;
  name: string;
  /** Shirt, helmet dome, shoulder bar. Trousers are this, darkened. */
  primary: string;
  /** Shirt trim, pads, gloves, sleeve. */
  secondary: string;
  /** Jersey number, boots, the second shirt stripe. */
  accent: string;
};

export const finalOverKits: readonly FinalOverKit[] = [
  { id: "voltage", name: "VOLTAGE", primary: "#1b48d6", secondary: "#eff3ff", accent: "#35e0ff" },
  { id: "ember", name: "EMBER", primary: "#d83a1e", secondary: "#2a1410", accent: "#ffb53d" },
  { id: "meridian", name: "MERIDIAN", primary: "#0e8a5f", secondary: "#f2fff9", accent: "#b4ff3d" },
  { id: "sovereign", name: "SOVEREIGN", primary: "#6a2bd9", secondary: "#e9ddff", accent: "#ffd24a" },
  { id: "monsoon", name: "MONSOON", primary: "#1f7fa8", secondary: "#0b2c3b", accent: "#7fe9ff" },
  { id: "saffron", name: "SAFFRON", primary: "#e87722", secondary: "#14243d", accent: "#fff0c2" },
  { id: "obsidian", name: "OBSIDIAN", primary: "#37415c", secondary: "#9aa8c7", accent: "#ff3d77" },
  { id: "coral", name: "CORAL", primary: "#e0407a", secondary: "#ffe3ec", accent: "#20e3b2" },
];

/** The kit a player starts in. */
export const defaultKitId = "voltage";

export function kitById(id: string): FinalOverKit {
  return finalOverKits.find((kit) => kit.id === id) ?? finalOverKits[0];
}

/**
 * The bowling side always wears something other than the batter's kit, so the
 * two never read as one team.
 */
export function opponentKit(playerKitId: string): FinalOverKit {
  const index = finalOverKits.findIndex((kit) => kit.id === playerKitId);
  const safe = index < 0 ? 0 : index;
  return finalOverKits[(safe + 3) % finalOverKits.length];
}

/** Skin and hair — the person under the kit. */
export type FinalOverLook = { skin: string; hair: string };

const looks: readonly FinalOverLook[] = [
  { skin: "#6b4423", hair: "#17110d" },
  { skin: "#8d5524", hair: "#1c1310" },
  { skin: "#c68642", hair: "#2b1d14" },
  { skin: "#e0ac69", hair: "#4a2f1b" },
  { skin: "#f1c27d", hair: "#6b4a2a" },
];

/**
 * A hand-rolled hash, because Dart's `String.hashCode` is not stable across
 * versions and JavaScript has none at all. Keeping the exact arithmetic means a
 * given player draws the same face here as in the Flutter app.
 */
function stableHash(id: string): number {
  let accumulator = 0;
  for (let index = 0; index < id.length; index += 1) {
    accumulator = (accumulator * 31 + id.charCodeAt(index)) & 0x7fffffff;
  }
  return accumulator;
}

export function lookFor(actorId: string): FinalOverLook {
  return looks[stableHash(actorId) % looks.length];
}

/** Shirt number for an actor, 0–99. */
export function shirtNumberFor(actorId: string): number {
  return stableHash(actorId) % 100;
}
