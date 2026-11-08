import type { AdPlacement, AdPlacementId } from "@/features/ads/types";

/**
 * The page owns where an ad is safe to appear; this map owns its presentation.
 * These names intentionally match the slots that can later receive AdSense IDs.
 */
export const adPlacements: Record<AdPlacementId, AdPlacement> = {
  "home-feed": { format: "horizontal", creative: "campaign" },
  "games-catalog": { format: "horizontal", creative: "wireframe" },
  "profile-dossier": { format: "horizontal", creative: "campaign" },
  "history-feed": { format: "horizontal", creative: "wireframe" },
  "leaderboard-rail": {
    format: "rectangle",
    creative: "campaign",
    desktopOnly: true,
  },
  "platform-left-rail": {
    format: "skyscraper",
    creative: "wireframe",
    desktopOnly: true,
  },
  "platform-right-rail": {
    format: "skyscraper",
    creative: "wireframe",
    desktopOnly: true,
  },
  "game-landing-anchor": {
    format: "anchor",
    creative: "wireframe",
  },
};
