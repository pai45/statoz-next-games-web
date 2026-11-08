import type { ProfileBannerOption } from "@/features/onboarding/types";

/**
 * The colors that fly behind a player's dossier. `src` is left unset: the app's
 * banner artwork is unoptimized multi-megabyte PNG, so the web draws the same
 * design procedurally until optimized art is dropped into
 * `public/assets/backgrounds/` and pointed at from here.
 */
export const profileBannerOptions: ProfileBannerOption[] = [
  {
    id: "south_africa",
    label: "South Africa",
    colors: ["#07100f", "#007a42", "#ffc400"],
    accent: "#31d0ff",
  },
  {
    id: "green_red",
    label: "Green Red",
    colors: ["#061d13", "#0e6f3a", "#e21e2b"],
    accent: "#44ff9a",
  },
  {
    id: "korea",
    label: "Korea",
    colors: ["#eef2f7", "#d9212f", "#0b3f8f"],
    accent: "#f23b4d",
  },
  {
    id: "czech",
    label: "Czech",
    colors: ["#eef2f7", "#1452a3", "#e5242d"],
    accent: "#4ea3ff",
  },
];

export function profileBannerOptionById(
  id: string | undefined,
): ProfileBannerOption {
  return (
    profileBannerOptions.find((banner) => banner.id === id) ??
    profileBannerOptions[0]
  );
}
