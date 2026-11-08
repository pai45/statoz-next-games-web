"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type CSSProperties } from "react";
import { accentVar, ArrowLeftIcon, NoDataState, PersonSearchIcon, SearchField } from "@statoz/design-system/games";
import { useAuthSession, useRequireAuth } from "@/features/auth";
import { RivalDossierOverlay } from "@/features/profile";
import { usePlayerStanding, type PlayerStanding } from "@/features/profile/standing";
import { gameRegistry } from "@/mocks/games";
import { ladderTitle } from "../catalog";
import { searchStandings } from "../ranking";
import { leaderboardHref } from "../selection";
import { useLeaderboard } from "../state/use-leaderboard";
import type { LeaderboardStanding } from "../types";
import { CompetitiveStandings, StandingsLoading } from "./competitive-standings";
import { LeaderboardDetails } from "./leaderboard-details";
import styles from "./competitive.module.css";

export function LeaderboardSearchScreen() {
  const session = useAuthSession();
  return session.status === "authenticated" ? <PersonalizedSearch /> : <BoardPlayerSearch />;
}

function PersonalizedSearch() {
  const player = usePlayerStanding();
  return <BoardPlayerSearch player={player} />;
}

function BoardPlayerSearch({ player = null }: { player?: PlayerStanding | null }) {
  const { selection, entries, user, now, periodWindow, session } = useLeaderboard(player);
  const [query, setQuery] = useState("");
  const [rival, setRival] = useState<LeaderboardStanding | null>(null);
  const [contribution, setContribution] = useState<LeaderboardStanding | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const requireAuth = useRequireAuth();
  const router = useRouter();
  const title = ladderTitle(selection.ladder);
  const context = `${title} · ${selection.period === "weekly" ? "Weekly" : "Season"}`;
  const results = searchStandings(entries, query);
  const accent = selection.ladder === "master" ? accentVar("cyan") : accentVar(gameRegistry[selection.ladder].accent);
  function open(entry: LeaderboardStanding) {
    if (session.status !== "authenticated") requireAuth({ intent: "compare profiles", message: "Sign in to compare your standing with other players.", returnTo: leaderboardHref(selection, true) });
    else if (entry.isUser) router.push("/profile");
    else { opener.current = document.activeElement as HTMLElement; setRival(entry); }
  }
  return <section className={styles.searchPage} style={{ "--leaderboard-accent": accent } as CSSProperties}>
    <header className={styles.searchHeader}><Link href={leaderboardHref(selection)} aria-label="Back to leaderboard" className={styles.searchBack}><ArrowLeftIcon size={20} /></Link><div><span className={styles.eyebrow}>PLAYER DIRECTORY <span aria-hidden="true">{"//"}</span></span><h1>FIND A PLAYER</h1><p>{context}</p></div></header>
    <SearchField ref={input} label="Search leaderboard players" placeholder="Search player name" value={query} onChange={(event) => setQuery(event.target.value)} onClear={() => { setQuery(""); input.current?.focus(); }} autoFocus enterKeyHint="search" />
    <div className={styles.searchResults}>
      {now === null ? <StandingsLoading /> : query.trim().length < 2 ? <NoDataState icon={PersonSearchIcon} title="Find your rival" message="Enter at least two characters to search this board. Results keep their ladder rank and Rank Points." className="min-h-56" /> : results.length === 0 ? <NoDataState icon={PersonSearchIcon} title="No player found" message={`No ranked player on this board matches “${query.trim()}”.`} className="min-h-56" /> : <>
        <p className="px-4 py-3 text-xs text-muted" role="status">{results.length} {results.length === 1 ? "player" : "players"} found on {context}</p>
        <CompetitiveStandings entries={results} period={selection.period} master={selection.ladder === "master"} onOpen={open} onContributions={setContribution} />
      </>}
    </div>
    <LeaderboardDetails open={contribution !== null} participant={contribution} period={selection.period} context={title} periodWindow={periodWindow} onClose={() => setContribution(null)} />
    {rival && session.status === "authenticated" && <RivalDossierOverlay name={rival.name} rank={rival.rank} xp={rival.xp} pro={rival.badge === "PRO"} userRank={user?.rank ?? null} rankContext={context} onClose={() => { setRival(null); requestAnimationFrame(() => opener.current?.focus()); }} />}
  </section>;
}
