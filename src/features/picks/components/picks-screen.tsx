"use client";

import { useState } from "react";

import { BoltIcon, FilterChips, FlashOnIcon, NoDataState, PickIcon, ScheduleIcon, SettingsIcon, TimerIcon, accentVar } from "@statoz/design-system/games";
import type { PickMarketType } from "@/domain/predictions";
import { useAuthSession } from "@/features/auth";
import { HowToPlayButton } from "@/features/how-to-play";

import {
  resetFilters,
  selectFilteredMarkets,
  selectPositionsForMarket,
  setTypeFilter,
  usePicks,
} from "../state/picks-store";
import { EditorialMarketList } from "./editorial-market-list";
import { PicksSettingsSheet } from "./picks-settings-sheet";
import { usePickTrading } from "./pick-trading";
import styles from "./picks.module.css";

const typeFilters: { id: PickMarketType | "all"; label: string }[] = [
  { id: "all", label: "ALL" },
  { id: "match", label: "MATCHES" },
  { id: "event", label: "EVENT" },
  { id: "future", label: "FUTURES" },
];

const typeFilterLabels = typeFilters.map((filter) => filter.label);

/** Every open market, filtered by type on the strip and by league in the sheet. */
export function PicksScreen() {
  const picks = usePicks();
  const session = useAuthSession();
  const markets = selectFilteredMarkets(picks);
  const [settings, setSettings] = useState(false);
  const { openTrade, claim, overlays } = usePickTrading();

  const filtered =
    picks.typeFilter !== "all" ||
    picks.leagueFilter !== "all" ||
    picks.sportFilter !== "all" ||
    picks.statusFilter !== "all";

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>ALL PICKS</h1>
        <div className={styles.headerActions}>
          <HowToPlayButton mode="pick" />
          <button
            type="button"
            className={styles.settingsButton}
            aria-label="Filter and sort picks"
            onClick={() => setSettings(true)}
          >
            <SettingsIcon size={17} />
          </button>
        </div>
      </div>

      <FilterChips
        options={typeFilterLabels}
        selected={typeFilters.find((filter) => filter.id === picks.typeFilter)?.label ?? "ALL"}
        onSelect={(label) => {
          const filter = typeFilters.find((option) => option.label === label);
          if (filter) setTypeFilter(filter.id);
        }}
        label="Pick types"
        className={styles.typeFilters}
      />

      {!picks.hydrated ? (
        <PicksSkeleton />
      ) : markets.length ? (
        <EditorialMarketList markets={markets} positionsFor={id => session.isAuthenticated ? selectPositionsForMarket(picks, id) : []} onPick={openTrade} onClaim={claim} />
      ) : filtered ? (
        <NoDataState
          icon={PickIcon}
          spark={ScheduleIcon}
          title="No picks found"
          message="Try another league, market type, or clear filters."
          action={
            <button type="button" className={styles.clearAction} onClick={resetFilters}>
              <TimerIcon size={16} aria-hidden="true" />
              CLEAR FILTERS
            </button>
          }
        />
      ) : picks.positions.length > 0 ? (
        <NoDataState
          icon={ScheduleIcon}
          spark={BoltIcon}
          title="No live picks"
          message="Fresh pick markets will appear here soon."
        />
      ) : (
        <NoDataState
          icon={PickIcon}
          spark={FlashOnIcon}
          accent={accentVar("lime")}
          title="Be the 1st to pick"
          message="No one has submitted a pick yet. Make the opening call."
        />
      )}

      <PicksSettingsSheet open={settings} onClose={() => setSettings(false)} picks={picks} />
      {overlays}
    </main>
  );
}

/** Four pulsing plates while the markets hydrate, as the app shows. */
function PicksSkeleton() {
  return (
    <div className={styles.skeleton} aria-label="Loading picks" aria-busy="true">
      {[76, 138, 138, 138].map((height, index) => (
        <span key={index} className={styles.skeletonPlate} style={{ height }} />
      ))}
    </div>
  );
}
