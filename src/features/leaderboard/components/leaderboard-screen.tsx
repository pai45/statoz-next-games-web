"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, type CSSProperties } from "react";
import { accentVar, AdaptiveDrawer, ChevronRightIcon, ExpandableSearchField, FilterChips, NoDataState, PageSearchHeader, PersonSearchIcon, ScheduleIcon, TrophyIcon } from "@statoz/design-system/games";
import { useAuthSession, useRequireAuth } from "@/features/auth";
import { RivalDossierOverlay } from "@/features/profile";
import { usePlayerStanding, type PlayerStanding } from "@/features/profile/standing";
import { gameRegistry } from "@/mocks/games";
import { ladderTitle } from "../catalog";
import { leaderboardCountdown } from "../periods";
import { searchStandings } from "../ranking";
import { leaderboardHref } from "../selection";
import { useLeaderboard } from "../state/use-leaderboard";
import type { LeaderboardLadder, LeaderboardStanding } from "../types";
import { ArcadeStage } from "./arcade-stage";
import { BoardPicker } from "./board-picker";
import { CompetitiveStandings, StandingsLoading } from "./competitive-standings";
import { LeaderboardDetails } from "./leaderboard-details";
import styles from "./competitive.module.css";

export function LeaderboardScreen() {
  const session = useAuthSession();
  return session.status === "authenticated" ? <PersonalizedLeaderboard /> : <LeaderboardWorkspace />;
}

function PersonalizedLeaderboard() {
  const player = usePlayerStanding();
  return <LeaderboardWorkspace player={player} />;
}

function LeaderboardWorkspace({ player = null }: { player?: PlayerStanding | null }) {
  const { selection, entries, user, now, periodWindow, season, session } = useLeaderboard(player);
  const router = useRouter();
  const requireAuth = useRequireAuth();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);
  const [details, setDetails] = useState<LeaderboardStanding | "rules" | null>(null);
  const [rival, setRival] = useState<LeaderboardStanding | null>(null);
  const dossierTrigger = useRef<HTMLElement | null>(null);
  const boardTitleId = useId();
  const master = selection.ladder === "master";
  const title = ladderTitle(selection.ladder);
  const periodLabel = selection.period === "weekly" ? "Weekly" : "Season";
  const context = `${master ? "Master" : title} · ${periodLabel}`;
  const accent = selection.ladder === "master" ? accentVar("cyan") : accentVar(gameRegistry[selection.ladder].accent);
  const href = leaderboardHref(selection);
  const authenticated = session.status === "authenticated";
  const searching = query.trim().length > 0;
  const hasPodium = !searching && entries.length >= 3;
  const tableEntries = searching ? searchStandings(entries, query) : hasPodium ? entries.slice(3) : entries;

  function selectBoard(ladder: LeaderboardLadder) {
    if (ladder !== selection.ladder) router.push(leaderboardHref({ ...selection, ladder }), { scroll: false });
    setPickerOpen(false);
  }
  function openPlayer(entry: LeaderboardStanding) {
    if (!authenticated) {
      requireAuth({ intent: "compare profiles", message: "Sign in to compare your standing with other players.", returnTo: href });
    } else if (entry.isUser) router.push("/profile");
    else {
      dossierTrigger.current = document.activeElement as HTMLElement;
      setRival(entry);
    }
  }
  return <div className={styles.workspace} style={{ "--leaderboard-accent": accent } as CSSProperties} data-leaderboard-workspace>
    <PageSearchHeader title="Leaderboard">
      <ExpandableSearchField ref={search} label="Search leaderboard players" placeholder="Search players…" value={query}
        onChange={event => setQuery(event.target.value)} onClear={() => { setQuery(""); search.current?.focus(); }} enterKeyHint="search" />
    </PageSearchHeader>
    <div className={styles.workspaceGrid}>
      <aside className={styles.rail}><BoardPicker selected={selection.ladder} onSelect={selectBoard} /></aside>
      <div className={styles.boardColumn}>
        <section className={styles.board} aria-labelledby={boardTitleId} data-ladder={selection.ladder} data-period={selection.period}>
          <header className={styles.boardHeader}>
            <div className={styles.boardIdentity}><TrophyIcon size={24} aria-hidden="true" /><h2 id={boardTitleId}>{title}</h2></div>
            <button type="button" className={styles.mobilePicker} onClick={() => setPickerOpen(true)} aria-label={`SELECT LEADERBOARD: ${master ? "MASTER" : title}`} aria-haspopup="dialog" aria-expanded={pickerOpen}><strong>{master ? "MASTER LEADERBOARD" : title}</strong><ChevronRightIcon size={18} /></button>
            <div className={styles.boardControls}><FilterChips label="Ranking period" options={["WEEKLY", "SEASON"]} selected={periodLabel.toUpperCase()} accent={accent} onSelect={(value) => router.push(leaderboardHref({ ...selection, period: value === "SEASON" ? "season" : "weekly" }), { scroll: false })} className={styles.periodChips} /></div>
            <div className={styles.periodMeta}><span>{selection.period === "season" && <><span className={styles.seasonLabel}>{season?.label ?? "Current season"}</span><span className={styles.seasonLabel} aria-hidden="true"> · </span></>}{periodWindow ? `${new Date(periodWindow.start).toLocaleDateString(undefined, { day: "numeric", month: "short" })} – ${new Date(periodWindow.end - 1).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}` : "Loading period…"}</span><span>{now === null ? "—" : entries.length} players</span><span className={styles.reset}><ScheduleIcon size={13} />{selection.period === "weekly" ? "Resets" : "Ends"} {now !== null && periodWindow ? `in ${leaderboardCountdown(periodWindow.end, now)}` : "…"}</span></div>
          </header>
          <div className={styles.boardBody}>
            {now !== null && hasPodium && <ArcadeStage key={`${selection.ladder}-${periodWindow?.id}`} entries={entries} master={master} onOpen={openPlayer} onContributions={setDetails} />}
            {now === null ? <StandingsLoading /> : searching && tableEntries.length === 0 ? <NoDataState icon={PersonSearchIcon} title={query.trim().length < 2 ? "Find your rival" : "No player found"} message={query.trim().length < 2 ? "Enter at least two characters to search this board." : "Try another player name or clear your search."} className="min-h-56" /> : tableEntries.length > 0 || !hasPodium ? <CompetitiveStandings entries={tableEntries} period={selection.period} master={master} onOpen={openPlayer} onContributions={setDetails} /> : null}
          </div>
          <footer className={styles.boardFooter}><span>Change vs {selection.period === "weekly" ? "last week" : "last season"}</span><button type="button" className={styles.textAction} onClick={() => setDetails("rules")}>HOW RANKING WORKS <span aria-hidden="true">↗</span></button></footer>
        </section>
      </div>
    </div>
    <AdaptiveDrawer open={pickerOpen} onClose={() => setPickerOpen(false)} title="CHOOSE A LEADERBOARD" className={styles.drawer}><BoardPicker selected={selection.ladder} onSelect={selectBoard} /></AdaptiveDrawer>
    <LeaderboardDetails open={details !== null} participant={details === "rules" ? null : details} period={selection.period} context={title} periodWindow={periodWindow} onClose={() => setDetails(null)} />
    {rival && authenticated && <RivalDossierOverlay name={rival.name} rank={rival.rank} xp={rival.xp} pro={rival.badge === "PRO"} userRank={user?.rank ?? null} rankContext={context} onClose={() => { setRival(null); requestAnimationFrame(() => dossierTrigger.current?.focus()); }} />}
  </div>;
}
