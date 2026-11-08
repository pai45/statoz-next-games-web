/**
 * The profile feature's public API.
 *
 * The dossier itself, plus the identity store — onboarding writes the setup it
 * collects through `saveProfileSetup`, and everything else about who the player
 * is stays behind this boundary.
 */
export { ProfileScreen } from "./components/profile-screen";
export {
  XpProgressScreen,
  type XpProgressScreenProps,
} from "./components/xp-progress-screen";
export { AllCardsScreen } from "./components/all-cards-screen";
export { TalkToStatoz } from "./components/talk-to-statoz";
export { TransmissionCompose } from "./components/transmission-compose";
export {
  channelNumber,
  supportChannelFor,
  supportChannels,
  type SupportChannel,
  type SupportChannelId,
} from "./data/support-channels";
export {
  ProfileHistoryScreen,
  type ProfileHistoryScreenProps,
} from "./components/profile-history";
export type { HistorySection } from "@/mocks/profile";

export {
  playerDisplayName,
  usePlayerStanding,
  type PlayerStanding,
} from "./state/player-standing";

export { RivalDossierOverlay } from "./components/rival-dossier";
export { rivalDossier, type RivalDossier } from "./data/rival-dossier";

export {
  loadOrCreatePlayerTag,
  readProfileIdentity,
  useIsHydrated,
  resetProfileIdentity,
  saveProfileSetup,
  useProfileIdentity,
} from "./state/profile-identity";
export { saveAvatar, saveBanner } from "./identity";

export type { ProfileIdentity } from "./types";
