import type { Achievement, AchievementGroup, AchievementStats } from "../types";

/**
 * The badge catalogue, ported one for one from the Flutter app: same ids,
 * titles, descriptions, tiers and targets, so a badge means the same thing in
 * both places.
 *
 * `measure` is the part that changes. Flutter reads one global game bloc; the
 * web reads whichever store owns the number. Where the owning feature has not
 * shipped — picks, predictions, the coin economy — the measure returns zero and
 * the badge stays locked, which is what it looks like for a player who has not
 * done it yet.
 */
const bool = (value: boolean): number => (value ? 1 : 0);

export const achievementCatalog: Achievement[] = [
  /* ---- Matches ---------------------------------------------------------- */
  {
    id: "first_blood",
    title: "First Blood",
    description: "Win your first card match.",
    icon: "sports_soccer",
    tier: "bronze",
    category: "matches",
    target: 1,
    measure: (s) => s.matchWins,
  },
  {
    id: "hat_trick",
    title: "Hat-Trick Hero",
    description: "Win 3 matches.",
    icon: "military_tech",
    tier: "bronze",
    category: "matches",
    target: 3,
    measure: (s) => s.matchWins,
  },
  {
    id: "on_fire",
    title: "On Fire",
    description: "Reach a 3-match win streak.",
    icon: "local_fire_department",
    tier: "silver",
    category: "matches",
    target: 3,
    measure: (s) => s.bestMatchStreak,
  },
  {
    id: "clean_sheet",
    title: "Clean Sheet",
    description: "Win a match without conceding.",
    icon: "verified_user",
    tier: "silver",
    category: "matches",
    target: 1,
    measure: (s) => s.cleanSheets,
  },
  {
    id: "shootout_ace",
    title: "Shootout Ace",
    description: "Win a penalty shootout.",
    icon: "my_location",
    tier: "silver",
    category: "matches",
    target: 1,
    measure: (s) => s.shootoutWins,
  },
  {
    id: "first_bucket",
    title: "First Bucket",
    description: "Win a Hoop Duel match.",
    icon: "sports_basketball",
    tier: "silver",
    category: "matches",
    target: 1,
    measure: (s) => s.basketballWins,
  },
  {
    id: "court_king",
    title: "Court King",
    description: "Win 5 Hoop Duel matches.",
    icon: "emoji_events",
    tier: "gold",
    category: "matches",
    target: 5,
    measure: (s) => s.basketballWins,
  },
  {
    id: "tennis_clean_hold",
    title: "Clean Hold",
    description: "Win a tennis service game without losing a point.",
    icon: "verified_user",
    tier: "bronze",
    category: "matches",
    target: 1,
    measure: (s) => bool(s.tennisAchievements.includes("clean-hold")),
  },
  {
    id: "tennis_break_through",
    title: "Break Through",
    description: "Convert a break point in Tennis Rally.",
    icon: "flash_on",
    tier: "bronze",
    category: "matches",
    target: 1,
    measure: (s) => bool(s.tennisAchievements.includes("break-through")),
  },
  {
    id: "tennis_unbreakable",
    title: "Unbreakable",
    description: "Save three break points in one tennis match.",
    icon: "shield",
    tier: "silver",
    category: "matches",
    target: 1,
    measure: (s) => bool(s.tennisAchievements.includes("unbreakable")),
  },
  {
    id: "tennis_ace_high",
    title: "Ace High",
    description: "Hit five aces across completed tennis sets.",
    icon: "sports_tennis",
    tier: "silver",
    category: "matches",
    target: 1,
    measure: (s) => bool(s.tennisAchievements.includes("ace-high")),
  },
  {
    id: "tennis_rally_architect",
    title: "Rally Architect",
    description: "Complete a 20-shot rally.",
    icon: "all_inclusive",
    tier: "gold",
    category: "matches",
    target: 1,
    measure: (s) => bool(s.tennisAchievements.includes("rally-architect")),
  },
  {
    id: "tennis_net_authority",
    title: "Net Authority",
    description: "Win ten net points with a serve-and-volley athlete.",
    icon: "grid_on",
    tier: "gold",
    category: "matches",
    target: 1,
    measure: (s) => bool(s.tennisAchievements.includes("net-authority")),
  },
  {
    id: "tennis_comeback_set",
    title: "Comeback Set",
    description: "Win a tennis set after trailing by three games.",
    icon: "trending_up",
    tier: "gold",
    category: "matches",
    target: 1,
    measure: (s) => bool(s.tennisAchievements.includes("comeback-set")),
  },
  {
    id: "tennis_tiebreak_nerve",
    title: "Tiebreak Nerve",
    description: "Win after saving set point in a tiebreak.",
    icon: "psychology",
    tier: "gold",
    category: "matches",
    target: 1,
    measure: (s) => bool(s.tennisAchievements.includes("tiebreak-nerve")),
  },
  {
    id: "tennis_all_styles",
    title: "All Styles",
    description: "Win with every base tennis archetype.",
    icon: "style",
    tier: "platinum",
    category: "matches",
    target: 1,
    measure: (s) => bool(s.tennisAchievements.includes("all-styles")),
  },
  {
    id: "tennis_champion",
    title: "Champion",
    description: "Win the eight-player Tennis Rally tournament.",
    icon: "emoji_events",
    tier: "platinum",
    category: "matches",
    target: 1,
    measure: (s) => bool(s.tennisAchievements.includes("champion")),
  },
  {
    id: "veteran",
    title: "Veteran",
    description: "Play 10 matches.",
    icon: "stadium",
    tier: "silver",
    category: "matches",
    target: 10,
    measure: (s) => s.matchesPlayed,
  },
  {
    id: "unstoppable",
    title: "Unstoppable",
    description: "Reach a 5-match win streak.",
    icon: "whatshot",
    tier: "gold",
    category: "matches",
    target: 5,
    measure: (s) => s.bestMatchStreak,
  },
  {
    id: "centurion",
    title: "Centurion",
    description: "Play 50 matches.",
    icon: "workspace_premium",
    tier: "gold",
    category: "matches",
    target: 50,
    measure: (s) => s.matchesPlayed,
  },

  /* ---- Progression ------------------------------------------------------ */
  {
    id: "rising_star",
    title: "Rising Star",
    description: "Reach level 5.",
    icon: "star",
    tier: "bronze",
    category: "progression",
    target: 5,
    measure: (s) => s.level,
  },
  {
    id: "pro",
    title: "Pro",
    description: "Reach level 10.",
    icon: "auto_awesome",
    tier: "silver",
    category: "progression",
    target: 10,
    measure: (s) => s.level,
  },
  {
    id: "legend",
    title: "Legend",
    description: "Reach level 25.",
    icon: "emoji_events",
    tier: "platinum",
    category: "progression",
    target: 25,
    measure: (s) => s.level,
  },

  /* ---- Predictions ------------------------------------------------------ */
  {
    id: "first_prediction",
    title: "First Call",
    description: "Complete your first match quiz.",
    icon: "lightbulb",
    tier: "bronze",
    category: "predictions",
    target: 1,
    measure: (s) => s.predictionsMade,
  },
  {
    id: "analyst",
    title: "Analyst",
    description: "Complete 10 match quizzes.",
    icon: "insights",
    tier: "silver",
    category: "predictions",
    target: 10,
    measure: (s) => s.predictionsMade,
  },
  {
    id: "sharp_eye",
    title: "Sharp Eye",
    description: "Get 10 predictions right.",
    icon: "visibility",
    tier: "silver",
    category: "predictions",
    target: 10,
    measure: (s) => s.correctPredictions,
  },

  /* ---- Picks ------------------------------------------------------------ */
  {
    id: "first_position",
    title: "First Position",
    description: "Place your first pick.",
    icon: "trending_up",
    tier: "bronze",
    category: "picks",
    target: 1,
    measure: (s) => s.picksPlaced,
  },
  {
    id: "market_mover",
    title: "Market Mover",
    description: "Win 5 picks.",
    icon: "show_chart",
    tier: "silver",
    category: "picks",
    target: 5,
    measure: (s) => s.picksWon,
  },
  {
    id: "hot_hand",
    title: "Hot Hand",
    description: "Hit a 3-pick win streak.",
    icon: "bolt",
    tier: "gold",
    category: "picks",
    target: 3,
    measure: (s) => s.pickStreak,
  },
  {
    id: "in_profit",
    title: "In Profit",
    description: "Finish in net pick profit.",
    icon: "savings",
    tier: "silver",
    category: "picks",
    target: 1,
    measure: (s) => bool(s.pickProfit > 0),
  },

  /* ---- Collection ------------------------------------------------------- */
  {
    id: "collector",
    title: "Collector",
    description: "Own 25 cards.",
    icon: "collections_bookmark",
    tier: "bronze",
    category: "collection",
    target: 25,
    measure: (s) => s.ownedCards,
  },
  {
    id: "platinum_pull",
    title: "Platinum Pull",
    description: "Own a platinum-tier card.",
    icon: "diamond",
    tier: "platinum",
    category: "collection",
    target: 1,
    measure: (s) => s.platinumOwned,
  },
  {
    id: "treasury",
    title: "Treasury",
    description: "Hold 1,000 coins at once.",
    icon: "paid",
    tier: "gold",
    category: "collection",
    target: 1000,
    measure: (s) => s.coins,
  },
];

/** Which group a badge files under. */
export function achievementGroup(achievement: Achievement): AchievementGroup {
  if (achievement.category === "predictions") return "prediction";
  if (achievement.category === "picks") return "picks";
  return "games";
}

export const achievementGroups: AchievementGroup[] = [
  "games",
  "prediction",
  "picks",
];

export const achievementGroupLabels: Record<AchievementGroup, string> = {
  prediction: "PREDICTION",
  picks: "PICKS",
  games: "GAMES",
};

export function isUnlocked(
  achievement: Achievement,
  stats: AchievementStats,
): boolean {
  return achievement.measure(stats) >= achievement.target;
}

/** How far along a badge is, 0..1. */
export function achievementProgress(
  achievement: Achievement,
  stats: AchievementStats,
): number {
  if (achievement.target === 0) return 0;
  return Math.min(
    1,
    Math.max(0, achievement.measure(stats) / achievement.target),
  );
}

/** The measured value, clamped to the target so a readout cannot overshoot. */
export function achievementCurrent(
  achievement: Achievement,
  stats: AchievementStats,
): number {
  return Math.min(achievement.measure(stats), achievement.target);
}

export function unlockedAchievementCount(stats: AchievementStats): number {
  return achievementCatalog.filter((a) => isUnlocked(a, stats)).length;
}

/** Badges in one group, in catalogue order. */
export function achievementsForGroup(group: AchievementGroup): Achievement[] {
  return achievementCatalog.filter((a) => achievementGroup(a) === group);
}

export function unlockedCountForGroup(
  stats: AchievementStats,
  group: AchievementGroup,
): number {
  return achievementsForGroup(group).filter((a) => isUnlocked(a, stats)).length;
}

/**
 * The showcase's preview: everything already earned, then whatever is closest
 * to unlocking. A player always sees their best badges first.
 */
export function previewAchievements(
  stats: AchievementStats,
  count: number,
): Achievement[] {
  const unlocked = achievementCatalog.filter((a) => isUnlocked(a, stats));
  const locked = achievementCatalog
    .filter((a) => !isUnlocked(a, stats))
    .sort(
      (a, b) => achievementProgress(b, stats) - achievementProgress(a, stats),
    );
  return [...unlocked, ...locked].slice(0, count);
}
