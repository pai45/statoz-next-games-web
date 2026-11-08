import type { ProfileIdentity } from "../types";

export type ProfilePreferences = Pick<ProfileIdentity, "featuredGameId" | "equippedTitleAchievementId" | "pinnedAchievementIds">;

/** Optional additions preserve older identity records and intentional empty showcases. */
export function parseProfilePreferences(value: Record<string, unknown>): ProfilePreferences {
  return {
    featuredGameId: typeof value.featuredGameId === "string" ? value.featuredGameId : null,
    equippedTitleAchievementId: typeof value.equippedTitleAchievementId === "string" ? value.equippedTitleAchievementId : null,
    ...(Array.isArray(value.pinnedAchievementIds) ? {
      pinnedAchievementIds: value.pinnedAchievementIds.slice(0, 3).map((id, index, slots) => typeof id === "string" && (id === "" || slots.indexOf(id) === index) ? id : ""),
    } : {}),
  };
}
