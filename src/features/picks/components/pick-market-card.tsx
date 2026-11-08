"use client";

import Link from "next/link";
import { EditorialEventsPanel, EditorialMarketCard } from "@/features/matches/components/editorial-discovery";
import type { CSSProperties } from "react";

import {
  CheckIcon,
  FixturePanel,
  FixtureStrip,
  PremiumIcon,
  colors,
  liftForContrast,
  readableInk,
} from "@statoz/design-system/games";
import {
  latestDeltaFor,
  marketCanBuy,
  type PickMarket,
  type PickOutcome,
  type PickPosition,
} from "@/domain/predictions";
import { matchDemoAnchor } from "@/mocks/matches";
import { pickLeagueColor } from "@/mocks/picks";
import { useDemoNow } from "@/shared/hooks";
import { formatOzCompact } from "@/shared/utils";

import {
  pickClosesLabel,
  pickLeagueCode,
  pickMarketStatusColor,
  pickMarketStatusLabel,
  pickMarketTypeLabel,
  pickOutcomeCode,
} from "../status";
import styles from "./picks.module.css";

/**
 * One pick market, on the shared fixture surface so a market and a fixture read
 * as the same hardware: the league mark and the market type over the question,
 * the outcomes as filled team-badge buttons, and a strip that says what the
 * player holds.
 */
export function PickMarketCard({
  market,
  positions = [],
  onPick,
  onClaim,
}: {
  market: PickMarket;
  positions?: PickPosition[];
  onPick?: (market: PickMarket, outcomeId: string) => void;
  onClaim?: (position: PickPosition) => void;
}) {
  if (market.sport !== "tennis") return market.type === "event" ? <EditorialEventsPanel markets={[market]} /> : <EditorialMarketCard market={market} positions={positions} onPick={onPick} onClaim={onClaim} />;
  // A future scrolls every candidate; every other market shows three and
  // counts the rest on its strip, as the app does.
  const isFuture = market.type === "future";
  const outcomes = isFuture ? market.outcomes : market.outcomes.slice(0, 3);
  const canBuy = marketCanBuy(market);
  const claimable = positions.find((position) => position.status === "settleable");
  // A match market names the two sides instead of asking the question.
  const teamsLine =
    market.type === "match" && market.homeLabel != null && market.awayLabel != null && outcomes.length >= 2;
  const context = contextLine(market);

  return (
    <FixturePanel
      className={styles.card}
      bodyClassName={styles.cardBody}
      as="article"
      tag={<StatusTag market={market} />}
      strip={
        <>
          <ShareBar outcomes={market.outcomes} />
          <Strip market={market} positions={positions} claimable={claimable} onClaim={onClaim} />
        </>
      }
    >
      <div className={styles.cardTop}>
        <span
          className={styles.leagueMark}
          style={{ "--league-color": pickLeagueColor(market.leagueId) } as CSSProperties}
        >
          {pickLeagueCode(market.leagueLabel)}
        </span>
        <span className={styles.typePill}>{pickMarketTypeLabel(market.type)}</span>
      </div>

      {teamsLine ? (
        <Link href={`/picks/${market.id}`} className={styles.teamsLine}>
          <span>{outcomes[0].label}</span>
          <span>{outcomes[outcomes.length - 1].label}</span>
        </Link>
      ) : (
        <>
          <Link href={`/picks/${market.id}`} className={styles.questionLink}>
            {market.question}
          </Link>
          {context ? <p className={styles.contextLine}>{context}</p> : null}
        </>
      )}

      <div
        className={[styles.outcomes, isFuture ? styles.outcomeRail : ""]
          .filter(Boolean)
          .join(" ")}
      >
        {outcomes.map((outcome) => (
          <OutcomeBadge
            key={outcome.id}
            market={market}
            outcome={outcome}
            held={positions.some((position) => position.outcomeId === outcome.id)}
            onPick={canBuy ? () => onPick?.(market, outcome.id) : undefined}
          />
        ))}
      </div>
    </FixturePanel>
  );
}

/**
 * The tag in the card's top notch, reading against the page rather than the
 * card: a live pulse, the countdown to close, or the settled status.
 */
function StatusTag({ market }: { market: PickMarket }) {
  // The shared demo clock, so the countdown cannot disagree with the server
  // render, which has no idea what time it is on the client.
  const now = useDemoNow(matchDemoAnchor);

  if (market.status === "live") {
    const label = market.liveLabel == null || market.liveLabel === "LIVE" ? "LIVE" : `LIVE ${market.liveLabel}`;
    return (
      <span className={styles.statusLive}>
        <i aria-hidden className={styles.liveDot} />
        {label}
      </span>
    );
  }

  if (marketCanBuy(market) && market.closesAt != null && now != null) {
    const label = `CLOSES ${pickClosesLabel(market.closesAt, now)}`;
    // A season away counts in hundreds of days; the app scales such a tag down
    // to the notch rather than letting it break out of it.
    return (
      <span
        className={[styles.statusCloses, label.length > 10 ? styles.statusClosesLong : ""]
          .filter(Boolean)
          .join(" ")}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      className={styles.statusTag}
      style={{ "--status-color": pickMarketStatusColor(market.status) } as CSSProperties}
    >
      {pickMarketStatusLabel(market.status)}
    </span>
  );
}

/** The line under the question: the live score, or the market's own context. */
function contextLine(market: PickMarket): string | null {
  if (market.homeLabel != null && market.awayLabel != null) {
    if (market.homeScore == null && market.awayScore == null) return null;
    return `${market.homeLabel} ${market.homeScore ?? "-"}  —  ${market.awayScore ?? "-"} ${market.awayLabel}`;
  }
  return [market.contextTitle, market.contextSubtitle].filter(Boolean).join(" · ") || null;
}

/**
 * A filled outcome button in the team-badge style: the octagon face in the
 * outcome's colour over a hard darker base, the side's code, and its price.
 */
function OutcomeBadge({
  market,
  outcome,
  held,
  onPick,
}: {
  market: PickMarket;
  outcome: PickOutcome;
  held: boolean;
  onPick?: () => void;
}) {
  // The side's own colour, kept clear of the card it sits on, with whichever
  // ink reads on what that leaves. A closed market's badges go muted.
  const fill = onPick
    ? liftForContrast(outcome.color ?? colors.accent.cyan, { against: colors.fixture.base })
    : colors.text.muted;
  const delta = latestDeltaFor(market, outcome.id);
  const moved = delta != null && Math.abs(delta) >= 2;

  return (
    <button
      type="button"
      className={[styles.outcome, held ? styles.outcomeHeld : ""].filter(Boolean).join(" ")}
      style={{ "--outcome-color": fill, "--outcome-ink": readableInk(fill) } as CSSProperties}
      disabled={!onPick}
      onClick={onPick}
      aria-label={`Back ${outcome.label} at ${outcome.probabilityPercent} percent`}
    >
      <span aria-hidden className={styles.outcomeBase} />
      <span className={styles.outcomeFace}>
        <b className={styles.outcomeCode}>{pickOutcomeCode(outcome.label)}</b>
        <span className={styles.outcomePrice}>
          {moved ? (
            <i className={styles.outcomeDelta}>
              {delta > 0 ? "\u25B2" : "\u25BC"}
              {Math.abs(delta)}
            </i>
          ) : null}
          {outcome.probabilityPercent}%
        </span>
      </span>
    </button>
  );
}

/** The outcomes' shares, as one hairline split across the card's foot. */
function ShareBar({ outcomes }: { outcomes: PickOutcome[] }) {
  const total = outcomes.reduce((sum, outcome) => sum + outcome.probabilityPercent, 0);
  if (total <= 0) return null;
  return (
    <span className={styles.shareBar} aria-hidden>
      {outcomes.map((outcome) => (
        <i
          key={outcome.id}
          style={{
            flexGrow: outcome.probabilityPercent,
            background: liftForContrast(outcome.color ?? colors.accent.cyan, {
              against: colors.fixture.base,
            }),
          }}
        />
      ))}
    </span>
  );
}

/**
 * The strip's three states: a result waiting to be claimed, what the player
 * already holds, or just the market's volume.
 */
function Strip({
  market,
  positions,
  claimable,
  onClaim,
}: {
  market: PickMarket;
  positions: PickPosition[];
  claimable?: PickPosition;
  onClaim?: (position: PickPosition) => void;
}) {
  const volume = `VOL ${formatOzCompact(market.volumeOz)} OZ`;

  if (claimable) {
    return (
      <FixtureStrip
        focal
        onClick={() => onClaim?.(claimable)}
        aria-label={`Claim ${claimable.outcomeLabel} on ${market.question}`}
      >
        <PremiumIcon size={14} aria-hidden="true" style={{ color: "var(--ds-color-accent-gold)" }} />
        <b className={styles.stripClaim}>RESULT READY &mdash; TAP TO CLAIM</b>
      </FixtureStrip>
    );
  }

  if (positions.length > 0) {
    const staked = positions.reduce((sum, position) => sum + position.stakeOz, 0);
    const held =
      positions.length === 1
        ? `${pickOutcomeCode(positions[0].outcomeLabel)} \u00b7 ${staked} OZ`
        : `${positions.length} PICKS \u00b7 ${staked} OZ`;
    return (
      <FixtureStrip>
        <CheckIcon size={13} aria-hidden="true" style={{ color: "var(--ds-color-accent-cyan)" }} />
        <b className={styles.stripHeld}>{held}</b>
        <span className={styles.stripVolume}>{volume}</span>
      </FixtureStrip>
    );
  }

  const more =
    market.type !== "future" && market.outcomes.length > 3
      ? `${market.outcomes.length - 3} MORE \u00b7 `
      : "";
  return (
    <FixtureStrip>
      <span className={`${styles.stripVolume} ml-auto`}>{`${more}${volume}`}</span>
    </FixtureStrip>
  );
}
