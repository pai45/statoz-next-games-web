"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useRef, type KeyboardEvent } from "react";
import { gameRegistry, gameSportFor } from "@/mocks/games";
import { gameSportModuleFor } from "@/domain/game-sports";
import { publicAsset } from "@/shared/config";
import { GamePlayFeedback, useGamePlayAction, useGamePlayState } from "@/features/device-assets";
import { gameCoverPath } from "../home-catalog";
import { gameLaunchHref } from "../shared/navigation";
import type { GameId } from "../types";
import styles from "./console-dashboard.module.css";

export function CatalogGameCover({ game, active = false, recent = false, onPreview, onLaunch, eager = false }: {
  game: GameId; active?: boolean; recent?: boolean; onPreview?: (game: GameId) => void; onLaunch?: () => void; eager?: boolean;
}) {
  const pathname = usePathname(), query = useSearchParams();
  const start = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  const entry = gameRegistry[game], sport = gameSportModuleFor(gameSportFor(game));
  const params = new URLSearchParams(query.toString());
  if (pathname === "/") params.set("game", game);
  const href = gameLaunchHref(entry.href, pathname + (params.size ? `?${params}` : ""));
  const play = useGamePlayAction(game, entry.title, href);
  const download = useGamePlayState(game);
  const moveFocus = (event: KeyboardEvent<HTMLAnchorElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const links = Array.from(event.currentTarget.closest("ul")?.querySelectorAll<HTMLAnchorElement>("a[data-game-cover]") ?? []);
    const index = links.indexOf(event.currentTarget);
    const next = event.key === "Home" ? 0 : event.key === "End" ? links.length - 1 : Math.max(0, Math.min(links.length - 1, index + (event.key === "ArrowRight" ? 1 : -1)));
    event.preventDefault();
    links[next]?.focus({ preventScroll: true });
    links[next]?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
  };
  return <Link href={href} prefetch={false} data-game-cover={game} data-active={active || undefined} data-recent={recent || undefined}
    className={styles.coverCard} aria-label={download.state ? `${download.label} — ${entry.title}` : `Play ${entry.title}`} aria-busy={download.pending || undefined} aria-disabled={download.pending || undefined} data-game-play-state={download.state} aria-description={recent ? "Recently played" : undefined} onFocus={() => onPreview?.(game)}
    onPointerEnter={event => { if (event.pointerType === "mouse") onPreview?.(game); }} onKeyDown={moveFocus}
    onPointerDown={event => { start.current = { x: event.clientX, y: event.clientY }; moved.current = false; }}
    onPointerMove={event => { if (start.current && Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > 8) moved.current = true; }}
    onPointerCancel={() => { moved.current = true; start.current = null; }}
    onClick={event => { start.current = null; if (moved.current || download.pending) { event.preventDefault(); moved.current = false; } else { play(event); onLaunch?.(); } }}>
    <span className={styles.coverFrame}><span className={styles.coverImage}>
      <Image src={publicAsset(gameCoverPath(game))} alt="" fill sizes="(max-width: 960px) 180px, 240px" loading={eager ? "eager" : "lazy"} />
      <span className={styles.coverPlay} aria-hidden="true">{!download.pending && <svg width="12" height="12" viewBox="0 0 16 16"><path d="M5 3v10l8-5z" fill="currentColor" /></svg>}<span>{download.state ? download.label : "PLAY"}</span></span>
    </span><span className={styles.coverCorners} aria-hidden="true" /></span>
    <span className={styles.coverCaption}><span className={styles.coverTitle}>{entry.title}</span>{recent && <span className={styles.recentMark} role="img" aria-label="Recently played" title="Recently played"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="8" cy="8" r="5.5"/><path d="M8 4.5v3.8l2.5 1.5"/></svg></span>}</span>
    <span className={styles.coverSport}>{sport.label}</span>
    <GamePlayFeedback game={game} />
  </Link>;
}
