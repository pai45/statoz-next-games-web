import { rarityOrder } from "@statoz/design-system/games/tokens/colors";
import { achievementCatalog, achievementProgress, isUnlocked } from "./achievements";
import type { Achievement, AchievementStats } from "../types";

/** Earned legacy game trophies remain; unmeasurable objectives are not advertised. */
export function hubAchievements(stats: AchievementStats): Achievement[] {
  return achievementCatalog.filter(achievement => {
    if (achievement.category !== "matches" && achievement.category !== "progression") return false;
    if (["clean_sheet", "first_bucket", "court_king"].includes(achievement.id)) return isUnlocked(achievement, stats);
    return true;
  });
}
export function showcaseAchievements(stats: AchievementStats, pinned: string[] | undefined): Achievement[] {
  const earned = hubAchievements(stats).filter(achievement => isUnlocked(achievement, stats));
  if (pinned !== undefined) return [...new Set(pinned)].slice(0, 3).flatMap(id => earned.find(achievement => achievement.id === id) ?? []);
  return [...earned].sort((a, b) => rarityOrder.indexOf(b.tier) - rarityOrder.indexOf(a.tier)).slice(0, 3);
}
/** Keep deliberate empty positions so slot 3 remains slot 3 after a reload. */
export function showcaseSlots(stats: AchievementStats, pinned: string[] | undefined): (Achievement | undefined)[] {
  const trophies = showcaseAchievements(stats, pinned);
  return Array.from({ length: 3 }, (_, index) => pinned === undefined ? trophies[index] : trophies.find(trophy => trophy.id === pinned[index]));
}
export function nextHubAchievement(stats: AchievementStats): Achievement | undefined {
  return hubAchievements(stats).filter(achievement => !isUnlocked(achievement, stats)).sort((a, b) => achievementProgress(b, stats) - achievementProgress(a, stats))[0];
}
export function achievementGame(id: string): "penalty-shootout" | "tennis-rally" | "pitch-duel" {
  if (id === "shootout_ace") return "penalty-shootout";
  return id.startsWith("tennis_") ? "tennis-rally" : "pitch-duel";
}
export function earnedProfileTitle(stats: AchievementStats, id: string | null | undefined): string {
  return hubAchievements(stats).find(achievement => achievement.id === id && isUnlocked(achievement, stats))?.title ?? "StatOz Player";
}
