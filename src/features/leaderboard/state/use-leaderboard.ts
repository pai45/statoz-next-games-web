"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuthSession } from "@/features/auth";
import type { PlayerStanding } from "@/features/profile/standing";
import { leaderboardParticipants, leaderboardSeed } from "@/mocks/leaderboard/rank-points";
import { leaderboardGameIds } from "../catalog";
import { leaderboardWindow } from "../periods";
import { buildLeaderboard } from "../ranking";
import { leaderboardHref, parseLeaderboardSelection, searchBoardSelection } from "../selection";

const minuteSnapshot = () => Math.floor(Date.now() / 60_000) * 60_000;
const serverSnapshot = () => null;
function subscribeClock(listener: () => void) {
  const timer = window.setInterval(listener, 60_000);
  window.addEventListener("pageshow", listener);
  document.addEventListener("visibilitychange", listener);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener("pageshow", listener);
    document.removeEventListener("visibilitychange", listener);
  };
}

export function useLeaderboard(player: PlayerStanding | null = null) {
  const session = useAuthSession();
  const query = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const searching = pathname.endsWith("/search");
  const serialized = query.toString();
  const selection = useMemo(() => searching
    ? searchBoardSelection(new URLSearchParams(serialized))
    : parseLeaderboardSelection(new URLSearchParams(serialized)), [searching, serialized]);
  const canonical = leaderboardHref(selection, searching);
  useEffect(() => {
    if (`${pathname}?${serialized}` !== canonical) router.replace(canonical, { scroll: false });
  }, [canonical, pathname, router, serialized]);

  const now = useSyncExternalStore(subscribeClock, minuteSnapshot, serverSnapshot);
  const periodWindow = useMemo(() => now === null ? null : leaderboardWindow(selection.period, now), [now, selection.period]);
  const season = useMemo(() => now === null ? null : leaderboardWindow("season", now), [now]);
  const participants = useMemo(() => {
    if (!player?.ready || session.status !== "authenticated" || !session.email) return leaderboardParticipants;
    return [...leaderboardParticipants, {
      id: `local:${leaderboardSeed(session.email)}`,
      name: player.displayName,
      xp: player.totalXp,
      avatarSrc: player.avatarSrc,
      frameColor: player.frameColor,
      isUser: true,
    }];
  }, [player, session.email, session.status]);
  const entries = useMemo(() => periodWindow ? buildLeaderboard({ participants, games: leaderboardGameIds, selection, window: periodWindow }) : [], [participants, periodWindow, selection]);
  return { selection, entries, user: entries.find((entry) => entry.isUser) ?? null, now, periodWindow, season, session };
}
