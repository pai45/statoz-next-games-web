"use client";

import { useRouter } from "next/navigation";

import { ArrowRightIcon, PremiumIcon } from "@statoz/design-system/games";

import { referralRewardOz } from "../state/referral-store";
import styles from "./friends.module.css";

/**
 * The arena's way into referrals: what the invite is worth, and one action.
 *
 * It is a button rather than a link because the whole card is the hit area, and
 * a card-sized anchor around this much content reads as a paragraph of link
 * text to a screen reader.
 */
export function ReferralInviteCard() {
  const router = useRouter();

  return (
    <button
      type="button"
      className={styles.inviteCard}
      onClick={() => router.push("/friends/referrals")}
      aria-label={`Invite friends and earn ${referralRewardOz} Oz Coins`}
    >
      <span className="flex items-center gap-3.25">
        <span className={styles.inviteGlyph} aria-hidden="true">
          <PremiumIcon size={25} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`${styles.inviteEyebrow} block truncate`}>INVITE FRIENDS</span>
          <span className={`${styles.inviteHeadline} block truncate`}>
            EARN {referralRewardOz} OZ COINS
          </span>
        </span>
      </span>

      <span className={styles.inviteBody}>Share your link. Earn when your friend joins.</span>

      <span className={styles.inviteCta}>
        INVITE &amp; EARN
        <ArrowRightIcon size={17} aria-hidden="true" />
      </span>
    </button>
  );
}
