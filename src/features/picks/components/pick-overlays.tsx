"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import { BrandIcon, CheckIcon, WhatshotIcon } from "@statoz/design-system/games";
import type { PickPosition } from "@/domain/predictions";
import { useFullScreenMoment, usePrefersReducedMotion } from "@/shared/hooks";
import { formatInt } from "@/shared/utils";

import type { BatchSettlement } from "../state/picks-store";
import type { PickTradeSuccess } from "./pick-trade-sheet";
import styles from "./pick-overlays.module.css";

/**
 * The beat after a pick is confirmed: a ring pops, the ticket is stated, and
 * the overlay clears itself. It is a confirmation, not a decision, so nothing
 * on it can be pressed.
 */
export function PickLockedOverlay({
  success,
  winStreak,
  onDone,
}: {
  success: PickTradeSuccess | null;
  winStreak: number;
  onDone: () => void;
}) {
  const reduced = usePrefersReducedMotion();
  useFullScreenMoment();

  // The surface behind this keeps re-rendering; the beat runs on its own clock.
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  useEffect(() => {
    if (!success) return;
    const task = window.setTimeout(() => done.current(), reduced ? 400 : 1850);
    return () => window.clearTimeout(task);
  }, [success, reduced]);

  if (!success) return null;

  return (
    <div className={styles.scrim} role="status" aria-live="polite">
      <div className={styles.lockedRing} aria-hidden>
        <CheckIcon size={58} />
      </div>
      <strong className={styles.lockedTitle}>PICK LOCKED</strong>
      <b className={styles.lockedOutcome}>{success.outcomeLabel.toUpperCase()}</b>
      <div className={styles.lockedPlate}>
        <BrandIcon name="coin" size={16} />
        <span>{success.stakeOz} STAKE</span>
        <span className={styles.lockedShares}>{success.shares} SHARES</span>
        <span className={styles.lockedMax}>{success.maxPayoutOz} MAX</span>
      </div>
      {winStreak >= 2 ? (
        <p className={styles.streakChip}>
          <WhatshotIcon size={14} aria-hidden="true" />
          WIN STREAK &times;{winStreak} &mdash; KEEP IT ALIVE
        </p>
      ) : null}
    </div>
  );
}

export type PickRevealVerdict = "win" | "loss" | "voided" | "mixed";

export type PickRevealData = {
  title: string;
  subtitle: string;
  verdict: PickRevealVerdict;
  stakeOz: number;
  payoutOz: number;
  winStreak: number;
};

/** One settled position, as the reveal reads it. */
export function revealForPosition(position: PickPosition, winStreak: number): PickRevealData {
  return {
    title: position.marketQuestion,
    subtitle: position.outcomeLabel.toUpperCase(),
    verdict: position.status === "won" ? "win" : position.status === "voided" ? "voided" : "loss",
    stakeOz: position.stakeOz,
    payoutOz: position.payoutOz,
    winStreak,
  };
}

/** A Claim All batch: one aggregate number, one cinematic. */
export function revealForBatch(result: BatchSettlement, winStreak: number): PickRevealData {
  return {
    title: `${result.settledCount} ${result.settledCount === 1 ? "PICK" : "PICKS"} SETTLED`,
    subtitle: `${result.wonCount} WON \u00b7 ${result.settledCount - result.wonCount} LOST`,
    verdict:
      result.wonCount === result.settledCount ? "win" : result.wonCount === 0 ? "loss" : "mixed",
    stakeOz: result.stakeOz,
    payoutOz: result.payoutOz,
    winStreak,
  };
}

const verdictAccent: Record<PickRevealVerdict, string> = {
  win: "var(--ds-color-success)",
  loss: "var(--ds-color-danger)",
  voided: "var(--ds-color-text-muted)",
  mixed: "var(--ds-color-accent-gold)",
};

const verdictStamp: Record<PickRevealVerdict, string> = {
  win: "WIN",
  loss: "LOST",
  voided: "VOID",
  mixed: "SETTLED",
};

/**
 * The three-beat settlement cinematic: the verdict stamps, the coins move, the
 * ticket is totted up. Tapping once skips to the summary; tapping again closes.
 *
 * Coins are credited before this ever shows, so the overlay is pure
 * presentation and skipping it costs the player nothing.
 */
export function PickSettlementReveal({
  data,
  onClose,
}: {
  data: PickRevealData | null;
  onClose: () => void;
}) {
  // The body only exists while there is a result, so each reveal starts its
  // beats from the top without an effect resetting anything.
  return data ? <RevealBody data={data} onClose={onClose} /> : null;
}

function RevealBody({ data, onClose }: { data: PickRevealData; onClose: () => void }) {
  const reduced = usePrefersReducedMotion();
  useFullScreenMoment();
  const [skipped, setSkipped] = useState(false);

  const accent = verdictAccent[data.verdict];
  const profit = data.payoutOz - data.stakeOz;
  const paidOut = data.payoutOz > 0;
  const showStreak = data.winStreak >= 2 && data.verdict !== "loss";
  const still = reduced || skipped;

  return (
    <div
      className={[styles.reveal, still ? styles.revealStill : ""].filter(Boolean).join(" ")}
      style={{ "--verdict": accent } as CSSProperties}
      role="dialog"
      aria-modal="true"
      aria-label={`${verdictStamp[data.verdict]}: ${data.title}`}
      onClick={() => (still ? onClose() : setSkipped(true))}
    >
      <div className={styles.revealTop}>
        <b className={styles.revealEyebrow}>RESULTS ARE IN</b>
        <p className={styles.revealTitle}>{data.title}</p>
        <p className={styles.revealSubtitle}>{data.subtitle}</p>
      </div>

      <div className={styles.stampSlot}>
        {data.verdict === "win" ? <span aria-hidden className={styles.burst} /> : null}
        <strong className={styles.stamp}>{verdictStamp[data.verdict]}</strong>
      </div>

      <div className={styles.coinFlow}>
        {data.verdict === "loss" ? (
          <b className={styles.coinLoss}>&minus;{formatInt(data.stakeOz)} OZ</b>
        ) : data.verdict === "voided" ? (
          <b className={styles.coinVoid}>STAKE REFUNDED</b>
        ) : (
          <span className={styles.coinWin}>
            <BrandIcon name="coin" size={26} />
            <b>+{formatInt(data.payoutOz)} OZ</b>
          </span>
        )}
      </div>

      <div className={styles.summary}>
        <SummaryTile label="STAKE" value={formatInt(data.stakeOz)} />
        <SummaryTile
          label="PAYOUT"
          value={formatInt(data.payoutOz)}
          color={paidOut ? "var(--ds-color-success)" : undefined}
        />
        <SummaryTile
          label="PROFIT"
          value={profit >= 0 ? `+${formatInt(profit)}` : `\u2212${formatInt(-profit)}`}
          color={
            profit > 0
              ? "var(--ds-color-success)"
              : profit < 0
                ? "var(--ds-color-danger)"
                : undefined
          }
        />
      </div>

      <div className={styles.streakSlot}>
        {showStreak ? (
          <p className={styles.revealStreak}>
            <WhatshotIcon size={16} aria-hidden="true" />
            WIN STREAK &times;{data.winStreak}
          </p>
        ) : null}
      </div>

      <p className={styles.hint}>TAP TO CONTINUE</p>
    </div>
  );
}

function SummaryTile({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <span className={styles.summaryTile}>
      <small>{label}</small>
      <b style={color ? { color } : undefined}>{value}</b>
    </span>
  );
}
