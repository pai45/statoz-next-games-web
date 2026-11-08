"use client";

import { useClock } from "./use-clock";

/**
 * The clock a date-anchored demo runs on.
 *
 * The fixtures are static and dated around one anchor, so the wall clock walks
 * past them and every scheduled match would read as already kicked off. This
 * starts at the anchor instead and then ticks in real time, which keeps a
 * countdown live without letting the demo expire underneath the viewer.
 *
 * Null until the client hydrates — the server cannot know what time it is here.
 */

const startedAt = Date.now();

export function useDemoNow(anchorIso: string): number | null {
  const clock = useClock();
  if (clock == null) return null;
  return Date.parse(anchorIso) + (clock - startedAt);
}
