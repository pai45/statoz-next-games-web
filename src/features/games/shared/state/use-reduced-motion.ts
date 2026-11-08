"use client";

/**
 * Every game asks whether the viewer wants less motion before running a rAF
 * loop. The answer is not specific to games — the profile's counting telemetry
 * needs it too — so it lives in `shared` and is re-exported here, where the
 * games already reach for it.
 */
export { usePrefersReducedMotion } from "@/shared/hooks";
