"use client";
import Image from "next/image";
import Link from "next/link";
import { useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { accentVar, Button, GridViewIcon } from "@statoz/design-system/games";
import { GamePlayFeedback } from "@/features/device-assets";
import { gameSportModuleFor } from "@/domain/game-sports";
import { gameRegistry, gameSportFor } from "@/mocks/games";
import { publicAsset } from "@/shared/config";
import { coverflowOffset, gameCoverPath } from "../home-catalog";
import type { GameId } from "../types";
import { useCardTilt } from "./use-card-tilt";
import { useGameLaunch } from "./use-game-launch";
import styles from "./game-coverflow.module.css";

/** Horizontal travel, in px, that counts as a swipe. */
const swipeDistance = 40;
/** Travel, in px, before a press becomes a drag (smaller moves are still taps). */
const dragStart = 8;
/** Cards drawn on each side of the centre; the outermost one is faded out so newcomers fade in. */
const reach = 3;

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * The home page's game browser: one large game in the centre with the rest of
 * the library fanned out to its left and right. Dragging moves the cards with the
 * finger; the arrows or the keyboard step through every game; tapping a side card brings it to the
 * centre, and tapping the centre card (or PLAY) opens the game.
 */
export function GameCoverflow({ games, label, onViewAll }: { games: GameId[]; label: string; onViewAll: () => void }) {
  const count = games.length;
  const [index, setIndex] = useState(0);
  const tilt = useCardTilt({ x: 10, y: 6, sheen: 140 });
  /** The press being dragged: start point and the px distance between two neighbouring cards. */
  const drag = useRef<{ x: number; y: number; pointer: number; spacing: number; moving: boolean } | null>(null);
  /** How far the cards have been dragged, in card slots (positive = towards the right). */
  const [shift, setShift] = useState(0);
  const swiped = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Publish the stage size so the cards fit both its width and its height.
  useLayoutEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    const measure = () => {
      element.style.setProperty("--stage-w", `${element.clientWidth}px`);
      element.style.setProperty("--stage-h", `${element.clientHeight}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  if (!count) return null;
  const active = Math.min(index, count - 1);
  const id = games[active];
  const entry = gameRegistry[id];
  const sport = gameSportFor(id);
  const go = (next: number) => setIndex(((next % count) + count) % count);
  // Cards closer to the centre than this are drawn; long lists wrap, so never show the wrap point.
  const visible = count < 5 ? reach : Math.min(reach, count / 2);
  const clampShift = (value: number) => Math.max(-visible, Math.min(visible, value));
  const slotWidth = () => {
    const track = trackRef.current;
    const card = track?.querySelector<HTMLElement>("[data-centre]");
    const spread = track ? parseFloat(getComputedStyle(track).getPropertyValue("--spread")) : NaN;
    return (card?.offsetWidth || 300) * (spread || 0.6);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    if ((event.target as HTMLElement).closest('[role="tablist"]')) return;
    event.preventDefault();
    go(active + (event.key === "ArrowRight" ? 1 : -1));
  };
  // Drag: the cards follow the finger (or mouse); on release the nearest game snaps to the centre.
  const stage = {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      swiped.current = false;
      if (count < 2 || (event.pointerType === "mouse" && event.button !== 0)) return;
      drag.current = { x: event.clientX, y: event.clientY, pointer: event.pointerId, spacing: slotWidth(), moving: false };
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const press = drag.current;
      if (!press || press.pointer !== event.pointerId) { tilt.onPointerMove(event); return; }
      const dx = event.clientX - press.x, dy = event.clientY - press.y;
      if (!press.moving) {
        if (Math.abs(dy) > dragStart && Math.abs(dy) > Math.abs(dx)) { drag.current = null; return; }
        if (Math.abs(dx) <= dragStart) return;
        press.moving = true;
        // Keep receiving the moves even when the finger leaves the card it started on.
        try { stageRef.current?.setPointerCapture(event.pointerId); } catch { /* the pointer is already gone */ }
      }
      setShift(clampShift(dx / press.spacing));
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      const press = drag.current; drag.current = null;
      setShift(0);
      if (!press) return;
      const dx = event.clientX - press.x, dy = event.clientY - press.y;
      let steps = Math.round(clampShift(dx / press.spacing));
      // A quick flick that did not reach halfway still moves one game.
      if (!steps && Math.abs(dx) >= swipeDistance && Math.abs(dx) > Math.abs(dy)) steps = Math.sign(dx);
      if (press.moving || steps) swiped.current = true;
      if (steps) go(active - steps);
    },
    onPointerCancel: () => { drag.current = null; setShift(0); },
    onPointerLeave: (event: PointerEvent<HTMLElement>) => {
      if (!drag.current?.moving) drag.current = null;
      tilt.onPointerLeave(event);
    },
    // A drag ends on a card; it must not also open or select it.
    onClickCapture: (event: MouseEvent<HTMLElement>) => {
      if (!swiped.current) return;
      swiped.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };

  return <section aria-roledescription="carousel" aria-label={label} className={styles.flow}
    style={{ "--spot-accent": accentVar(entry.accent) } as CSSProperties} onKeyDown={onKeyDown}>
    <div className={styles.backdrop} aria-hidden="true">
      <div className={`${styles.orb} ${styles.orbAccent}`} />
      <div className={`${styles.orb} ${styles.orbViolet}`} />
      <div className={styles.dots} />
      <div className={styles.floor} />
      <div className={styles.ghost}>{entry.titleLines?.[0] ?? entry.title}</div>
    </div>

    <div ref={stageRef} className={styles.stage} {...stage}>
      <div className={styles.trackView}>
        <div ref={trackRef} className={shift ? `${styles.track} ${styles.dragging}` : styles.track}>
          {games.map((game, i) => {
            const position = coverflowOffset(i, active - shift, count);
            if (Math.abs(position) >= visible + 1) return null;
            const fade = Math.max(0, Math.min(1, visible - Math.abs(position)));
            return <CoverCard key={game} game={game} centre={i === active} position={position} fade={fade} onSelect={() => go(i)} />;
          })}
        </div>
      </div>
      {count > 1 ? <>
        <button type="button" className={`${styles.step} ${styles.stepPrev}`} aria-label="Previous game" onClick={() => go(active - 1)}>
          <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
        </button>
        <button type="button" className={`${styles.step} ${styles.stepNext}`} aria-label="Next game" onClick={() => go(active + 1)}>
          <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
        </button>
      </> : null}
    </div>

    <div className={styles.info}>
      <div className={styles.meta} aria-live="polite">
        <h2 className={styles.name}>{entry.title}</h2>
        <p className={styles.sub}>
          {sport ? <span style={{ color: accentVar(gameSportModuleFor(sport).accent) }}>{gameSportModuleFor(sport).label.toUpperCase()}</span> : null}
          <span>{`${pad(active + 1)} / ${pad(count)}`}</span>
        </p>
      </div>
      <div className={styles.actions}>
        <PlayButton game={id} />
      </div>
    </div>
    <Button variant="ghost" size="md" accent="var(--ds-color-text-default)" onClick={onViewAll} label="View all games" className={styles.viewAll}>
      <GridViewIcon size={22} />
    </Button>
  </section>;
}

function PlayButton({ game }: { game: GameId }) {
  const entry = gameRegistry[game];
  const launch = useGameLaunch(entry);
  return <div><Button variant="solid" size="md" glow accent={accentVar(entry.accent)} href={launch.href} prefetch={false} onClick={launch.onClick} pending={launch.pending} label={launch.state ? `${launch.label} — ${entry.title}` : `Play ${entry.title}`}><span aria-live="polite">{launch.state ? launch.label : "PLAY"}</span></Button><GamePlayFeedback game={game} /></div>;
}

/** `position` is the card's place in slots from the centre (fractional mid-drag); `fade` hides the outermost cards. */
function CoverCard({ game, centre, position, fade, onSelect }: { game: GameId; centre: boolean; position: number; fade: number; onSelect: () => void }) {
  const entry = gameRegistry[game];
  const launch = useGameLaunch(entry);
  const style = { "--d": position, "--ad": Math.abs(position), "--fade": fade, "--card-accent": accentVar(entry.accent), zIndex: 100 - Math.round(Math.abs(position) * 10) } as CSSProperties;
  const className = [styles.card, centre && styles.centre, fade < 0.5 && styles.edgeOut].filter(Boolean).join(" ");
  const body = <>
    <span className={styles.edge} aria-hidden="true" />
    <span className={styles.fill}>
      <Image src={publicAsset(gameCoverPath(game))} alt="" fill sizes="(min-width: 1024px) 520px, 60vw" unoptimized priority={centre} className={styles.cover} />
      <span className={styles.vignette} aria-hidden="true" />
      <span className={styles.sheen} aria-hidden="true" />
      <span className={`${styles.bracket} ${styles.bracketStart}`} aria-hidden="true" />
      <span className={`${styles.bracket} ${styles.bracketEnd}`} aria-hidden="true" />
    </span>
  </>;
  if (!centre) return <button type="button" className={className} style={style} aria-label={`Show ${entry.title}`} tabIndex={-1} onClick={onSelect}>{body}</button>;
  return launch.href
    ? <Link href={launch.href} prefetch={false} onClick={launch.onClick} className={className} style={style} aria-label={launch.state ? `${launch.label} — ${entry.title}` : `Play ${entry.title}`} aria-busy={launch.pending || undefined} aria-disabled={launch.pending || undefined} draggable={false} data-centre="">{body}</Link>
    : <button type="button" className={className} style={style} aria-label={launch.state ? `${launch.label} — ${entry.title}` : `Play ${entry.title}`} disabled={launch.pending} onClick={launch.onClick} data-centre="">{body}</button>;
}
