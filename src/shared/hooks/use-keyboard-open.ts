"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether the on-screen keyboard is covering the page.
 *
 * Flutter reads `MediaQuery.viewInsets.bottom`; the web's equivalent is the
 * gap between the layout viewport and the visual one, which only an on-screen
 * keyboard opens by this much. Desktop browsers never report it, so a screen
 * that folds chrome away while typing simply keeps everything.
 */

const threshold = 140;

function subscribe(listener: () => void): () => void {
  const viewport = window.visualViewport;
  if (!viewport) return () => {};
  viewport.addEventListener("resize", listener);
  return () => viewport.removeEventListener("resize", listener);
}

function getSnapshot(): boolean {
  const viewport = window.visualViewport;
  return viewport != null && window.innerHeight - viewport.height > threshold;
}

export function useKeyboardOpen(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
