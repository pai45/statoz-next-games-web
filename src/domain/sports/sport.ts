/** Every sport StatOz covers. */
export type Sport =
  | "football"
  | "cricket"
  | "basketball"
  | "tennis"
  | "motorsport";

/** Design-system accent token name a sport is identified by. */
export type SportAccent = "white" | "cyan" | "lime" | "gold" | "racing";

export type SportModule = {
  sport: Sport;
  label: string;
  /** Four-or-so character code used where space is tight. */
  shortLabel: string;
  accent: SportAccent;
};

export const sportModules: Record<Sport, SportModule> = {
  football: {
    sport: "football",
    label: "Football",
    shortLabel: "FTBL",
    accent: "cyan",
  },
  cricket: {
    sport: "cricket",
    label: "Cricket",
    shortLabel: "CRKT",
    accent: "white",
  },
  basketball: {
    sport: "basketball",
    label: "Basket",
    shortLabel: "BALL",
    accent: "gold",
  },
  tennis: {
    sport: "tennis",
    label: "Tennis",
    shortLabel: "TENNIS",
    accent: "lime",
  },
  motorsport: {
    sport: "motorsport",
    label: "Motorsport",
    shortLabel: "MOTOR",
    accent: "racing",
  },
};

/** Browse order for the sport strip. */
export const sportOrder: Sport[] = [
  "football",
  "cricket",
  "basketball",
  "motorsport",
];

/** Ordered tab palette, derived from the same source as every sport surface. */
export const sportTabColors: SportAccent[] = sportOrder.map(
  (sport) => sportModules[sport].accent,
);

export function sportModuleFor(sport: Sport): SportModule {
  return sportModules[sport];
}
