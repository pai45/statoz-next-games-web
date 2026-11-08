"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { FilterChips, HudPanel, InteractiveLineChart } from "@statoz/design-system/games";
import type { F1RaceReport } from "@/domain/matches";

import { SectionHeading } from "./match-stats-shell";
import styles from "./motorsport-stats-view.module.css";

const tabs = ["RACE", "WEEKEND", "QUALIFYING"];

export function MotorsportStatsView({ report }: { report: F1RaceReport }) {
  const [tab, setTab] = useState("RACE");
  return (
    <div className={styles.view}>
      <FilterChips options={tabs} selected={tab} onSelect={setTab} label="Race report sections" accent="var(--ds-color-accent-racing)" />
      <div className={styles.scroll}>
        {tab === "RACE" ? <RaceView report={report} /> : null}
        {tab === "WEEKEND" ? <WeekendView report={report} /> : null}
        {tab === "QUALIFYING" ? <QualifyingView report={report} /> : null}
      </div>
    </div>
  );
}

function RaceView({ report }: { report: F1RaceReport }) {
  return <div className={styles.stack}>
    <HudPanel accent="var(--ds-color-accent-racing)" className={styles.circuit}>
      <div className={styles.pills}><span>{report.abbreviation}</span><span>SEASON {report.season}</span></div>
      <h2>{report.circuit.fullName}</h2>
      <Link href={`/matches/${report.id}/track`} className={styles.mapLink} aria-label={`Expand ${report.circuit.fullName} track map`}>
        <Image src={report.circuit.asset} alt="" width={800} height={480} unoptimized />
        <span>EXPAND TRACK</span>
      </Link>
      <dl className={styles.metrics}><div><dt>LAPS</dt><dd>{report.circuit.laps}</dd></div><div><dt>LAP</dt><dd>{report.circuit.lengthKm} KM</dd></div><div><dt>TURNS</dt><dd>{report.circuit.turns}</dd></div></dl>
      <p className={styles.record}>LAP RECORD <b>{report.circuit.lapRecord}</b> · {report.circuit.lapRecordDriver}</p>
      <div className={styles.winner}><span>RACE WINNER</span><strong>{report.winner.name}</strong><b>FROM P{report.winner.grid}</b></div>
    </HudPanel>
    <SectionHeading label="GAP TO LEADER" />
    <ol className={styles.rows}>{report.race.filter((entry) => !entry.gap?.toLowerCase().includes("lap")).slice(0, 12).map((entry) => <li key={entry.driverId}><i style={{ background: entry.color }} /><b>P{entry.position}</b><span>{entry.name}<small>{entry.constructor}</small></span><strong>{entry.position === 1 ? entry.gap : `+${String(entry.gap).replace(/^\+/, "")}`}</strong></li>)}</ol>
    <SectionHeading label="GRID VS FINISH" />
    <ol className={styles.rows}>{report.race.slice(0, 12).map((entry) => { const delta = entry.grid - entry.position; return <li key={entry.driverId}><i style={{ background: entry.color }} /><b>P{entry.position}</b><span>{entry.name}<small>STARTED P{entry.grid}</small></span><strong className={delta > 0 ? styles.up : delta < 0 ? styles.down : undefined}>{delta > 0 ? `+${delta}` : delta}</strong></li>; })}</ol>
  </div>;
}

function WeekendView({ report }: { report: F1RaceReport }) {
  const [index, setIndex] = useState(report.weekendTicks.length - 1);
  return <div className={styles.stack}>
    <SectionHeading label="WEEKEND POSITION TRACK" />
    <HudPanel accent="var(--ds-color-accent-racing)" className={styles.chartPanel}>
      <div className={styles.chartReadout}><span>{report.weekendTicks[index]}</span><strong>{report.weekendDrivers[0]?.name} · P{report.weekendDrivers[0]?.positions[index]}</strong></div>
      <InteractiveLineChart series={report.weekendDrivers.map((driver, driverIndex) => ({ id: driver.id, label: driver.abbreviation, values: driver.positions, color: driverIndex === 0 ? "var(--ds-color-accent-racing)" : driver.color }))} selectedIndex={index} onSelectedIndexChange={setIndex} label="Weekend position by session" valueText={(value, point) => `${report.weekendTicks[point]}, position ${value}`} invertYAxis scale={{ min: 1, max: 22 }} axisFormatter={(value) => `P${value}`} height={260} />
      <div className={styles.axis}>{report.weekendTicks.map((tick) => <span key={tick}>{tick}</span>)}</div>
    </HudPanel>
    <SectionHeading label="SESSION CLASSIFICATIONS" />
    {report.sessions.filter((session) => session.label !== "Race").map((session) => <HudPanel key={session.id} accent="var(--ds-color-accent-racing)" className={styles.session}><h3>{session.label}</h3>{session.classification.slice(0, 5).map((entry) => <p key={entry.driverId}><b>P{entry.position}</b><span>{entry.name}</span><strong>{entry.gap || "—"}</strong></p>)}</HudPanel>)}
  </div>;
}

function QualifyingView({ report }: { report: F1RaceReport }) {
  const qualifying = report.sessions.find((session) => session.label.toLowerCase().includes("qual"));
  if (!qualifying) return <p className={styles.unavailable}>QUALIFYING DATA NOT PUBLISHED</p>;
  return <div className={styles.stack}><SectionHeading label="QUALIFYING CLASSIFICATION" /><ol className={styles.rows}>{qualifying.classification.map((entry) => <li key={entry.driverId}><i style={{ background: entry.color }} /><b>P{entry.position}</b><span>{entry.name}<small>{entry.constructor}</small></span><strong>{entry.gap || entry.status}</strong></li>)}</ol><p className={styles.honesty}>ESPN publishes session classification, not lap-by-lap or sector telemetry. No missing values are estimated.</p></div>;
}
