/** Home editorial order and artwork only. Game identity remains in the registry. */
export const homeFeaturedGames = ["penalty-cup", "hoop-legacy", "portfolio-formula", "cricketer"] as const;

export const homeSpotlights: Record<string, { src: string; position: string }> = {
  "penalty-cup": { src: "/assets/games/home/spotlights/penalty-cup.webp", position: "65% 50%" },
  "hoop-legacy": { src: "/assets/games/home/spotlights/hoop-legacy.webp", position: "65% 45%" },
  "portfolio-formula": { src: "/assets/games/home/spotlights/portfolio-formula.webp", position: "65% 60%" },
  "cricketer": { src: "/assets/games/home/spotlights/cricketer.webp", position: "65% 50%" },
};

/** Existing covers keep their focal subject clear of the copy overlay. */
export const homeCoverPositions: Record<string, string> = {
  "open-golf": "75% 55%", "pitch-duel": "80% 45%", "longbow": "75% 50%",
  "f1-racing": "75% 55%", "football-chess": "70% 60%", "rim-rush": "75% 50%",
  "tennis-bits": "75% 50%", "yorker": "75% 50%",
};
