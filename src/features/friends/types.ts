/** Where an invited friend has got to. */
export type ReferralStatus = "invited" | "pending" | "rewarded";

export type ReferralEntry = {
  id: string;
  friendName: string;
  status: ReferralStatus;
  /** ISO 8601. */
  createdAt: string;
  /** Oz paid out once they joined. Zero until then. */
  reward: number;
};

/** What the referral screen counts across those entries. */
export type ReferralTotals = {
  invited: number;
  pending: number;
  rewarded: number;
  coinsEarned: number;
};
