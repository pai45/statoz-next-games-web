"use client";

import { useState, type CSSProperties } from "react";

import {
  accentVar,
  BrandIcon,
  ChevronRightIcon,
  InteractiveLineChart,
} from "@statoz/design-system/games";
import { useEconomy, type EconomyTransaction } from "@/features/economy";
import { formatInt, formatOzCompact } from "@/shared/utils";

import { ProfileOverlay } from "./profile-overlay";
import { ProfilePanel } from "./profile-panel";
import styles from "./oz-coin-tracker.module.css";

type CoinChartRange = "all" | "week" | "day";
type CoinHistoryFilter = "all" | "earned" | "spent";

const gold = accentVar("gold");
const chartRanges: CoinChartRange[] = ["all", "week", "day"];
const historyFilters: CoinHistoryFilter[] = ["all", "earned", "spent"];

export function OzCoinTracker() {
  const economy = useEconomy();
  const [range, setRange] = useState<CoinChartRange>("all");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<CoinHistoryFilter>("all");
  const ledger = chronological(economy.transactions);
  const visibleLedger = coinLedgerForRange(ledger, range);
  const values = coinBalanceValues(economy.coins, visibleLedger);
  const activeIndex = selectedCoinChartIndex(selectedIndex, values.length);
  const earned = positiveActivity(ledger);
  const spent = negativeActivity(ledger);

  return (
    <>
      <ProfilePanel>
        <section className="p-3.5" aria-labelledby="oz-coin-tracker-title">
          <header className="flex items-center gap-2.25">
            <BrandIcon name="ozCoins" size={20} alt="" />
            <h2
              id="oz-coin-tracker-title"
              className="font-display text-base font-black leading-none tracking-label text-gold"
            >
              OZ COIN TRACKER
            </h2>
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="ml-auto flex min-h-11 cursor-pointer items-center gap-1 px-1.5 font-display text-2xs font-black tracking-ultra text-gold transition-colors hover:text-foreground"
              aria-label="Oz Coin history"
            >
              HISTORY
              <ChevronRightIcon size={16} />
            </button>
          </header>

          <div className={`${styles.rangeTabs} mt-3`} role="tablist" aria-label="Oz Coin chart range">
            {chartRanges.map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={range === item}
                data-active={range === item}
                onClick={() => {
                  setRange(item);
                  setSelectedIndex(null);
                }}
              >
                {item.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="mt-3">
            <InteractiveLineChart
              values={values}
              selectedIndex={selectedIndex}
              onSelectedIndexChange={setSelectedIndex}
              label="Oz Coin balance history"
              valueText={(value) => `${formatInt(value)} Oz Coin balance`}
              accent={gold}
              height="11rem"
            />
            <div className="mt-2.5 flex items-center justify-between">
              <span className="font-display text-micro font-black tracking-ultra text-muted">
                BALANCE
              </span>
              <strong className="ds-tabular font-display text-lg font-black leading-none text-gold">
                {formatInt(values[activeIndex])} OZ
              </strong>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <TrackerStat label="BALANCE" value={formatOzCompact(economy.coins)} />
            <TrackerStat
              label="EARNED"
              value={formatOzCompact(earned)}
              color={earned > 0 ? "var(--ds-color-success)" : undefined}
            />
            <TrackerStat
              label="SPENT"
              value={formatOzCompact(spent)}
              color={spent > 0 ? "var(--ds-color-danger)" : undefined}
            />
          </div>
        </section>
      </ProfilePanel>

      {historyOpen ? (
        <CoinHistoryOverlay
          balance={economy.coins}
          ledger={ledger}
          earned={earned}
          spent={spent}
          activeFilter={historyFilter}
          onFilterChange={setHistoryFilter}
          onClose={() => setHistoryOpen(false)}
        />
      ) : null}
    </>
  );
}

function TrackerStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className={styles.statCell}>
      <span>{label}</span>
      <strong style={{ color }}>{value}</strong>
    </div>
  );
}

function CoinHistoryOverlay({
  balance,
  ledger,
  earned,
  spent,
  activeFilter,
  onFilterChange,
  onClose,
}: {
  balance: number;
  ledger: EconomyTransaction[];
  earned: number;
  spent: number;
  activeFilter: CoinHistoryFilter;
  onFilterChange: (filter: CoinHistoryFilter) => void;
  onClose: () => void;
}) {
  const filtered = ledger
    .filter((entry) => activeFilter === "all" || (activeFilter === "earned" ? entry.delta > 0 && entry.kind !== "openingBalance" : entry.delta < 0))
    .reverse();

  return (
    <ProfileOverlay
      title="OZ COIN HISTORY"
      accent={gold}
      icon={<BrandIcon name="ozCoins" size={20} alt="" />}
      size="full"
      onClose={onClose}
    >
      <div className="flex flex-col gap-4 p-4">
        <div className="grid grid-cols-3 gap-2">
          <TrackerStat label="BALANCE" value={formatOzCompact(balance)} />
          <TrackerStat label="EARNED" value={formatOzCompact(earned)} color={earned > 0 ? "var(--ds-color-success)" : undefined} />
          <TrackerStat label="SPENT" value={formatOzCompact(spent)} color={spent > 0 ? "var(--ds-color-danger)" : undefined} />
        </div>

        <div className={styles.historyFilter} role="group" aria-label="Oz Coin history filters">
          {historyFilters.map((filter) => (
            <button
              key={filter}
              type="button"
              data-active={activeFilter === filter}
              aria-pressed={activeFilter === filter}
              onClick={() => onFilterChange(filter)}
            >
              {filter.toUpperCase()}
            </button>
          ))}
        </div>

        {filtered.length > 0 ? (
          <div className="grid gap-2">
            {filtered.map((entry) => (
              <article key={entry.id} className={styles.historyEntry}>
                <div className="min-w-0">
                  <h3>{entry.title}</h3>
                  <p>{[entry.subtitle, coinTimestamp(entry.at)].filter(Boolean).join(" · ")}</p>
                </div>
                <div className={styles.historyEntryValue}>
                  <strong style={{ color: transactionColor(entry) }}>
                    {entry.delta >= 0 ? "+" : "−"}{formatInt(Math.abs(entry.delta))}
                  </strong>
                  <span>{formatInt(entry.balanceAfter)} BAL</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="grid min-h-48 place-items-center border border-line-muted bg-surface p-6 text-center" style={{ clipPath: "var(--ds-clip-field)" }}>
            <p className="font-display text-xs font-black tracking-label text-muted">
              {ledger.length > 0 ? "NO COIN MOVES MATCH THIS FILTER" : "NO COIN HISTORY YET"}
            </p>
          </div>
        )}
      </div>
    </ProfileOverlay>
  );
}

function chronological(ledger: EconomyTransaction[]): EconomyTransaction[] {
  return [...ledger].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

function coinLedgerForRange(ledger: EconomyTransaction[], range: CoinChartRange): EconomyTransaction[] {
  if (ledger.length === 0 || range === "all") return ledger;
  const anchor = Date.parse(ledger.at(-1)?.at ?? "");
  if (!Number.isFinite(anchor)) return ledger;
  const cutoff = anchor - (range === "week" ? 7 : 1) * 24 * 60 * 60 * 1000;
  const filtered = ledger.filter((entry) => Date.parse(entry.at) >= cutoff);
  if (filtered.length >= 2 || ledger.length <= 2) return filtered.length > 0 ? filtered : ledger;
  return ledger.slice(-2);
}

function coinBalanceValues(balance: number, ledger: EconomyTransaction[]): number[] {
  return ledger.length > 0 ? ledger.map((entry) => entry.balanceAfter) : [balance];
}

function selectedCoinChartIndex(selected: number | null, pointCount: number): number {
  if (pointCount <= 1) return 0;
  if (selected === null) return pointCount - 1;
  return Math.min(Math.max(selected, 0), pointCount - 1);
}

function positiveActivity(ledger: EconomyTransaction[]): number {
  return ledger.reduce((total, entry) => total + (entry.delta > 0 && entry.kind !== "openingBalance" ? entry.delta : 0), 0);
}

function negativeActivity(ledger: EconomyTransaction[]): number {
  return ledger.reduce((total, entry) => total + (entry.delta < 0 ? Math.abs(entry.delta) : 0), 0);
}

function transactionColor(entry: EconomyTransaction): CSSProperties["color"] {
  if (entry.kind === "openingBalance") return gold;
  return entry.delta >= 0 ? "var(--ds-color-success)" : "var(--ds-color-danger)";
}

function coinTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date).toUpperCase();
}
