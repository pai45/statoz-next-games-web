"use client";

import { useEffect, type RefObject } from "react";
import { usePrefersReducedMotion } from "@/shared/hooks/use-prefers-reduced-motion";
import { homeLaunchEvent } from "../shared/navigation";
import type { GameId } from "../types";

/** Rotate the visible spotlight after 30 seconds without browsing activity. */
export function useSpotlightIdle({ root, game, order, paused, onNext }: {
  root: RefObject<HTMLDivElement | null>;
  game: GameId;
  order: readonly GameId[];
  paused: boolean;
  onNext: (game: GameId) => void;
}) {
  const reduced = usePrefersReducedMotion();
  const orderKey = order.join(",");
  useEffect(() => {
    const opening = root.current?.querySelector("section[aria-label='Game spotlight']");
    if (!opening || paused || reduced) return;
    const games = orderKey.split(",") as GameId[];
    if (games.length < 2) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let visible = true, launched = false;
    const reset = () => {
      clearTimeout(timer);
      if (!visible || document.hidden || launched) return;
      timer = setTimeout(() => {
        if (document.querySelector("dialog[open]")) { reset(); return; }
        const next = games[(games.indexOf(game) + 1) % games.length];
        onNext(next);
        const rail = root.current?.querySelector<HTMLElement>('[data-shelf-id="lineup"]');
        const cover = rail?.querySelector<HTMLElement>(`[data-game-cover="${next}"]`);
        if (rail && cover) {
          const bounds = rail.getBoundingClientRect(), card = cover.getBoundingClientRect();
          if (card.left < bounds.left || card.right > bounds.right) {
            rail.scrollTo({ left: rail.scrollLeft + card.left - bounds.left - (bounds.width - card.width) / 2, behavior: "smooth" });
          }
        }
      }, 30_000);
    };
    const launch = () => { launched = true; clearTimeout(timer); };
    const observer = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false; reset(); });
    observer.observe(opening);
    const events = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"] as const;
    for (const event of events) window.addEventListener(event, reset, { passive: true, capture: true });
    document.addEventListener("visibilitychange", reset);
    window.addEventListener(homeLaunchEvent, launch);
    reset();
    return () => {
      clearTimeout(timer); observer.disconnect();
      for (const event of events) window.removeEventListener(event, reset, true);
      document.removeEventListener("visibilitychange", reset);
      window.removeEventListener(homeLaunchEvent, launch);
    };
  }, [root, game, orderKey, paused, reduced, onNext]);
}
