"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { accentVar, Button, CollectionsIcon, FilterChips, GridViewIcon, NavMarkIcon } from "@statoz/design-system/games";
import { gameSportModuleFor, gameSportOrder, type GameSport } from "@/domain/game-sports";
import { useAuthSession } from "@/features/auth";
import { gameRegistry, gameSportFor, homeCoverPositions, homeSpotlights } from "@/mocks/games";
import { publicAsset } from "@/shared/config";
import { GamePlayFeedback, useGamePlayAction, useGamePlayState } from "@/features/device-assets";
import { allGamesInFeedOrder, gameCoverPath, homeGameStrip, sportGamesInDeckOrder } from "../home-catalog";
import { gameCatalogHref, gameLaunchHref, homeLaunchEvent } from "../shared/navigation";
import { useHomeRecents } from "../state/home-recents";
import { isHomeGame } from "../state/home-recents-model";
import type { GameId } from "../types";
import { AllGamesList } from "./all-games-list";
import { CatalogGameCover } from "./catalog-game-cover";
import { SpotlightGameplay } from "./spotlight-gameplay";
import { useSpotlightIdle } from "./use-spotlight-idle";
import styles from "./console-dashboard.module.css";

const sports = gameSportOrder.filter(sport => sportGamesInDeckOrder(sport).length > 0);
const sportLabel = (sport: GameSport) => gameSportModuleFor(sport).label;

export function ConsoleDashboard() {
  const query = useSearchParams();
  const sport = sports.find(value => value === query.get("sport")) ?? null;
  return <DashboardContent key={sport ?? "all"} sport={sport} />;
}

function DashboardContent({ sport }: { sport: GameSport | null }) {
  const query = useSearchParams();
  const recents = useHomeRecents(), session = useAuthSession();
  const queryGame = query.get("game") ?? "";
  const [selection, setSelection] = useState({ queryGame, game: queryGame });
  const [motionPaused, setMotionPaused] = useState(false);
  const previewed = selection.queryGame === queryGame ? selection.game : queryGame;
  const preview = useCallback((game: GameId) => setSelection({ queryGame, game }), [queryGame]);
  const page = useRef<HTMLDivElement>(null);
  const libraryTrigger = useRef<HTMLButtonElement>(null);
  const orderedStrip = homeGameStrip(recents, sport);
  const available = sport ? sportGamesInDeckOrder(sport) : allGamesInFeedOrder();
  const active = isHomeGame(previewed) && available.includes(previewed) ? previewed : orderedStrip[0];
  const strip = orderedStrip;
  const entry = gameRegistry[active];
  const activeSport = gameSportFor(active);
  const accent = accentVar(entry.accent);
  const viewAll = query.get("view") === "all";
  useSpotlightIdle({ root: page, game: active, order: strip, paused: motionPaused || viewAll, onNext: preview });
  const catalogHref = (showAll = false, listSport?: GameSport) => gameCatalogHref(sport, showAll, { game: active, listSport });
  const playHref = gameLaunchHref(entry.href, catalogHref());
  const play = useGamePlayAction(active, entry.title, playHref);
  const download = useGamePlayState(active);
  const openLibrary = (listSport?: GameSport) => window.history.pushState(null, "", publicAsset(catalogHref(true, listSport)));
  const closeLibrary = () => {
    window.history.replaceState(null, "", publicAsset(catalogHref()));
  };
  const viewKey = `statoz.next.games-web.home-view.v1.${encodeURIComponent(session.email ?? "guest")}.${sport ?? "all"}`;

  // A game return remounts the home route. Keep vertical and individual shelf positions.
  useEffect(() => {
    if (session.status === "hydrating") return;
    let frame = 0;
    let leaving = false;
    try {
      const saved = JSON.parse(sessionStorage.getItem(viewKey) ?? "null");
      if (saved && Number.isFinite(saved.top)) frame = requestAnimationFrame(() => {
        window.scrollTo({ top: saved.top, behavior: "instant" });
        page.current?.querySelectorAll<HTMLElement>("[data-shelf-id]").forEach(shelf => {
          const left = saved.shelves?.[shelf.dataset.shelfId ?? ""];
          if (Number.isFinite(left)) shelf.scrollLeft = left;
        });
      });
    } catch { /* A missing session view starts at the top. */ }
    const save = () => {
      if (leaving) return;
      const shelves: Record<string, number> = {};
      page.current?.querySelectorAll<HTMLElement>("[data-shelf-id]").forEach(shelf => { shelves[shelf.dataset.shelfId!] = shelf.scrollLeft; });
      try { sessionStorage.setItem(viewKey, JSON.stringify({ top: window.scrollY, shelves })); } catch { /* Browsing works without persistence. */ }
    };
    const freeze = () => { save(); leaving = true; };
    window.addEventListener(homeLaunchEvent, freeze);
    window.addEventListener("pagehide", save);
    window.addEventListener("scroll", save, { passive: true });
    const root = page.current;
    root?.addEventListener("scroll", save, { capture: true, passive: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener(homeLaunchEvent, freeze); window.removeEventListener("pagehide", save); window.removeEventListener("scroll", save); root?.removeEventListener("scroll", save, true); };
  }, [viewKey, session.status]);

  const recentIds = new Set(recents.map(recent => recent.gameId));
  return <div ref={page} className={styles.dashboard} data-console-dashboard data-motion-paused={motionPaused || viewAll || undefined}>
    <div inert={viewAll} aria-hidden={viewAll || undefined}>
    <AmbientBackdrop />
    <section className={styles.opening} aria-label="Game spotlight" style={{ "--spotlight-accent": accent } as CSSProperties}>
      <SpotlightArtwork game={active} paused={motionPaused || viewAll} />
      <button type="button" className={styles.motionControl} aria-label={motionPaused ? "Play background motion" : "Pause background motion"} aria-pressed={motionPaused} onClick={() => setMotionPaused(value => !value)}>{motionPaused ? <PlayMark /> : <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 3h3v10H4zM10 3h3v10h-3z" /></svg>}</button>
      <div className={styles.hero}>
        <div className={styles.heroCopy} key={active}>
          <p className={styles.eyebrow}><span className={styles.liveDot} /> YOUR NEXT GREAT GAME</p>
          <h1>{entry.title}</h1>
          <p className={styles.description}>{entry.subtitle}</p>
          <div className={styles.heroActions}>
            <Button href={playHref} prefetch={false} onClick={play} pending={download.pending} accent={accentVar("cyan")} size="lg" leadingIcon={download.pending ? undefined : <PlayMark />} label={download.state ? `${download.label} — ${entry.title}` : `Play ${entry.title}`} className={styles.heroPlay}><span className={styles.playLabel} aria-live="polite" aria-atomic="true">{download.state ? download.label : "PLAY"}</span>{!download.pending && <span className={styles.playBars} aria-hidden="true"><i /><i /><i /></span>}</Button>
            <button type="button" className={styles.heroBrowse} onClick={() => openLibrary(activeSport)}>Explore {sportLabel(activeSport)} <span aria-hidden="true">↗</span></button>
          </div>
          <GamePlayFeedback game={active} />
        </div>
      </div>
      <section className={styles.primaryStrip} aria-label="Your game lineup">
        <div className={styles.sectionHeading}><h2>Your games</h2>
          <button ref={libraryTrigger} type="button" className={styles.textAction} onClick={() => openLibrary()}><GridViewIcon size={17} /> Game Library <span aria-hidden="true">↗</span></button>
        </div>
        <ul className={styles.coverRail} data-shelf-id="lineup">{strip.map((game, index) => <li key={game}><CatalogGameCover game={game} active={active === game} recent={recentIds.has(game)} onPreview={preview} eager={index < 4} /></li>)}</ul>
      </section>
    </section>

    <div className={styles.content}>
      <section className={styles.browseSports} aria-label="Browse by sport">
        <div className={styles.sectionHeading}><div><span className={styles.kicker}>FIND YOUR ARENA</span><h2>Every sport. Your game.</h2></div><span className={styles.catalogCount}>{available.length} games to explore</span></div>
        <FilterChips label="Browse games by sport" options={["All Games", ...sports.map(sportLabel)]} selected={sport ? sportLabel(sport) : "All Games"} onSelect={label => window.history.replaceState(null, "", publicAsset(gameCatalogHref(sports.find(value => sportLabel(value) === label) ?? null)))} />
      </section>
      <div className={styles.shelves}>
        {(sport ? [sport] : sports).map(category => <SportShelf key={category} sport={category} recentIds={recentIds} onViewAll={() => openLibrary(category)} />)}
      </div>
      <section className={styles.more} aria-label="More from StatOz">
        <div className={styles.sectionHeading}><div><span className={styles.kicker}>THERE’S MORE TO YOUR GAME</span><h2>Beyond the play button</h2></div></div>
        <div className={styles.shortcuts}>
          <button type="button" onClick={() => openLibrary()} className={styles.shortcut}><GridViewIcon size={29} /><span><b>Game Library</b><small>Your entire arcade, one place.</small></span><span aria-hidden="true">↗</span></button>
          <Link href="/leaderboard" className={styles.shortcut}><NavMarkIcon mark="top" size={30} /><span><b>Leaderboard</b><small>See where you stand.</small></span><span aria-hidden="true">↗</span></Link>
          <Link href="/cards" className={styles.shortcut}><CollectionsIcon size={30} /><span><b>Your Collection</b><small>Build a lineup of your own.</small></span><span aria-hidden="true">↗</span></Link>
          <Link href="/shop" className={styles.shortcut}><NavMarkIcon mark="shop" size={30} /><span><b>StatOz Shop</b><small>Find your next signature look.</small></span><span aria-hidden="true">↗</span></Link>
        </div>
      </section>
      <footer className={styles.footer}><span>STATOZ <b>GAMES</b></span><a href={publicAsset("/assets/games/home/gameplay/CREDITS.txt")} target="_blank" rel="noreferrer">Gameplay credits</a><span>Play. Collect. Climb.</span></footer>
    </div>
    </div>
    {viewAll ? <AllGamesList initialSport={sport} onClose={closeLibrary} /> : null}
  </div>;
}

function AmbientBackdrop() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    const update = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => root.current?.style.setProperty("--ambient-scroll", `${Math.min(window.scrollY * .08, 180)}px`)); };
    update(); window.addEventListener("scroll", update, { passive: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", update); };
  }, []);
  return <div ref={root} className={styles.ambient} aria-hidden="true"><div className={styles.ambientGlow} /><div className={styles.ambientGrid} /><span className={styles.ambientSweep} /></div>;
}

function SpotlightArtwork({ game, paused }: { game: GameId; paused: boolean }) {
  const art = homeSpotlights[game] ?? { src: gameCoverPath(game), position: homeCoverPositions[game] ?? "75% 50%" };
  const [loaded, setLoaded] = useState(art);
  const [previous, setPrevious] = useState<typeof art | null>(null);
  return <div className={styles.artwork} aria-hidden="true">
    {previous && <Image src={publicAsset(previous.src)} alt="" fill sizes="100vw" className={styles.heroArt} style={{ objectPosition: previous.position }} />}
    <Image key={loaded.src} src={publicAsset(loaded.src)} alt="" fill sizes="100vw" loading="eager" fetchPriority="high" className={`${styles.heroArt} ${styles.artEnter}`} style={{ objectPosition: loaded.position }} />
    {art.src !== loaded.src && <Image key={art.src} src={publicAsset(art.src)} alt="" fill sizes="100vw" loading="eager" className={styles.pendingArt} onLoad={() => { setPrevious(loaded); setLoaded(art); }} />}
    <SpotlightGameplay key={game} game={game} paused={paused} />
    <div className={styles.artVeil} /><div className={styles.artGrid} />
  </div>;
}

function SportShelf({ sport, onViewAll, recentIds }: { sport: GameSport; onViewAll: () => void; recentIds: Set<GameId> }) {
  const games = sportGamesInDeckOrder(sport);
  return <section className={styles.sportShelf} aria-label={`${sportLabel(sport)} games`} style={{ "--shelf-accent": accentVar(gameSportModuleFor(sport).accent) } as CSSProperties}>
    <div className={styles.sectionHeading}><div className={styles.sportHeading}><span className={styles.sportBar} /><h2>{sportLabel(sport)}</h2><span className={styles.gameCount}>{games.length} {games.length === 1 ? "game" : "games"}</span></div>
      <button type="button" className={styles.textAction} onClick={onViewAll}>View all <span aria-hidden="true">↗</span></button>
    </div>
    <ul className={styles.coverRail} data-shelf-id={sport}>{games.map(game => <li key={game}><CatalogGameCover game={game} recent={recentIds.has(game)} /></li>)}</ul>
  </section>;
}

function PlayMark() { return <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2v12l10-6z" fill="currentColor" /></svg>; }
