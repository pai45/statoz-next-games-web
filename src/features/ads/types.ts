/** Stable identifiers used to name future AdSense slots without coupling UI to credentials. */
export type AdPlacementId =
  | "home-feed"
  | "games-catalog"
  | "profile-dossier"
  | "history-feed"
  | "leaderboard-rail"
  | "platform-left-rail"
  | "platform-right-rail"
  | "game-landing-anchor";

export type AdFormat = "horizontal" | "rectangle" | "skyscraper" | "anchor";

export type AdCreative = "campaign" | "wireframe";

export type AdPlacement = {
  format: AdFormat;
  creative: AdCreative;
  desktopOnly?: boolean;
};
