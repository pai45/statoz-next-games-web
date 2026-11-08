"use client";

import { useState, type ReactNode } from "react";

import { outcomeFor, type PickMarket, type PickOutcome, type PickPosition } from "@/domain/predictions";
import { useRequireAuth } from "@/features/auth";

import {
  readPicks,
  selectWinStreak,
  settleAllClaimable,
  settlePosition,
  usePicks,
} from "../state/picks-store";
import {
  PickLockedOverlay,
  PickSettlementReveal,
  revealForBatch,
  revealForPosition,
  type PickRevealData,
} from "./pick-overlays";
import { PickTradeSheet, type PickTradeSuccess } from "./pick-trade-sheet";

/**
 * Buying and claiming, wired once.
 *
 * Every pick surface — the hub, a fixture's PICKS tab, a market's own page —
 * runs the same three beats: the ticket sheet, the lock confirmation, and the
 * settlement cinematic. They share this rather than each keeping their own
 * copy, which is how the app shares `showPickTradeSheet`.
 */
export function usePickTrading(): {
  openTrade: (market: PickMarket, outcomeId: string) => void;
  claim: (position: PickPosition) => void;
  claimAll: () => void;
  overlays: ReactNode;
} {
  const requireAuth = useRequireAuth();
  const picks = usePicks();
  const [trade, setTrade] = useState<{ market: PickMarket; outcome: PickOutcome } | null>(null);
  const [locked, setLocked] = useState<PickTradeSuccess | null>(null);
  const [reveal, setReveal] = useState<PickRevealData | null>(null);

  function openTrade(market: PickMarket, outcomeId: string): void {
    if (!requireAuth({ intent: "lock a pick", message: "Log in to buy shares and save this pick." })) {
      return;
    }
    const outcome = outcomeFor(market, outcomeId);
    if (outcome) setTrade({ market, outcome });
  }

  function claim(position: PickPosition): void {
    if (!requireAuth({ intent: "claim a pick", message: "Log in to claim your pick result." })) return;
    const settled = settlePosition(position.id);
    // The coins land before the cinematic, so skipping it costs nothing.
    if (settled) setReveal(revealForPosition(settled, selectWinStreak(readPicks())));
  }

  function claimAll(): void {
    if (!requireAuth({ intent: "claim your picks", message: "Log in to claim your results." })) return;
    const result = settleAllClaimable();
    if (result.settledCount > 0) setReveal(revealForBatch(result, selectWinStreak(readPicks())));
  }

  const overlays = (
    <>
      <PickTradeSheet
        key={`${trade?.market.id ?? "closed"}:${trade?.outcome.id ?? "none"}`}
        market={trade?.market ?? null}
        outcome={trade?.outcome ?? null}
        onClose={() => setTrade(null)}
        onPlaced={(success) => {
          setTrade(null);
          setLocked(success);
        }}
      />
      <PickLockedOverlay
        success={locked}
        winStreak={selectWinStreak(picks)}
        onDone={() => setLocked(null)}
      />
      <PickSettlementReveal data={reveal} onClose={() => setReveal(null)} />
    </>
  );

  return { openTrade, claim, claimAll, overlays };
}
