export { ArenaBackdrop, type ArenaBackdropProps } from "./components/arena-backdrop";
export { BannerVisual, type BannerVisualProps } from "./components/banner-visual";
/**
 * The club pickers are part of the public surface because the profile edits the
 * same choices later, against the same league data this feature owns. Two
 * copies of a control that follows a league would be one too many.
 */
export { LeaguePills, type LeaguePillsProps } from "./components/league-pills";
export { SportPills, type SportPillsProps } from "./components/sport-pills";
export {
  LaunchCountdown,
  type LaunchCountdownProps,
} from "./components/launch-countdown";
export {
  OnboardingScreen,
  type OnboardingScreenProps,
} from "./components/onboarding-screen";
export { WelcomeReveal, type WelcomeRevealProps } from "./components/welcome-reveal";
export { afterOnboardingHref, setupSteps, type SetupStep } from "./constants";
export {
  avatarForName,
  avatarOptionById,
  avatarOptions,
} from "@/mocks/onboarding";
export {
  profileBannerOptionById,
  profileBannerOptions,
} from "@/mocks/onboarding";
export {
  followableLeagueById,
  followableLeagues,
  followableLeaguesForSport,
} from "@/mocks/onboarding";
export type {
  AvatarOption,
  FollowableLeague,
  FollowableTeam,
  ProfileBannerOption,
  ProfileSetupResult,
  SetupStepId,
} from "./types";
