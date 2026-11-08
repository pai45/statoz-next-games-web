"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";

import {
  ArrowRightIcon,
  BrandIcon,
  InteractiveLineChart,
  QuizIcon,
  colors,
  liftForContrast,
  readableInk,
} from "@statoz/design-system/games";
import {
  latestDeltaFor,
  leadingOutcome,
  marketCanBuy,
  payoutForShares,
  type PickMarket,
  type PickOutcome,
  type PickPosition,
} from "@/domain/predictions";
import { useAuthSession } from "@/features/auth";
import { hasLinkedFixture } from "@/mocks/picks";
import { formatInt, formatKickoffTime, formatOzCompact } from "@/shared/utils";

import {
  pickMarketStatusColor,
  pickMarketStatusLabel,
  pickMarketTypeColor,
  pickMarketTypeLabel,
  pickPositionColor,
  pickPositionLabel,
} from "../status";
import { selectPositionsForMarket, usePicks } from "../state/picks-store";
import { multiplierLabel } from "./pick-trade-sheet";
import { usePickTrading } from "./pick-trading";
import styles from "./market-detail.module.css";

/**
 * One market, in full: what it asks, where its price has been, every outcome
 * that can be backed, and the tickets already held on it.
 */
export function MarketDetailScreen({ market }: { market: PickMarket }) {
  const picks = usePicks();
  const session = useAuthSession();
  const positions = session.isAuthenticated ? selectPositionsForMarket(picks, market.id) : [];
  const held = new Set(positions.map((position) => position.outcomeId));
  const { openTrade, claim, overlays } = usePickTrading();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected =
    market.outcomes.find((outcome) => outcome.id === (selectedId ?? positions[0]?.outcomeId)) ??
    market.outcomes[0];

  return (
    <main className={styles.screen}>
      <div className={styles.body}>
        <div className={styles.column}>
          <MarketHeader market={market} />
          <OddsChart market={market} />
        </div>

        <div className={styles.column}>
          <section className={styles.section}>
            <h2 className={styles.heading}>OUTCOMES</h2>
            {market.outcomes.map((outcome) => (
              <OutcomeRow
                key={outcome.id}
                outcome={outcome}
                selected={outcome.id === selected.id}
                held={held.has(outcome.id)}
                canBuy={marketCanBuy(market)}
                onSelect={() => setSelectedId(outcome.id)}
                onBuy={() => openTrade(market, outcome.id)}
              />
            ))}
          </section>

          {positions.length === 0 ? (
            <p className={styles.noTicket}>
              <BrandIcon name="coin" size={18} />
              {marketCanBuy(market)
                ? "Pick an outcome to create your ticket."
                : "Market is closed with no ticket held."}
            </p>
          ) : (
            positions.map((position) => (
              <TicketPanel
                key={position.id}
                market={market}
                position={position}
                onClaim={() => claim(position)}
              />
            ))
          )}

          <p className={styles.rules}>
            At {selected.probabilityPercent}%, every share costs {selected.probabilityPercent} Oz
            and pays 100 Oz ({multiplierLabel(selected.probabilityPercent)}) if correct.
          </p>

          {hasLinkedFixture(market) ? (
            <Link href={`/matches/${market.matchId}`} className={styles.quizCta}>
              <QuizIcon size={16} aria-hidden="true" />
              PREDICTION QUIZ
              <ArrowRightIcon size={16} aria-hidden="true" className={styles.ctaArrow} />
            </Link>
          ) : null}
        </div>
      </div>

      {overlays}
    </main>
  );
}

/** The market's identity, its leading price, and the two numbers framing it. */
function MarketHeader({ market }: { market: PickMarket }) {
  const leader = leadingOutcome(market);
  const leaderColor = liftForContrast(leader.color ?? colors.accent.cyan, {
    against: colors.background.primary,
  });
  const delta = latestDeltaFor(market, leader.id);

  return (
    <header className={styles.marketHeader}>
      <div className={styles.pills}>
        <Pill label={pickMarketTypeLabel(market.type)} color={pickMarketTypeColor(market.type)} />
        <Pill
          label={pickMarketStatusLabel(market.status)}
          color={pickMarketStatusColor(market.status)}
        />
        <span className={styles.league}>{market.leagueLabel}</span>
      </div>

      <h2 className={styles.question}>{market.question}</h2>

      <div className={styles.leading}>
        <b className={styles.leadingValue} style={{ color: leaderColor }}>
          {leader.probabilityPercent}%
        </b>
        <span className={styles.leadingCopy}>
          <strong>{leader.label.toUpperCase()}</strong>
          <small>CHANCE</small>
        </span>
        {delta != null && delta !== 0 ? (
          <span
            className={styles.deltaChip}
            style={
              {
                "--delta": delta > 0 ? "var(--ds-color-success)" : "var(--ds-color-danger)",
              } as CSSProperties
            }
          >
            {delta > 0 ? "▲" : "▼"} {Math.abs(delta)} TODAY
          </span>
        ) : null}
      </div>

      {market.homeLabel && market.awayLabel ? (
        <div className={styles.scoreContext}>
          <ScoreRow label={market.homeLabel} score={market.homeScore} />
          <ScoreRow label={market.awayLabel} score={market.awayScore} />
          {market.contextSubtitle ? <small>{market.contextSubtitle}</small> : null}
        </div>
      ) : (
        <p className={styles.context}>
          {[market.contextTitle, market.contextSubtitle].filter(Boolean).join(" · ")}
        </p>
      )}

      <div className={styles.metrics}>
        <Metric label="VOLUME" value={`${formatOzCompact(market.volumeOz)} Oz`} />
        <Metric
          label="CLOSES"
          value={market.closesAt ? formatKickoffTime(market.closesAt) : "—"}
        />
      </div>
    </header>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span className={styles.pill} style={{ "--pill-color": color } as CSSProperties}>
      {label}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span className={styles.metric}>
      <small>{label}</small>
      <b>{value}</b>
    </span>
  );
}

function ScoreRow({ label, score }: { label: string; score?: string }) {
  return (
    <span className={styles.scoreRow}>
      <strong>{label}</strong>
      <b>{score ?? "-"}</b>
    </span>
  );
}

/** A backable outcome: its share of the market, its price, and the buy. */
function OutcomeRow({
  outcome,
  selected,
  held,
  canBuy,
  onSelect,
  onBuy,
}: {
  outcome: PickOutcome;
  selected: boolean;
  held: boolean;
  canBuy: boolean;
  onSelect: () => void;
  onBuy: () => void;
}) {
  const color = liftForContrast(outcome.color ?? colors.accent.cyan, {
    against: colors.background.primary,
  });

  return (
    <div
      className={[styles.outcomeRow, selected ? styles.outcomeSelected : ""]
        .filter(Boolean)
        .join(" ")}
      style={{ "--outcome-color": color, "--outcome-ink": readableInk(color) } as CSSProperties}
    >
      <button
        type="button"
        className={styles.outcomeSelect}
        onClick={onSelect}
        aria-pressed={selected}
      >
        <span className={styles.outcomeName}>
          <strong>{outcome.label}</strong>
          {held ? <em className={styles.backed}>BACKED</em> : null}
        </span>
        <span className={styles.outcomeMeter} aria-hidden>
          <i style={{ width: `${outcome.probabilityPercent}%` }} />
        </span>
      </button>

      <b className={styles.outcomePercent}>{outcome.probabilityPercent}%</b>

      <button type="button" className={styles.buyButton} disabled={!canBuy} onClick={onBuy}>
        {canBuy ? "BUY" : "LOCKED"}
      </button>
    </div>
  );
}

/** A ticket held on this market, and the claim once its result lands. */
function TicketPanel({
  market,
  position,
  onClaim,
}: {
  market: PickMarket;
  position: PickPosition;
  onClaim: () => void;
}) {
  const color = pickPositionColor(position.status);
  const final =
    position.status === "won" || position.status === "lost" || position.status === "voided";
  const profit = position.payoutOz - position.stakeOz;

  return (
    <section className={styles.ticket} style={{ "--ticket-color": color } as CSSProperties}>
      <div className={styles.ticketTop}>
        <b>YOUR TICKET</b>
        <span>{pickPositionLabel(position.status)}</span>
      </div>
      <strong className={styles.ticketOutcome}>{position.outcomeLabel}</strong>
      <div className={styles.ticketMetrics}>
        <Metric label="STAKE" value={`${position.stakeOz} Oz`} />
        <Metric label="SHARES" value={String(position.shareCount)} />
        <Metric label="MAX PAYOUT" value={`${payoutForShares(position.shareCount)} Oz`} />
      </div>

      {position.status === "settleable" ? (
        <button type="button" className={styles.claimButton} onClick={onClaim}>
          <BrandIcon name="coin" size={16} />
          {market.status === "voided" ? "CLAIM REFUND" : "REVEAL RESULT"}
        </button>
      ) : final ? (
        <p className={styles.ticketResult}>
          {position.status === "won"
            ? `+${formatInt(profit)} Oz profit`
            : position.status === "voided"
              ? "Stake refunded"
              : `${position.stakeOz} Oz spent`}
        </p>
      ) : null}
    </section>
  );
}

const ranges = ["ALL", "WEEK", "DAY"] as const;
type Range = (typeof ranges)[number];

/**
 * Where the price has been. The three leading outcomes each get a line, and
 * the lines are stepped: a price holds until the next trade moves it.
 */
function OddsChart({ market }: { market: PickMarket }) {
  const [range, setRange] = useState<Range>("ALL");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const history = useMemo(
    () => historyForRange(market.priceHistory ?? [], range),
    [market.priceHistory, range],
  );

  const series = useMemo(
    () =>
      [...market.outcomes]
        .sort((a, b) => b.probabilityPercent - a.probabilityPercent)
        .slice(0, 3)
        .map((outcome, index) => ({
          id: outcome.id,
          label: outcome.label,
          color: liftForContrast(outcome.color ?? colors.accent.cyan, {
            against: colors.background.primary,
          }),
          fill: index === 0,
          values: history.length
            ? history.map(
                (point) => point.percentsByOutcome[outcome.id] ?? outcome.probabilityPercent,
              )
            : [outcome.probabilityPercent],
        })),
    [market.outcomes, history],
  );

  const points = series[0]?.values.length ?? 1;
  const active = Math.min(selectedIndex ?? points - 1, points - 1);

  return (
    <section className={styles.chartPanel}>
      <div className={styles.chartTop}>
        <h2 className={styles.heading}>MARKET ODDS</h2>
        <small className={styles.chartCaption}>{history.length} BETS</small>
      </div>

      <div className={styles.rangeRow}>
        {ranges.map((item) => (
          <button
            key={item}
            type="button"
            className={`${styles.rangeChip} ${range === item ? styles.rangeChipActive : ""}`}
            aria-pressed={range === item}
            onClick={() => {
              setRange(item);
              setSelectedIndex(null);
            }}
          >
            <span>{item}</span>
          </button>
        ))}
      </div>

      <InteractiveLineChart
        series={series}
        stepped
        scale={{ min: 0, max: 100 }}
        selectedIndex={selectedIndex}
        onSelectedIndexChange={setSelectedIndex}
        label={`${market.question} odds history`}
        valueText={(value) => `${series[0]?.label ?? "Leader"} ${value} percent`}
        height="8.25rem"
      />

      <ul className={styles.legend}>
        {series.map((line) => (
          <li key={line.id} style={{ "--line-color": line.color } as CSSProperties}>
            <i aria-hidden />
            {line.label}
            <b>{line.values[Math.min(active, line.values.length - 1)]}%</b>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A price history trimmed to a range, never below the two points a line needs. */
function historyForRange(
  history: NonNullable<PickMarket["priceHistory"]>,
  range: Range,
): NonNullable<PickMarket["priceHistory"]> {
  if (history.length === 0 || range === "ALL") return history;
  const anchor = Date.parse(history[history.length - 1].at);
  const cutoff = anchor - (range === "WEEK" ? 7 : 1) * 86_400_000;
  const filtered = history.filter((point) => Date.parse(point.at) >= cutoff);
  if (filtered.length >= 2) return filtered;
  return history.length <= 2 ? history : history.slice(-2);
}
