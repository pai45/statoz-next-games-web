"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import Link from "next/link";
import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";

import {
  CheckIcon,
  ChevronLeftIcon,
  CopyIcon,
  GroupsIcon,
  PaidIcon,
  PremiumIcon,
  ShareIcon,
  VerifiedIcon,
  WarningIcon,
  accentVar,
} from "@statoz/design-system/games";
import { AuthBoundary } from "@/features/auth";
import { loadOrCreatePlayerTag, useIsHydrated, useProfileIdentity } from "@/features/profile";
import { usePrefersReducedMotion } from "@/shared/hooks";

import type { ReferralEntry, ReferralStatus } from "../types";
import {
  referralLink,
  referralRewardOz,
  simulateFriendJoined,
  useReferralTotals,
  useReferrals,
} from "../state/referral-store";
import styles from "./friends.module.css";

/**
 * REFER A FRIEND — what an invite is worth, how it works, the link itself, and
 * where every invite has got to.
 *
 * The app shares through the OS sheet and falls back to the clipboard; the web
 * asks the browser for `navigator.share` and falls back the same way, so the
 * one action works whether or not the browser can hand off.
 */

const cyan = accentVar("cyan");
const gold = accentVar("gold");
const orange = accentVar("orange");
const success = "var(--ds-color-success)";
const muted = "var(--ds-color-text-muted)";

const copiedForMs = 2000;
const celebrationMs = 1200;
const toastMs = 1800;

export function ReferralScreen() {
  return (
    <AuthBoundary
      intent="invite friends"
      message="Log in to get your invite link and earn when a friend joins."
      returnTo="/friends/referrals"
    >
      <ReferralBoard />
    </AuthBoundary>
  );
}

function ReferralBoard() {
  const identity = useProfileIdentity();
  const referrals = useReferrals();
  const totals = useReferralTotals();
  const reducedMotion = usePrefersReducedMotion();

  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [reward, setReward] = useState<number | null>(null);

  /**
   * The tag is minted lazily, and the mint draws a random seed — so it cannot
   * run during render, where a server pass would spell a different one. The
   * effect only writes to the identity store; the new value arrives back
   * through `identity`.
   */
  const hydrated = useIsHydrated();
  useEffect(() => {
    if (hydrated) loadOrCreatePlayerTag();
  }, [hydrated]);
  const link = referralLink(identity.playerTag);

  useEffect(() => {
    if (toast === null) return;
    const timer = window.setTimeout(() => setToast(null), toastMs);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), copiedForMs);
    return () => window.clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    if (reward === null) return;
    const timer = window.setTimeout(() => setReward(null), reducedMotion ? 400 : celebrationMs);
    return () => window.clearTimeout(timer);
  }, [reward, reducedMotion]);

  const copyLink = useCallback(async () => {
    if (link === "") return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setToast("Referral link copied");
    } catch {
      setToast("Copying is blocked in this browser");
    }
  }, [link]);

  const shareLink = useCallback(async () => {
    if (link === "" || sharing) return;
    setSharing(true);
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({
          title: "Join me on StatOz",
          text:
            "Join me on StatOz and start building your football legacy! " +
            `Use my invite link: ${link}. ` +
            `When you join, I earn ${referralRewardOz} Oz Coins.`,
          url: link,
        });
        setToast("Invite ready to send");
      } else {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setToast("Sharing unavailable - link copied");
      }
    } catch {
      // A dismissed share sheet lands here too, which is not worth a message.
    } finally {
      setSharing(false);
    }
  }, [link, sharing]);

  function claimDemoReward() {
    const entry = simulateFriendJoined();
    if (!entry) return;
    setReward(entry.reward);
  }

  return (
    <div className="min-h-full bg-background text-default">
      <header className="flex min-h-14 items-center gap-2 px-2 pt-2 lg:mx-auto lg:max-w-260 lg:px-6 lg:pt-4">
        <Link
          href="/friends"
          aria-label="Back to the friends arena"
          className="grid h-9 w-9 place-items-center text-default hover:bg-overlay-subtle"
        >
          <ChevronLeftIcon size={22} />
        </Link>
        <div className="min-w-0">
          <h1
            className="truncate font-display font-black leading-none"
            style={{ fontSize: typography.sizeRem.p19, color: cyan, letterSpacing: "var(--ds-tracking-label)" }}
          >
            REFER A FRIEND
          </h1>
          <p
            className="mt-1 font-display font-black leading-none"
            style={{ fontSize: typography.sizeRem.p9, color: muted, letterSpacing: "var(--ds-tracking-ultra)" }}
          >
            {"// INVITE & EARN"}
          </p>
        </div>
      </header>

      <div className={`${styles.page} ${styles.referralPage}`}>
        <section className={`${styles.rewardHero} spanFull`}>
          <div className="flex items-center gap-3.75">
            <span className={styles.heroGlyph} aria-hidden="true">
              <PaidIcon size={34} />
            </span>
            <div className="min-w-0">
              <h2 className={`${styles.heroTitle} truncate`}>EARN {referralRewardOz} OZ COINS</h2>
              <p className={styles.heroBody}>
                Invite a friend into StatOz and get paid when they join.
              </p>
            </div>
          </div>
          <span className={styles.heroRule} aria-hidden="true" />
          <p className={styles.heroNote}>
            <VerifiedIcon size={17} aria-hidden="true" />
            Your personal invite link is ready to share.
          </p>
        </section>

        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>HOW IT WORKS</h3>
          <div className={styles.steps}>
            {[
              { icon: <ShareIcon size={21} />, label: "SHARE LINK" },
              { icon: <GroupsIcon size={21} />, label: "FRIEND JOINS" },
              { icon: <PremiumIcon size={21} />, label: `+${referralRewardOz} COINS` },
            ].map((step, index, steps) => (
              <Step
                key={step.label}
                index={index + 1}
                icon={step.icon}
                label={step.label}
                joined={index < steps.length - 1}
              />
            ))}
          </div>
        </section>

        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>YOUR REFERRAL LINK</h3>

          <div className={styles.linkRow}>
            <span className={styles.linkText}>{link === "" ? "Minting your link…" : link}</span>
            <button
              type="button"
              className={[styles.linkCopy, copied ? styles.linkCopied : ""].filter(Boolean).join(" ")}
              onClick={copyLink}
              aria-label={copied ? "Referral link copied" : "Copy referral link"}
            >
              {copied ? <CheckIcon size={21} /> : <CopyIcon size={21} />}
            </button>
          </div>

          <p className={styles.linkHint}>
            {copied ? <CheckIcon size={16} style={{ color: success }} /> : <WarningIcon size={16} />}
            {copied
              ? "Link copied. Send it anywhere your squad chats."
              : "Share or copy this invite to bring a friend in."}
          </p>

          <button
            type="button"
            className={styles.shareButton}
            onClick={shareLink}
            disabled={sharing || link === ""}
          >
            <ShareIcon size={18} aria-hidden="true" />
            {sharing ? "OPENING SHARE..." : "SHARE REFERRAL LINK"}
          </button>
        </section>

        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>PROGRESS</h3>
          <div className={styles.totals}>
            <Total label="INVITED" value={totals.invited} color={cyan} />
            <span className={styles.totalRule} aria-hidden="true" />
            <Total label="PENDING" value={totals.pending} color={orange} />
            <span className={styles.totalRule} aria-hidden="true" />
            <Total label="REWARDED" value={totals.rewarded} color={success} />
            <span className={styles.totalRule} aria-hidden="true" />
            <Total label="COINS" value={totals.coinsEarned} color={gold} />
          </div>
        </section>

        <section className={`${styles.panel} spanFull`}>
          <div className="flex items-baseline gap-3">
            <h3 className={`${styles.sectionTitle} flex-1`} style={{ fontSize: typography.sizeRem.p13 }}>
              RECENT REFERRALS
            </h3>
            <span className={styles.sectionCount}>{referrals.entries.length} TOTAL</span>
          </div>

          {referrals.entries.length === 0 ? (
            <p className={styles.emptyReferrals}>
              No referrals yet. Share your link to invite your first friend.
            </p>
          ) : (
            <div>
              {referrals.entries.map((entry, index) => (
                <div key={entry.id}>
                  {index > 0 ? <span className={styles.referralRule} aria-hidden="true" /> : null}
                  <ReferralRow entry={entry} />
                </div>
              ))}
            </div>
          )}

          {totals.pending > 0 ? (
            <button
              type="button"
              className={styles.shareButton}
              onClick={claimDemoReward}
              style={{ background: "var(--ds-color-background-elevated)", color: "var(--ds-color-text-default)" }}
            >
              SIMULATE FRIEND JOINED
            </button>
          ) : null}
        </section>

        {toast ? (
          <p className={`${styles.toast} spanFull`} role="status">
            {toast}
          </p>
        ) : null}
      </div>

      {reward !== null ? (
        <div className={styles.celebration} role="status">
          <div className={styles.celebrationPlate}>
            <PaidIcon size={40} style={{ color: gold }} aria-hidden="true" />
            <b className={styles.celebrationAmount}>+{reward}</b>
            <span className={styles.celebrationLabel}>OZ COINS</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Step({
  index,
  icon,
  label,
  joined,
}: {
  index: number;
  icon: ReactNode;
  label: string;
  joined: boolean;
}) {
  return (
    <>
      <span className={styles.step}>
        <span className={styles.stepGlyph}>
          {icon}
          <span className={styles.stepIndex}>{index}</span>
        </span>
        <span className={styles.stepLabel}>{label}</span>
      </span>
      {joined ? <span className={styles.stepJoin} aria-hidden="true" /> : null}
    </>
  );
}

function Total({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span className={styles.total}>
      <b className={`${styles.statValue} ${styles.tabular}`} style={{ "--stat-color": color } as CSSProperties}>
        {value}
      </b>
      <span className={styles.statLabel}>{label}</span>
    </span>
  );
}

const statusLabels: Record<ReferralStatus, string> = {
  invited: "INVITED",
  pending: "PENDING",
  rewarded: "REWARDED",
};

const statusColors: Record<ReferralStatus, string> = {
  invited: cyan,
  pending: orange,
  rewarded: success,
};

function ReferralRow({ entry }: { entry: ReferralEntry }) {
  const color = statusColors[entry.status];
  const label =
    entry.status === "rewarded"
      ? `${statusLabels.rewarded} +${entry.reward}`
      : statusLabels[entry.status];

  return (
    <div className={styles.referralRow} style={{ "--status-color": color } as CSSProperties}>
      <span className={styles.referralGlyph} aria-hidden="true">
        {entry.friendName.slice(0, 1).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate" style={{ fontSize: typography.sizeRem.p13 }}>{entry.friendName}</span>
        <span className={`${styles.rowDate} block`}>{dateLabel(entry.createdAt)}</span>
      </span>
      <span className={styles.statusTag}>{label}</span>
    </div>
  );
}

const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function dateLabel(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getDate()).padStart(2, "0")} ${months[date.getMonth()]}`;
}
