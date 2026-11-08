"use client";
import { useCallback, type PointerEvent } from "react";
import { usePrefersReducedMotion } from "@/shared/hooks/use-prefers-reduced-motion";

/**
 * Pointer-follow tilt for the holo cards. It writes three custom properties on
 * the element under the pointer — `--tilt-x`, `--tilt-y` (degrees) and
 * `--sheen` (a translate percentage) — and the stylesheet decides what moves.
 * Writing them directly keeps pointer moves out of React renders. Touch and
 * reduced-motion viewers get no tilt.
 */
export function useCardTilt({ x = 10, y = 8, sheen = 160 }: { x?: number; y?: number; sheen?: number } = {}) {
  const reduced = usePrefersReducedMotion();
  const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    if (reduced || event.pointerType === "touch") return;
    const el = event.currentTarget, box = el.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const px = (event.clientX - box.left) / box.width, py = (event.clientY - box.top) / box.height;
    el.style.setProperty("--tilt-x", `${((0.5 - py) * y).toFixed(2)}deg`);
    el.style.setProperty("--tilt-y", `${((px - 0.5) * x).toFixed(2)}deg`);
    el.style.setProperty("--sheen", `${((px - 0.5) * sheen).toFixed(1)}%`);
  }, [reduced, x, y, sheen]);
  const onPointerLeave = useCallback((event: PointerEvent<HTMLElement>) => {
    const el = event.currentTarget;
    el.style.removeProperty("--tilt-x");
    el.style.removeProperty("--tilt-y");
    el.style.removeProperty("--sheen");
  }, []);
  return { onPointerMove, onPointerLeave };
}
