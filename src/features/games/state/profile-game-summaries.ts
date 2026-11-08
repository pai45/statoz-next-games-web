"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useAuthSession } from "@/features/auth";
import { usePitchDuelCareer } from "../pitch-duel/state/progress";
import { useShootoutProgress } from "../penalty-shootout/state/shootout-progress";
import { useTennisProgress } from "../tennis/state/tennis-progress";
import { useOpenGolfProgress } from "../open-golf/state/open-golf-progress";
import { useHomeRecents } from "./home-recents";
import { buildProfileGameSummaries } from "./profile-game-model";

function subscribe(refresh: () => void) {
  window.addEventListener("storage", refresh);
  window.addEventListener("focus", refresh);
  return () => { window.removeEventListener("storage", refresh); window.removeEventListener("focus", refresh); };
}
function rallySave() {
  try {
    return localStorage.getItem("statoz.next.games-web.rally-dash.v1");
  } catch { return null; }
}

/** Games owns the save adapters; the profile receives a read-only public view. */
export function useProfileGameSummaries() {
  const { email } = useAuthSession();
  const recents = useHomeRecents(), pitchDuel = usePitchDuelCareer(), shootout = useShootoutProgress(), tennis = useTennisProgress();
  const golf = useOpenGolfProgress(email);
  const rally = useSyncExternalStore(subscribe, rallySave, () => null);
  return useMemo(() => buildProfileGameSummaries({ recents, pitchDuel, shootout, tennis, golf, rally }), [recents, pitchDuel, shootout, tennis, golf, rally]);
}
