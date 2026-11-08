"use client";

import { AdaptiveDrawer, FilterChips } from "@statoz/design-system/games";

import {
  setLeagueFilter,
  setPickSort,
  setStatusFilter,
  type PicksSnapshot,
  type PickSort,
  type PickStatusFilter,
} from "../state/picks-store";
import styles from "./picks.module.css";

/**
 * The market filters, on the sheet the app puts them on: league, status, and
 * the sort — chips only, so the whole thing reads at a glance.
 *
 * The type filter is not here; it lives on the strip above the list.
 */
export function PicksSettingsSheet({
  open,
  onClose,
  picks,
}: {
  open: boolean;
  onClose: () => void;
  picks: PicksSnapshot;
}) {
  return (
    <AdaptiveDrawer hud open={open} onClose={onClose} title="Market filters">
      <div className={styles.settingsBody}>
        <b className={styles.settingsTitle}>MARKET FILTERS</b>

        <ChipGroup
          label="LEAGUE"
          value={picks.leagueFilter}
          options={[
            ["all", "ALL"],
            ["ipl", "IPL"],
            ["epl", "EPL"],
            ["fifa", "FIFA"],
            ["nba", "NBA"],
            ["laliga", "LALIGA"],
            ["serie-a", "SERIE A"],
          ]}
          onChange={setLeagueFilter}
        />

        <ChipGroup
          label="STATUS"
          value={picks.statusFilter}
          options={[
            ["all", "ALL"],
            ["open", "OPEN"],
            ["closed", "CLOSED"],
          ]}
          onChange={(value) => setStatusFilter(value as PickStatusFilter)}
        />

        <ChipGroup
          label="SORT BY"
          value={picks.sort}
          options={[
            ["new", "NEW"],
            ["start", "START TIME"],
            ["closing", "CLOSING"],
            ["volume", "VOLUME"],
            ["trending", "TRENDING"],
          ]}
          onChange={(value) => setPickSort(value as PickSort)}
        />
      </div>
    </AdaptiveDrawer>
  );
}

function ChipGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  const labels = options.map(([, text]) => text);
  const selectedLabel = options.find(([id]) => id === value)?.[1] ?? labels[0];

  return (
    <section className={styles.settingsGroup}>
      <h3 className={styles.settingsLabel}>{label}</h3>
      <FilterChips
        options={labels}
        selected={selectedLabel}
        onSelect={(selected) => {
          const option = options.find(([, text]) => text === selected);
          if (option) onChange(option[0]);
        }}
        label={`${label} filters`}
        className={styles.marketFilterChips}
      />
    </section>
  );
}
