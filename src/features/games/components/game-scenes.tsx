"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { publicAsset } from "@/shared/config";
import type { GameId, GameSceneId } from "../types";
import { discoveryFamily } from "./game-discovery.generated";
import { sampleDiscoveryMotion } from "./discovery-motion";
import { gameCoverPath, hasBundledCover } from '../home-catalog';
import styles from "./discovery-card.module.css";

/** Original scene ids remain usable by existing non-card consumers. */
const fallbackScenes: Record<GameSceneId, GameId> = {
  "pitch-duel": "pitch-duel", "penalty-shootout": "penalty-shootout",
  "football-chess": "football-chess", "final-over": "final-over",
  "hoop-duel": "hoop-duel", "grand-prix-dash": "grand-prix-dash",
  "tennis-rally": "tennis-rally", quiz: "football-quiz", bingo: "football-bingo",
  "guess-player": "guess-player", "guess-driver": "guess-driver", "guess-winner": "tennis-guess-winner",
};
export const gameSceneAssets = Object.fromEntries(
  Object.entries(fallbackScenes).map(([id, game]) => [id, {
    src: `/assets/games/${game}.svg`, alt: discoveryFamily.games[game].title,
  }]),
) as Record<GameSceneId, { src: string; alt: string }>;

export type GameSceneProps = {
  game: GameId;
  opacity?: number;
  /** Retained for compatibility. The new artwork supplies its own setting. */
  washed?: boolean;
  animate?: boolean;
  locked?: boolean;
  /** A deterministic normalized pose for review, seeking and comparisons. */
  phase?: number;
};

export function GameScene(props: GameSceneProps) {
  if (hasBundledCover(props.game) || ["grand-prix-dash", "football-chess"].includes(props.game)) return <div className={styles.scene} aria-hidden="true" data-discovery-game={props.game} style={{opacity:props.opacity??1}}><Image src={publicAsset(gameCoverPath(props.game))} alt="" fill sizes="(min-width:1024px) 270px,70vw" unoptimized style={{objectFit:'cover'}}/></div>;
  if (props.game === "open-golf") return <div className={styles.scene} aria-hidden="true"><Image src={publicAsset(gameCoverPath(props.game))} alt="" fill unoptimized style={{objectFit:'cover'}} /></div>;
  if (props.game === "final-third") return <div className={styles.scene} aria-hidden="true" data-discovery-game={props.game} style={{opacity:props.opacity??1}}><Image src={publicAsset("/games/final-third/cover.webp")} alt="" fill sizes="(min-width: 1024px) 270px, 70vw" unoptimized style={{objectFit:"cover"}} /></div>;
  if (props.game === "pitch-rush") return <div className={styles.scene} aria-hidden="true" data-discovery-game={props.game} style={{opacity:props.opacity??1}}><Image src={publicAsset("/games/pitch-rush/cover.webp")} alt="" fill sizes="(min-width: 1024px) 270px, 70vw" unoptimized style={{objectFit:"cover"}} /></div>;
  if (props.game === "vibe-basketball") return <div className={styles.scene} aria-hidden="true" data-discovery-game={props.game} style={{opacity:props.opacity??1}}><Image src={publicAsset("/games/vibe-basketball/gameplay.jpg")} alt="" fill sizes="(min-width: 1024px) 270px, 70vw" unoptimized style={{objectFit:"cover"}} /></div>;
  if (props.game === "stadium-cricket") return <div className={styles.scene} aria-hidden="true" data-discovery-game={props.game} style={{opacity:props.opacity??1}}><Image src={publicAsset("/games/stadium-cricket/stadium-preview.jpg")} alt="" fill sizes="(min-width: 1024px) 270px, 70vw" unoptimized style={{objectFit:"cover"}} /></div>;
  if (["retro-football","retro-hoops","retro-innings","retro-circuit"].includes(props.game)) return <div className={styles.scene} aria-hidden="true" data-discovery-game={props.game} style={{opacity:props.opacity??1}}><Image src={publicAsset(`/assets/games/identity/${props.game}.svg`)} alt="" fill sizes="(min-width: 1024px) 270px, 70vw" unoptimized className={styles.layerImage}/></div>;
  if (props.game === "grand-prix-dash") return <div className={styles.scene} aria-hidden="true" data-discovery-game="grand-prix-dash" style={{opacity: props.opacity ?? 1}}><Image src={publicAsset("/assets/games/rally-dash/scene.svg")} alt="" fill sizes="(min-width: 1024px) 240px, 50vw" unoptimized className={styles.layerImage} /></div>;
  return <CatalogGameScene {...props} />;
}
function CatalogGameScene({ game, opacity = 1, animate = true, locked = false, phase }: GameSceneProps) {
  const root = useRef<HTMLDivElement>(null);
  const scene = discoveryFamily.games[game === "f1-racing" ? "grand-prix-dash" : game === "football-shooting" ? "penalty-shootout" : game === "retro-football-2" ? "pitch-duel" : ["open-golf","archery-test","longbow"].includes(game) ? "tennis-rally" : ["cricketer","yorker","stick-cricket","retro-innings"].includes(game) ? "final-over" : ["retro-hoops","rim-rush","hoop-legacy"].includes(game) ? "hoop-duel" : game];

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const nodes = element.querySelectorAll<HTMLDivElement>("[data-discovery-layer]");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false, request = 0, started = 0;
    const paint = (value: number) => {
      scene.layers.forEach((layer, index) => {
        const pose = sampleDiscoveryMotion(layer.frames, value);
        nodes[index].style.transform = `translate(${pose.x / 2.2}%, ${pose.y / 1.6}%) rotate(${pose.rotate}deg) scale(${pose.scale})`;
        nodes[index].style.opacity = String(pose.opacity);
      });
    };
    const tick = (time: number) => {
      if (!started) started = time;
      paint(((time - started) % discoveryFamily.cycleMs) / discoveryFamily.cycleMs);
      request = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(request);
      request = 0; started = 0;
      if (animate && !locked && phase === undefined && visible && !document.hidden && !reduced.matches) {
        request = requestAnimationFrame(tick);
      } else paint(phase ?? discoveryFamily.stillPhase);
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    observer.observe(element);
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    sync();
    return () => {
      cancelAnimationFrame(request);
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
    };
  }, [scene, animate, locked, phase]);

  return <div ref={root} className={styles.scene} aria-hidden="true" data-discovery-game={game} style={{ opacity }}>
    {scene.layers.map(layer => {
      const pose = sampleDiscoveryMotion(layer.frames, phase ?? discoveryFamily.stillPhase);
      return <div key={layer.id} className={styles.layer} data-discovery-layer={layer.id} style={{
        transformOrigin: `${scene.pivot[0] / 2.2}% ${scene.pivot[1] / 1.6}%`,
        transform: `translate(${pose.x / 2.2}%, ${pose.y / 1.6}%) rotate(${pose.rotate}deg) scale(${pose.scale})`, opacity: pose.opacity,
      }}>
        <Image src={publicAsset(`/assets/games/discovery/${layer.asset}`)} alt="" fill sizes="(min-width: 1024px) 240px, 50vw" unoptimized className={styles.layerImage} />
      </div>;
    })}
  </div>;
}
