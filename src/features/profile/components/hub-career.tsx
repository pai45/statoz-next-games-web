"use client";

import Image from "next/image";
import Link from "next/link";
import { GameIcon } from "@statoz/design-system/games";
import { gameCoverPath, gameEntryFor, type GameId, type ProfileGameSummary } from "@/features/games";
import { publicAsset } from "@/shared/config";
import { HubSurface } from "./hub-surface";
import styles from "./player-hub.module.css";

export function GameArtwork({ gameId, feature = false }: { gameId: GameId; feature?: boolean }) {
  return <div className={feature ? styles.featureArt : styles.gameThumb}><Image key={gameId} src={publicAsset(gameCoverPath(gameId))} alt="" fill loading={feature ? "eager" : "lazy"} sizes={feature ? "(min-width: 900px) 560px, 50vw" : "64px"} onError={event => { event.currentTarget.style.visibility = "hidden"; }} /></div>;
}
export function GameMetrics({ summary }: { summary?: ProfileGameSummary }) {
  if (!summary?.metrics.length) return null;
  return <dl className={styles.metrics}>{summary.metrics.map(metric => <div className={styles.metric} key={metric.label}><dt>{metric.label}</dt><dd><strong>{metric.value}</strong></dd></div>)}</dl>;
}
export function launchedLabel(timestamp: number | null) {
  return timestamp ? `Last opened ${new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}` : "Saved progress";
}
export function HubCareer({ summaries }: { summaries: ProfileGameSummary[] }) {
  return <section aria-labelledby="career-heading"><div className={styles.toolbar}><div><h2 id="career-heading" className={styles.panelTitle}>Your game career</h2><p className={styles.muted}>Personal records and saved progress, one game at a time.</p></div><Link className={styles.secondaryButton} href="/?view=all">Explore games</Link></div>
    {summaries.length === 0 ? <HubSurface accent="violet"><div className={styles.empty}><GameIcon size={36} /><h3>Your career starts here</h3><p className={styles.muted}>Open a game and it will appear here. Completed results appear when the game records them.</p><Link href="/?view=all" className={styles.primaryButton}>Find your first game</Link></div></HubSurface> : <div className={styles.careerGrid}>{summaries.map(summary => {
      const entry = gameEntryFor(summary.gameId);
      if (!entry) return null;
      return <HubSurface key={summary.gameId}><article className={styles.panel} data-career-game={summary.gameId}>
        <div className={styles.careerHeading}><GameArtwork gameId={summary.gameId} /><div><h3>{entry.title}</h3><p className={styles.rowDate}>{launchedLabel(summary.lastPlayedAt)}</p></div></div>
        <GameMetrics summary={summary} />
        {!summary.hasSavedProgress ? <p className={styles.muted}>Recently played. No completed results recorded here yet.</p> : null}
        {summary.records.length > 0 ? <details className={styles.details}><summary>View {summary.gameId === "open-golf" || summary.gameId === "grand-prix-dash" ? "personal records" : "completed results"} ({summary.records.length})</summary><ul className={styles.recordList}>{summary.records.map(record => <li key={record.id}><strong>{record.label}</strong><span>{record.detail}{record.at ? ` · ${new Date(record.at).toLocaleDateString()}` : ""}</span></li>)}</ul></details> : null}
        <div className={styles.achievementFooter} style={{ marginTop: "var(--ds-space-16)" }}><Link className={styles.primaryButton} href={entry.href}>Play game</Link>{entry.requiresDeck ? <Link className={styles.textButton} href="/decks/football">View deck</Link> : null}</div>
      </article></HubSurface>;
    })}</div>}
  </section>;
}
