/**
 * The friends feature's public API.
 *
 * The arena and the referral screen it opens, plus the two stores behind them —
 * who you have bookmarked, and where your invites have got to.
 */
export { FriendsArena } from "./components/friends-arena";
export { ReferralScreen } from "./components/referral-screen";
export { ReferralInviteCard } from "./components/referral-invite-card";
export { FriendRequestSent } from "./components/friend-request-sent";

export {
  addFriend,
  isFriend,
  readFriends,
  removeFriend,
  resetFriends,
  toggleFriend,
  useFriendCounts,
  useFriends,
  type FriendCounts,
  type FriendsSnapshot,
} from "./state/friends-store";

export {
  readReferrals,
  referralLink,
  referralRewardOz,
  referralTotals,
  resetReferrals,
  simulateFriendJoined,
  useReferralTotals,
  useReferrals,
  type ReferralsSnapshot,
} from "./state/referral-store";

export type { ReferralEntry, ReferralStatus, ReferralTotals } from "./types";
