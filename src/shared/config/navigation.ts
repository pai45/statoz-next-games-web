/** Ids of the platform's primary destinations. */
export type NavDestinationId = "sports" | "quiz" | "shop" | "leaderboard" | "profile";

export type NavDestination = {
  id: NavDestinationId;
  label: string;
  href: string;
};

/**
 * The primary destinations, in bar and rail order. Icons and accents are a
 * visual concern and stay with the components that render them.
 */
export const navDestinations: NavDestination[] = [
  { id: "sports", label: "GAMES", href: "/" },
  { id: "shop", label: "SHOP", href: "/shop" },
  { id: "leaderboard", label: "TOP", href: "/leaderboard" },
  { id: "profile", label: "PROFILE", href: "/profile" },
];
