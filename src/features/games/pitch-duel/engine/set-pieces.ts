import type {
  CornerDefence,
  CornerDelivery,
  DefenderOption,
  FreeKickShot,
  FreeKickWall,
  KeeperDive,
  OneOnOneFinish,
  OneOnOneKeeper,
  PenaltyTarget,
  SetPieceKind,
  TakerOption,
} from "./types";

/**
 * Ballers' pick-one-of-N set pieces, with one change: both sides choose. The
 * taker picks a delivery, the defence picks the counter, and the tables below
 * decide what each pairing is worth.
 */

export type OptionDef<T extends string> = { id: T; label: string; hint: string };

export const takerOptions: { [K in SetPieceKind]: OptionDef<TakerOption>[] } = {
  penalty: [
    { id: "TL", label: "TOP LEFT", hint: "Hard to reach" },
    { id: "BL", label: "LOW LEFT", hint: "Safe corner" },
    { id: "C", label: "DOWN THE MIDDLE", hint: "Bold" },
    { id: "BR", label: "LOW RIGHT", hint: "Safe corner" },
    { id: "TR", label: "TOP RIGHT", hint: "Hard to reach" },
  ],
  freeKick: [
    { id: "over", label: "OVER THE WALL", hint: "Dip it in" },
    { id: "around", label: "AROUND THE WALL", hint: "Curl it" },
    { id: "low", label: "LOW DRIVE", hint: "Under the jump" },
    { id: "layoff", label: "LAY IT OFF", hint: "Keep the ball, +4" },
  ],
  corner: [
    { id: "near", label: "NEAR POST", hint: "Flick-on header" },
    { id: "far", label: "FAR POST", hint: "Big header" },
    { id: "short", label: "PLAY SHORT", hint: "Keep it, +5" },
  ],
  oneOnOne: [
    { id: "round", label: "ROUND HIM", hint: "Beats a waiting keeper" },
    { id: "chip", label: "CHIP", hint: "Beats a rushing keeper" },
    { id: "low", label: "PLACE IT LOW", hint: "Steady either way" },
  ],
};

export const defenderOptions: { [K in SetPieceKind]: OptionDef<DefenderOption>[] } = {
  penalty: [
    { id: "L", label: "DIVE LEFT", hint: "" },
    { id: "C", label: "STAY CENTRE", hint: "" },
    { id: "R", label: "DIVE RIGHT", hint: "" },
  ],
  freeKick: [
    { id: "jump", label: "WALL JUMPS", hint: "Stops over the wall" },
    { id: "cheat", label: "CHEAT FAR POST", hint: "Stops the curler" },
    { id: "stay", label: "WALL STAYS LOW", hint: "Stops the drive" },
  ],
  corner: [
    { id: "man", label: "MAN-MARK", hint: "Wins the near post" },
    { id: "zonal", label: "ZONAL", hint: "Wins the far post" },
    { id: "press", label: "PRESS SHORT", hint: "Stops the short one" },
  ],
  oneOnOne: [
    { id: "rush", label: "RUSH OUT", hint: "Smother it" },
    { id: "wait", label: "STAY BIG", hint: "Make him decide" },
  ],
};

export const setPieceTitles: Record<SetPieceKind, string> = {
  penalty: "PENALTY",
  freeKick: "FREE KICK",
  corner: "CORNER",
  oneOnOne: "ONE ON ONE",
};

export function isTakerOption(kind: SetPieceKind, option: string): option is TakerOption {
  return takerOptions[kind].some((o) => o.id === option);
}

export function isDefenderOption(kind: SetPieceKind, option: string): option is DefenderOption {
  return defenderOptions[kind].some((o) => o.id === option);
}

const penaltySide: Record<PenaltyTarget, KeeperDive> = { TL: "L", BL: "L", C: "C", BR: "R", TR: "R" };

/** Goal chance for a penalty before the stat adjustment. */
export function penaltyGoalChance(target: PenaltyTarget, dive: KeeperDive): number {
  const top = target === "TL" || target === "TR";
  const guessed = penaltySide[target] === dive;
  if (target === "C") return guessed ? 0.2 : 0.97;
  if (guessed) return top ? 0.6 : 0.3;
  return top ? 0.82 : 0.93;
}

const freeKickCounters: Record<Exclude<FreeKickShot, "layoff">, FreeKickWall> = { over: "jump", around: "cheat", low: "stay" };
const freeKickOdds: Record<Exclude<FreeKickShot, "layoff">, number> = { over: 0.26, around: 0.24, low: 0.18 };

export function freeKickGoalChance(shot: Exclude<FreeKickShot, "layoff">, wall: FreeKickWall): number {
  return freeKickCounters[shot] === wall ? 0.04 : freeKickOdds[shot];
}

const cornerCounters: Record<CornerDelivery, CornerDefence> = { near: "man", far: "zonal", short: "press" };

export function cornerCountered(delivery: CornerDelivery, defence: CornerDefence): boolean {
  return cornerCounters[delivery] === defence;
}

const oneOnOneTable: Record<OneOnOneFinish, Record<OneOnOneKeeper, number>> = {
  round: { rush: 0.35, wait: 0.85 },
  chip: { rush: 0.85, wait: 0.3 },
  low: { rush: 0.62, wait: 0.56 },
};

export function oneOnOneGoalChance(finish: OneOnOneFinish, keeper: OneOnOneKeeper): number {
  return oneOnOneTable[finish][keeper];
}
