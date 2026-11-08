import type { AuthHeroMedia } from "./types";

/** Six-second compositions: desktop left panel and compact mobile header. */
export const authHeroMedia: AuthHeroMedia = {
  kind: "video",
  src: "/assets/backgrounds/onboarding/desktop.webm",
  mp4Src: "/assets/backgrounds/onboarding/desktop.mp4",
  poster: "/assets/backgrounds/onboarding/desktop-poster.webp",
  mobile: {
    src: "/assets/backgrounds/onboarding/mobile.webm",
    mp4Src: "/assets/backgrounds/onboarding/mobile.mp4",
    poster: "/assets/backgrounds/onboarding/mobile-poster.webp",
  },
  alt: "Messi, Ronaldo, Virat Kohli, Lewis Hamilton and LeBron James. StatOz: One arena. Every game.",
};

/** Fallback when sign-in was not opened for a protected destination. */
export const afterSignInHref = "/";
