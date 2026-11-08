"use client";

import Link from "next/link";

import { ChevronRightIcon, NoDataState, PickIcon, ScheduleIcon, accentVar } from "@statoz/design-system/games";
import { useAuthSession } from "@/features/auth";
import { pickMarketsForMatch } from "@/mocks/picks";

import { selectPositionsForMarket, usePicks } from "../state/picks-store";
import { PickMarketCard } from "./pick-market-card";
import { usePickTrading } from "./pick-trading";
import styles from "./picks.module.css";

/** The markets on one fixture, under the same roof as its quizzes. */
export function MatchPicksPanel({ matchId }: { matchId: string }) {
  const markets = pickMarketsForMatch(matchId);
  const picks = usePicks();
  const session = useAuthSession();
  const { openTrade, claim, overlays } = usePickTrading();

  return (
    <div className={styles.matchPanel}>
      <Link href="/picks" className={styles.matchHeader}>
        <PickIcon size={18} aria-hidden="true" />
        <span>
          <strong>VIEW ALL PICKS</strong>
          <small>Browse every open market</small>
        </span>
        <ChevronRightIcon size={20} aria-hidden="true" />
      </Link>

      {markets.length ? (
        <div className={styles.grid}>
          {markets.map((market) => (
            <PickMarketCard
              key={market.id}
              market={market}
              positions={session.isAuthenticated ? selectPositionsForMarket(picks, market.id) : []}
              onPick={openTrade}
              onClaim={claim}
            />
          ))}
        </div>
      ) : (
        <NoDataState
          icon={PickIcon}
          spark={ScheduleIcon}
          accent={accentVar("lime")}
          title="No picks for this match"
          message="Match-linked picks will appear here when markets open."
        />
      )}

      {overlays}
    </div>
  );
}
