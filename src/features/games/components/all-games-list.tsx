"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { ExpandableSearchField, FilterChips, PageSearchHeader, CloseIcon, GridViewIcon } from "@statoz/design-system/games";
import { gameSportModuleFor, gameSportOrder, type GameSport } from "@/domain/game-sports";
import { useAuthSession } from "@/features/auth";
import { allGamesInFeedOrder, searchHomeGames, sportGamesInDeckOrder } from "../home-catalog";
import { CatalogGameCover } from "./catalog-game-cover";
import { homeLaunchEvent } from "../shared/navigation";
import { useHomeRecents } from "../state/home-recents";
import styles from "./all-games-list.module.css";

const sports = gameSportOrder.filter(sport => sportGamesInDeckOrder(sport).length > 0);
const label = (sport: GameSport) => gameSportModuleFor(sport).label;
export function AllGamesList({ initialSport, onClose }: { initialSport: GameSport | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), grid = useRef<HTMLDivElement>(null);
  const query = useSearchParams(), session = useAuthSession();
  const recentIds = new Set(useHomeRecents().map(recent => recent.gameId));
  const search = query.get("q") ?? "";
  const requested = query.get("listSport");
  const selected = requested === "all" ? null : sports.find(sport => sport === requested) ?? initialSport;
  const games = searchHomeGames(selected ? sportGamesInDeckOrder(selected) : allGamesInFeedOrder(), search);
  const update = (key: string, value: string) => {
    const params = new URLSearchParams(window.location.search);
    if (value) params.set(key, value); else params.delete(key);
    // Next's native History integration updates useSearchParams without a server round trip.
    window.history.replaceState(null, "", window.location.pathname + (params.size ? `?${params}` : "") + window.location.hash);
  };

  useEffect(() => {
    const element = dialog.current, opener = document.activeElement;
    if (!element) return;
    // The Library shares the command bar, so it must not make the shell inert.
    const bar = document.querySelector<HTMLElement>("[data-platform-command-bar]");
    const align = () => { if (bar) element.style.setProperty("--library-header-height", `${bar.getBoundingClientRect().height}px`); };
    align();
    const observer = new ResizeObserver(align);
    if (bar) observer.observe(bar);
    const pathname = window.location.pathname;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.show();
    return () => {
      observer.disconnect();
      document.body.style.overflow = previousOverflow;
      element.close();
      if (window.location.pathname === pathname && opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented && !document.querySelector("dialog:modal")) { event.preventDefault(); onClose(); }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [onClose]);
  useEffect(() => {
    const panel = grid.current;
    if (!panel || session.status === "hydrating") return;
    const key = `statoz.next.games-web.home-library.v1.${encodeURIComponent(session.email ?? "guest")}.${selected ?? "all"}.${search}`;
    try { panel.scrollTop = Number(sessionStorage.getItem(key)) || 0; } catch { panel.scrollTop = 0; }
    let leaving = false;
    const save = () => { if (!leaving) try { sessionStorage.setItem(key, String(panel.scrollTop)); } catch { /* Optional view state. */ } };
    const freeze = () => { save(); leaving = true; };
    window.addEventListener(homeLaunchEvent, freeze);
    panel.addEventListener("scroll", save, { passive: true });
    return () => { save(); window.removeEventListener(homeLaunchEvent, freeze); panel.removeEventListener("scroll", save); };
  }, [selected, search, session.status, session.email]);

  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="all-games-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className={styles.backdrop} aria-hidden="true"><div className={styles.backdropGrid} /></div>
    <div className={styles.panel}>
      <PageSearchHeader title="Game Library" titleId="all-games-title" heading="h2">
        <ExpandableSearchField label="Search games" placeholder="Search games…" value={search} onChange={event => update("q", event.target.value)} onClear={() => update("q", "")} enterKeyHint="search" />
      </PageSearchHeader>
      <div className={styles.filters}>
        <FilterChips options={["All Games", ...sports.map(label)]} selected={selected ? label(selected) : "All Games"} label="Filter games by sport" onSelect={value => update("listSport", sports.find(sport => label(sport) === value) ?? "all")} />
        <button type="button" className={styles.close} aria-label="Close all games" onClick={onClose}><CloseIcon size={20} /></button>
      </div>
      <div className={styles.resultBar}><span aria-live="polite" aria-atomic="true">{games.length} {games.length === 1 ? "game" : "games"}{selected ? ` in ${label(selected)}` : " in your library"}</span></div>
      <div ref={grid} className={styles.results} data-library-results>
        {games.length ? <ul className={styles.grid}>{games.map(game => <li key={game}><CatalogGameCover game={game} recent={recentIds.has(game)} /></li>)}</ul> : <div className={styles.empty}><GridViewIcon size={36} /><h3>No games found</h3><p>Try another title or browse a different sport.</p><button type="button" onClick={() => { update("q", ""); update("listSport", "all"); }}>Clear search and filters</button></div>}
      </div>
    </div>
  </dialog>;
}
