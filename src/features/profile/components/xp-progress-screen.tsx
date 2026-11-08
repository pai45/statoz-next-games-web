"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useMemo,
  useState,
  type CSSProperties,
} from "react";

import {
  accentVar,
  ChevronLeftIcon,
  Glyph,
  InteractiveLineChart,
  Progress,
  ShowChartIcon,
  type GlyphName,
} from "@statoz/design-system/games";
import {
  matchesXpFilter,
  progressTracks,
  selectedXpChartIndex,
  trackShortLabels,
  xpBalanceValues,
  xpLedgerForRange,
  type ProgressTrack,
  type XpChartRange,
  type XpHistoryFilter,
  type XpLedgerEntry,
  type XpTransactionSource,
} from "@/domain/progression";
import { AuthBoundary } from "@/features/auth";

import { usePlayerProgress } from "../state/player-progress";
import { useXpLedger } from "../state/xp-ledger";
import { ProfilePanel } from "./profile-panel";

import styles from "./xp-progress.module.css";

const cyan = accentVar("cyan");
const ranges: XpChartRange[] = ["all", "week", "day"];
const filters: XpHistoryFilter[] = [
  "all",
  "earned",
  "lost",
  "games",
  "rewards",
];

const sourceIcons: Record<XpTransactionSource, GlyphName> = {
  openingBalance: "history",
  match: "sports_soccer",
  shootout: "stadium",
  prediction: "insights",
  pack: "collections_bookmark",
  dailyDrop: "star_outline",
  streakReward: "local_fire_department",
  cardUnlock: "style",
  quiz: "psychology",
  footballChess: "grid_on",
  grandPrix: "sports_motorsports",
  superOver: "sports_cricket",
  basketball: "sports_basketball",
  tennis: "sports_tennis",
  finalOver: "sports_cricket",
  guessPlayer: "person_search",
  bingo: "grid_view",
};

export type XpProgressScreenProps = {
  initialTrack?: ProgressTrack;
};

export function XpProgressScreen({ initialTrack }: XpProgressScreenProps) {
  const searchParams = useSearchParams();
  const requestedTrack = searchParams.get("track");
  const resolvedTrack =
    (initialTrack === "prediction" ? undefined : initialTrack) ?? progressTracks.find((track) => track === requestedTrack && track !== "prediction");

  return (
    <AuthBoundary allowGuest
      intent="view your XP progress"
      message="Log in to review your XP level, tracks, and activity."
      returnTo="/profile/xp"
    >
      <XpProgressDashboard initialTrack={resolvedTrack} />
    </AuthBoundary>
  );
}

function XpProgressDashboard({ initialTrack }: XpProgressScreenProps) {
  const progress = usePlayerProgress();
  const ledger = useXpLedger(progress.xpByTrack);
  const [range, setRange] = useState<XpChartRange>("all");
  const [filter, setFilter] = useState<XpHistoryFilter>("all");
  const [track, setTrack] = useState<ProgressTrack | null>(initialTrack ?? null);

  const sorted = useMemo(
    () => [...ledger].filter(entry => entry.track !== "prediction" && entry.source !== "prediction").sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)),
    [ledger],
  );
  const filtered = sorted.filter(
    (entry) => matchesXpFilter(entry, filter) && (track === null || entry.track === track),
  );
  const earned = sorted
    .filter((entry) => entry.delta > 0 && entry.type !== "openingBalance")
    .reduce((sum, entry) => sum + entry.delta, 0);
  const lost = sorted
    .filter((entry) => entry.delta < 0)
    .reduce((sum, entry) => sum + Math.abs(entry.delta), 0);

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/profile" className={styles.back} aria-label="Back to profile">
            <ChevronLeftIcon size={22} />
          </Link>
          <h1>XP PROGRESS</h1>
        </header>

        <main className={styles.main}>
          <div className={styles.dashboard}>
            <section className={styles.levelArea} aria-labelledby="current-level-heading">
              <LevelSummary progress={progress} />
            </section>

            <section className={styles.chartArea} aria-labelledby="xp-history-heading">
              <ProfilePanel>
                <div className={styles.chartCard}>
                  <div className={styles.sectionTitle}>
                    <ShowChartIcon size={20} />
                    <h2 id="xp-history-heading">XP HISTORY</h2>
                  </div>
                  <RangeTabs active={range} onChange={setRange} />
                  <XpBalanceChart totalXp={progress.totalXp} ledger={sorted} range={range} />
                </div>
              </ProfilePanel>
            </section>

            <section className={styles.statsArea} aria-label="XP totals">
              <StatCell label="EARNED" value={grouped(earned)} color={earned > 0 ? "var(--ds-color-success)" : undefined} />
              <StatCell label="LOST" value={grouped(lost)} color={lost > 0 ? "var(--ds-color-danger)" : undefined} />
              <StatCell
                label="NET"
                value={signed(earned - lost)}
                color={earned - lost >= 0 ? "var(--ds-color-success)" : "var(--ds-color-danger)"}
              />
            </section>

            <div className={styles.filtersArea}>
              <FilterBar
                label="XP activity filters"
                items={filters}
                active={filter}
                counts={Object.fromEntries(
                  filters.map((item) => [item, sorted.filter((entry) => matchesXpFilter(entry, item)).length]),
                )}
                getLabel={(item) => item.toUpperCase()}
                onSelect={setFilter}
              />
              {progress.tracks.filter(item => item !== "prediction").length > 0 ? (
                <div className={styles.trackFilters}>
                  <FilterBar
                    label="XP track filters"
                    items={progress.tracks.filter(item => item !== "prediction")}
                    active={track}
                    counts={Object.fromEntries(
                      progress.tracks.map((item) => [item, sorted.filter((entry) => entry.track === item).length]),
                    )}
                    getLabel={(item) => trackShortLabels[item]}
                    onSelect={(item) => setTrack((current) => current === item ? null : item)}
                  />
                </div>
              ) : null}
            </div>

            <section className={styles.feedArea} aria-label="XP activity">
              {filtered.length === 0 ? (
                <p className={styles.empty}>
                  {sorted.length > 0
                    ? "No XP changes match this filter."
                    : "No XP activity yet. Play a game to start your journey."}
                </p>
              ) : (
                <div className={styles.feed}>
                  {filtered.map((entry) => <XpHistoryTile key={entry.id} entry={entry} />)}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function LevelSummary({ progress }: { progress: ReturnType<typeof usePlayerProgress> }) {
  const { band } = progress;
  return (
    <ProfilePanel>
      <div className={styles.levelCard}>
        <div className={styles.levelTop}>
          <div>
            <p id="current-level-heading" className={styles.kicker}>CURRENT LEVEL</p>
            <strong className={styles.level}>{band.level}</strong>
          </div>
          <div className={styles.levelMeta}>
            <p>{grouped(progress.totalXp)} TOTAL XP</p>
            <strong>{grouped(band.toNextLevel)} XP TO LEVEL {band.level + 1}</strong>
          </div>
        </div>
        <Progress
          value={band.fraction}
          accent={cyan}
          label={`${band.intoLevel} of ${band.levelSpan} XP into level ${band.level}`}
          height={6}
        />
        <div className={styles.progressLabels}>
          <span>{grouped(band.intoLevel)} XP</span>
          <span>{grouped(band.levelSpan)} XP</span>
        </div>
      </div>
    </ProfilePanel>
  );
}

function RangeTabs({ active, onChange }: { active: XpChartRange; onChange: (range: XpChartRange) => void }) {
  return (
    <div className={styles.rangeTabs} role="tablist" aria-label="XP history range">
      {ranges.map((range) => (
        <button
          key={range}
          type="button"
          role="tab"
          aria-selected={active === range}
          data-active={active === range}
          onClick={() => onChange(range)}
        >
          {range.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function XpBalanceChart({ totalXp, ledger, range }: { totalXp: number; ledger: XpLedgerEntry[]; range: XpChartRange }) {
  const [selected, setSelected] = useState<number | null>(null);
  const entries = xpLedgerForRange(ledger, range);
  const values = xpBalanceValues(totalXp, entries);
  const selectedIndex = selectedXpChartIndex(selected, values.length);

  return (
    <div className={styles.chart}>
      <InteractiveLineChart
        values={values}
        selectedIndex={selected}
        onSelectedIndexChange={setSelected}
        label="Selected XP history point"
        valueText={(value) => `${grouped(value)} total XP`}
        height="clamp(11rem, 22vw, 14rem)"
      />
      <div className={styles.chartValue}>
        <span>TOTAL XP</span>
        <strong>{grouped(values[selectedIndex])}</strong>
      </div>
    </div>
  );
}

function StatCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className={styles.statCell}>
      <span className={styles.statLabel}>{label}</span>
      <strong style={{ color }}>{value}</strong>
    </div>
  );
}

function FilterBar<T extends string>({ label, items, active, counts, getLabel, onSelect }: {
  label: string;
  items: T[];
  active: T | null;
  counts: Record<string, number>;
  getLabel: (item: T) => string;
  onSelect: (item: T) => void;
}) {
  return (
    <div className={styles.filterScroller} role="group" aria-label={label}>
      {items.map((item) => {
        const isActive = item === active;
        return (
          <button
            key={item}
            type="button"
            data-active={isActive}
            aria-pressed={isActive}
            onClick={() => onSelect(item)}
          >
            <span>{getLabel(item)}</span>
            <span className={styles.filterCount}>{counts[item] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}

function XpHistoryTile({ entry }: { entry: XpLedgerEntry }) {
  const opening = entry.type === "openingBalance";
  const positive = entry.delta >= 0;
  const color = opening ? cyan : positive ? "var(--ds-color-success)" : "var(--ds-color-danger)";
  return (
    <article className={styles.entry}>
      <span
        className={styles.entryIcon}
        style={{ "--entry-color": color } as CSSProperties}
        aria-hidden
      >
        <Glyph name={opening ? "history" : sourceIcons[entry.source]} size={19} />
      </span>
      <div className={styles.entryCopy}>
        <h2>{entry.title}</h2>
        <p>{[entry.details, timestampLabel(entry.timestamp)].filter(Boolean).join(" · ")}</p>
      </div>
      <div className={styles.entryValue}>
        <strong style={{ color }}>{entry.delta >= 0 ? "+" : "−"}{grouped(Math.abs(entry.delta))}</strong>
        <span>{grouped(entry.balanceAfter)} XP</span>
      </div>
    </article>
  );
}

const timestampFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function timestampLabel(timestamp: string): string {
  return timestampFormatter.format(new Date(timestamp)).replace(",", "").toUpperCase();
}

function grouped(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function signed(value: number): string {
  return `${value >= 0 ? "+" : "−"}${grouped(Math.abs(value))}`;
}
