"use client";

import { useState, type CSSProperties } from "react";

import { AdaptiveDrawer, BrandIcon, colors, liftForContrast } from "@statoz/design-system/games";
import {
  isValidStake,
  payoutForShares,
  sharesForStake,
  type PickMarket,
  type PickOutcome,
} from "@/domain/predictions";
import { useEconomy } from "@/features/economy";
import { formatInt } from "@/shared/utils";

import { placePick } from "../state/picks-store";
import styles from "./pick-trade-sheet.module.css";

/**
 * The order ticket: what this pick pays is the hero number, quick-stake chips
 * make sizing one tap, and confirming is the only lit control on the sheet.
 */
export function PickTradeSheet({
  market,
  outcome,
  onClose,
  onPlaced,
}: {
  market: PickMarket | null;
  outcome: PickOutcome | null;
  onClose: () => void;
  onPlaced: (success: PickTradeSuccess) => void;
}) {
  const price = outcome?.probabilityPercent ?? 1;
  const economy = useEconomy();
  const [stakeOz, setStakeOz] = useState(price);
  const [submitting, setSubmitting] = useState(false);

  const balance = economy.coins;
  const shares = sharesForStake(stakeOz, price);
  const maxPayout = payoutForShares(shares);
  const canBuy = market != null && (market.status === "upcoming" || market.status === "live");
  const valid = isValidStake({ stakeOz, probabilityPercent: price, balanceOz: balance });
  const canConfirm = !submitting && canBuy && valid;
  const balanceAfter = stakeOz >= balance ? 0 : balance - stakeOz;

  function reason(): string {
    if (!canBuy) return "This market is closed.";
    if (balance < price) return "Not enough Oz Coins for one share.";
    if (stakeOz > balance) return "Stake is above your balance.";
    return `Stake must be a multiple of ${price} Oz.`;
  }

  function confirm() {
    if (!market || !outcome || !canConfirm) return;
    setSubmitting(true);
    const result = placePick({ marketId: market.id, outcomeId: outcome.id, stakeOz });
    setSubmitting(false);
    if (!result.ok) return;
    onPlaced({
      outcomeLabel: outcome.label,
      stakeOz,
      shares,
      maxPayoutOz: maxPayout,
    });
  }

  return (
    <AdaptiveDrawer
      hud
      open={Boolean(market && outcome)}
      onClose={() => { if (!submitting) onClose(); }}
      title="Buy pick"
    >
      {market && outcome ? (
        /* Focus lands on the sheet, not the stake field: opening the ticket
           should not throw a keyboard up over it. */
        <div className={styles.body} tabIndex={-1} autoFocus>
          <div className={styles.head}>
            <b className={styles.eyebrow}>BUY PICK</b>
            <PercentPill outcome={outcome} />
          </div>

          <p className={styles.question}>{market.question}</p>
          <p className={styles.terms}>
            <span>{price} OZ / SHARE</span>
            <b>PAYS {multiplierLabel(price)} IF RIGHT</b>
          </p>

          <StakeStepper value={stakeOz} step={price} max={balance} onChange={setStakeOz} />

          <ToWinHero payoutOz={maxPayout} price={price} />

          <QuickStakeRow price={price} balance={balance} stakeOz={stakeOz} onChange={setStakeOz} />

          <p className={styles.ledger}>
            {shares} {shares === 1 ? "SHARE" : "SHARES"} &middot; BALANCE AFTER{" "}
            {formatInt(balanceAfter)} OZ
          </p>

          {!canConfirm && !submitting ? <p className={styles.reason}>{reason()}</p> : null}

          <button type="button" className={styles.confirm} disabled={!canConfirm} onClick={confirm}>
            {submitting ? "CONFIRMING" : "CONFIRM PICK"}
          </button>
        </div>
      ) : null}
    </AdaptiveDrawer>
  );
}

export type PickTradeSuccess = {
  outcomeLabel: string;
  stakeOz: number;
  shares: number;
  maxPayoutOz: number;
};

function PercentPill({ outcome }: { outcome: PickOutcome }) {
  const color = liftForContrast(outcome.color ?? colors.accent.cyan, {
    against: colors.background.primary,
  });
  return (
    <span className={styles.percentPill} style={{ "--pill-color": color } as CSSProperties}>
      {outcome.label.toUpperCase()} {outcome.probabilityPercent}%
    </span>
  );
}

/** The stake, with a step of one share either way. */
function StakeStepper({
  value,
  step,
  max,
  onChange,
}: {
  value: number;
  step: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className={styles.stepper}>
      <button
        type="button"
        className={styles.stepButton}
        disabled={value <= step}
        onClick={() => onChange(Math.max(0, value - step))}
        aria-label={`Lower stake by ${step} Oz`}
      >
        &minus;
      </button>

      <span className={styles.stakeBody}>
        <small>STAKE</small>
        <span className={styles.stakeRow}>
          <BrandIcon name="coin" size={18} />
          <input
            className={styles.stakeInput}
            inputMode="numeric"
            value={String(value)}
            onChange={(event) => onChange(Number(event.target.value.replace(/\D/g, "")) || 0)}
            aria-label="Stake in Oz"
          />
        </span>
      </span>

      <button
        type="button"
        className={styles.stepButton}
        disabled={value + step > max}
        onClick={() => onChange(value + step)}
        aria-label={`Raise stake by ${step} Oz`}
      >
        +
      </button>
    </div>
  );
}

/** The hero of the ticket: what it pays if it hits, retargeting as it changes. */
function ToWinHero({ payoutOz, price }: { payoutOz: number; price: number }) {
  return (
    <div className={styles.toWin}>
      <small>TO WIN</small>
      <BrandIcon name="coin" size={16} />
      <b className={styles.toWinValue} key={payoutOz}>{formatInt(payoutOz)}</b>
      <span className={styles.multiplier}>{multiplierLabel(price)}</span>
    </div>
  );
}

/** One-tap sizing: share multiples of the price, plus an all-in MAX. */
function QuickStakeRow({
  price,
  balance,
  stakeOz,
  onChange,
}: {
  price: number;
  balance: number;
  stakeOz: number;
  onChange: (value: number) => void;
}) {
  const maxStake = balance < price ? 0 : Math.floor(balance / price) * price;
  const presets: { label: string; value: number }[] = [
    { label: "1\u00d7", value: price },
    { label: "5\u00d7", value: price * 5 },
    { label: "10\u00d7", value: price * 10 },
    { label: "MAX", value: maxStake },
  ];

  return (
    <div className={styles.quickRow}>
      {presets.map((preset) => {
        const enabled = preset.value > 0 && preset.value <= maxStake;
        const active = enabled && stakeOz === preset.value;
        return (
          <button
            key={preset.label}
            type="button"
            className={[styles.quickChip, active ? styles.quickChipActive : ""].filter(Boolean).join(" ")}
            disabled={!enabled}
            aria-pressed={active}
            onClick={() => onChange(preset.value)}
          >
            {preset.label}
          </button>
        );
      })}
    </div>
  );
}

/** "2.4×" — what a share priced at `price` Oz returns. */
export function multiplierLabel(price: number): string {
  if (price <= 0) return "\u2014";
  const multiplier = (100 / price).toFixed(2).replace(/0$/, "").replace(/\.0?$/, "");
  return `${multiplier}\u00d7`;
}
