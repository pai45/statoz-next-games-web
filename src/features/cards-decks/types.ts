import type { Sport } from "@/domain/sports";

export type FootballLoadout = {
  sport: "football";
  attackers: string[];
  defenders: string[];
  keeperId: string | null;
  actionCardIds: string[];
};

export type CricketLoadout = {
  sport: "cricket";
  batterIds: string[];
};

export type BasketballLoadout = {
  sport: "basketball";
  playerIds: string[];
  starterId: string | null;
};

export type TennisLoadout = {
  sport: "tennis";
  playerId: string | null;
};

export type MotorsportLoadout = {
  sport: "motorsport";
  driverId: string | null;
};

export type SportLoadout =
  | FootballLoadout
  | CricketLoadout
  | BasketballLoadout
  | TennisLoadout
  | MotorsportLoadout;

export type LoadoutFor<S extends Sport> = Extract<SportLoadout, { sport: S }>;

export type DeckLoadouts = Partial<{ [S in Sport]: LoadoutFor<S> }>;

/** One named profile carries the active lineup for every sport, as in Flutter. */
export type DeckSlot = {
  id: string;
  name: string;
  loadouts: DeckLoadouts;
};

export type DeckSnapshot = {
  version: 2;
  activeDeckId: string;
  slots: DeckSlot[];
};
