"use client";
import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/shared/hooks/use-prefers-reduced-motion";
import { publicAsset } from "@/shared/config";
import type { GameId } from "../types";
import styles from "./console-dashboard.module.css";

/** Play two complete passes, then reveal the still artwork underneath. */
export function SpotlightGameplay({ game, paused }: { game: GameId; paused: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const completedLoops = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [complete, setComplete] = useState(false);
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    const element = video.current;
    if (!element || reduced) return;
    let visible = true;
    const sync = () => {
      if (paused || !visible || document.hidden || completedLoops.current >= 2) element.pause();
      else void element.play().catch(() => { /* Artwork remains if autoplay is unavailable. */ });
    };
    const ended = () => {
      completedLoops.current += 1;
      if (completedLoops.current >= 2) {
        element.pause();
        setPlaying(false);
        setComplete(true);
      } else {
        element.currentTime = 0;
        sync();
      }
    };
    const observer = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false; sync(); });
    observer.observe(element);
    element.addEventListener("ended", ended);
    document.addEventListener("visibilitychange", sync); sync();
    return () => { observer.disconnect(); element.removeEventListener("ended", ended); document.removeEventListener("visibilitychange", sync); element.pause(); };
  }, [paused, reduced]);
  if (reduced) return null;
  return <video ref={video} src={publicAsset(`/assets/games/home/gameplay/${game}.mp4`)} className={styles.gameplayVideo}
    data-gameplay-preview={game} data-playing={playing || undefined} data-preview-complete={complete || undefined} muted playsInline preload="metadata" aria-hidden="true"
    onPlaying={() => { if (completedLoops.current < 2) setPlaying(true); }} onError={() => setPlaying(false)} />;
}
