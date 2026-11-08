"use client";

import type { ComponentType, CSSProperties, ReactNode } from "react";

import { NoDataState, SignalOffIcon, accentVar, type IconProps } from "@statoz/design-system/games";
import type { MatchDetailStat, MatchIntel, MatchPulse, SportMatch } from "@/domain/matches";

import styles from "./match-stats.module.css";

/**
 * Shared furniture for the per-sport STATS views, built on the pick market's
 * language so a match report and a pick market read as the same surface.
 */

/** Whose colour a figure takes. */
export function sideColor(match: SportMatch, side: "home" | "away" | "gold"): string {
  if (side === "gold") return accentVar("gold");
  const team = side === "home" ? match.home : match.away;
  return team.secondaryTextColor ?? team.color;
}

/**
 * The hero block at the top of every report: the match's single most
 * interesting number, sized like the market detail's leading-probability
 * treatment.
 */
export function MatchPulseHeader({
  match,
  title,
  pulse,
}: {
  match: SportMatch;
  title: string;
  pulse: MatchPulse;
}) {
  const statusColor =
    match.status === "live"
      ? "var(--ds-color-danger)"
      : match.status === "finished"
        ? accentVar("cyan")
        : accentVar("gold");
  const heroColor = sideColor(match, pulse.side);

  return (
    <header className={styles.pulse}>
      <div className={styles.pulseTop}>
        <StatPill label={match.sport.toUpperCase()} color={accentVar("violet")} />
        <StatPill label={pulse.statusLabel} color={statusColor} />
        <span className={styles.pulseLeague}>{match.leagueId.toUpperCase()}</span>
      </div>

      <h2 className={styles.pulseTitle}>{title}</h2>

      <div className={styles.pulseFigure}>
        <b className={styles.pulseValue} style={{ color: heroColor }}>{pulse.value}</b>
        <span className={styles.pulseCopy}>
          <strong>{pulse.label.toUpperCase()}</strong>
          <small>{pulse.caption.toUpperCase()}</small>
        </span>
        {pulse.delta != null && pulse.delta !== 0 ? (
          <DeltaChip value={pulse.delta} suffix={pulse.deltaSuffix} decimals={pulse.deltaDecimals ?? 0} />
        ) : null}
      </div>

      <p className={styles.pulseSubtitle}>{pulse.subtitle}</p>

      <div className={styles.pulseMetrics}>
        {pulse.metrics.map((metric) => (
          <MiniMetric key={metric.label} label={metric.label} value={metric.value} gold={metric.gold} />
        ))}
      </div>
    </header>
  );
}

export function StatPill({ label, color }: { label: string; color: string }) {
  return (
    <span className={styles.statPill} style={{ "--pill-color": color } as CSSProperties}>
      {label}
    </span>
  );
}

export function MiniMetric({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <span className={styles.miniMetric}>
      <small>{label}</small>
      <b style={gold ? { color: accentVar("gold") } : undefined}>{value}</b>
    </span>
  );
}

export function DeltaChip({
  value,
  suffix,
  decimals = 0,
}: {
  value: number;
  suffix?: string;
  decimals?: number;
}) {
  const up = value > 0;
  const color = up ? "var(--ds-color-success)" : "var(--ds-color-danger)";
  return (
    <span className={styles.deltaChip} style={{ "--delta-color": color } as CSSProperties}>
      {up ? "▲" : "▼"} {Math.abs(value).toFixed(decimals)}
      {suffix ? ` ${suffix}` : ""}
    </span>
  );
}

export function SectionHeading({ label }: { label: string }) {
  return <h3 className={styles.sectionHeading}>{label}</h3>;
}

/**
 * The flat data surface every stat row, event card and roster row sits on —
 * the market detail's outcome-row container. Tinting is opt-in, and it never
 * glows.
 */
export function StatsRow({
  accent,
  selected = false,
  onSelect,
  className,
  children,
}: {
  accent?: string;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
  children: ReactNode;
}) {
  // An untinted row keeps the neutral edge at full strength; a tinted one
  // shows its accent at 40%, as the app's shell does.
  const style = {
    "--row-accent": accent ?? "var(--ds-color-border-default)",
    "--row-edge": accent ? undefined : "var(--ds-color-border-default)",
  } as CSSProperties;
  const classes = [styles.statsRow, selected ? styles.statsRowSelected : "", className]
    .filter(Boolean)
    .join(" ");

  if (!onSelect) {
    return <div className={classes} style={style}>{children}</div>;
  }
  return (
    <button type="button" className={classes} style={style} onClick={onSelect} aria-pressed={selected}>
      {children}
    </button>
  );
}

/**
 * One home-vs-away metric, shaped like a market outcome row: the two values as
 * big tabular figures either side of the label, over a meter split at the home
 * side's share.
 */
export function StatComparisonRow({
  stat,
  homeColor,
  awayColor,
  selected,
  onSelect,
}: {
  stat: MatchDetailStat;
  homeColor: string;
  awayColor: string;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const total = stat.homeValue + stat.awayValue;
  const share = total <= 0 ? 0.5 : stat.homeValue / total;
  const homeLeads = share >= 0.5;
  const homeFlex = Math.min(995, Math.max(5, Math.round(share * 1000)));

  return (
    <StatsRow accent={homeLeads ? homeColor : awayColor} selected={selected} onSelect={onSelect}>
      <span className={styles.comparisonHead}>
        <b style={{ color: homeLeads ? homeColor : "var(--ds-color-text-default)" }}>{stat.home}</b>
        <small>{stat.label.toUpperCase()}</small>
        <b style={{ color: homeLeads ? "var(--ds-color-text-default)" : awayColor }}>{stat.away}</b>
      </span>
      <span className={styles.splitBar}>
        <i style={{ flexGrow: homeFlex, background: homeColor }} />
        <i style={{ flexGrow: 1000 - homeFlex, background: awayColor }} />
      </span>
    </StatsRow>
  );
}

/** The home/away identity pair that heads a comparison block. */
export function TeamLegendRow({ match }: { match: SportMatch }) {
  return (
    <div className={styles.legendRow}>
      <TeamLegendMark name={match.home.name} short={match.home.shortName} color={match.home.secondaryTextColor ?? match.home.color} />
      <TeamLegendMark name={match.away.name} short={match.away.shortName} color={match.away.secondaryTextColor ?? match.away.color} alignEnd />
    </div>
  );
}

function TeamLegendMark({
  name,
  short,
  color,
  alignEnd = false,
}: {
  name: string;
  short: string;
  color: string;
  alignEnd?: boolean;
}) {
  return (
    <span className={[styles.legendMark, alignEnd ? styles.legendMarkEnd : ""].filter(Boolean).join(" ")}>
      <i style={{ background: color }} />
      <span>
        <b style={{ color }}>{short.toUpperCase()}</b>
        <small>{name.toUpperCase()}</small>
      </span>
    </span>
  );
}

/** The competition, ground and facts block every report carries. */
export function MatchIntelPanel({ match, intel }: { match: SportMatch; intel: MatchIntel }) {
  const statusColor =
    match.status === "live"
      ? "var(--ds-color-danger)"
      : match.status === "finished"
        ? accentVar("cyan")
        : accentVar("gold");
  return (
    <StatsRow accent={statusColor} className={styles.intelPanel}>
      <b className={styles.intelTitle}>{intel.competition.toUpperCase()}</b>
      <p className={styles.intelSeason}>{intel.season}</p>
      <div className={styles.intelCells}>
        <span className={styles.intelCell}>
          <small>VENUE</small>
          <b>{intel.venue}</b>
        </span>
        <span className={styles.intelCell}>
          <small>ATTENDANCE</small>
          <b className="ds-tabular">{intel.attendance ?? "—"}</b>
        </span>
      </div>
      <dl className={styles.intelFacts}>
        {intel.facts.map((fact) => (
          <div key={fact.label}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>
      {intel.resultNote ? <p className={styles.intelResult}>{intel.resultNote.toUpperCase()}</p> : null}
    </StatsRow>
  );
}

/**
 * A section with nothing in it yet. The same empty state the rest of the
 * platform uses, so a report waiting on a feed reads like every other absence.
 */
export function EmptyPanel({
  title,
  message,
  icon = SignalOffIcon,
  spark,
  accent,
}: {
  title: string;
  message: string;
  icon?: ComponentType<IconProps>;
  spark?: ComponentType<IconProps>;
  accent?: string;
}) {
  return <NoDataState icon={icon} spark={spark} title={title} message={message} accent={accent} />;
}
