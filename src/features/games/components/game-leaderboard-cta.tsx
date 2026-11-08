import Link from "next/link";

import { TrophyIcon } from "@statoz/design-system/games";
import { leaderboardHref } from "@/features/leaderboard/navigation";

import type { GameId } from "../types";

/** Shared, deliberately non-glowing lobby exit into the selected game's board. */
export function GameLeaderboardCta({ gameId }: { gameId: GameId }) {
  return (
    <Link
      href={leaderboardHref({ ladder: gameId, period: "weekly" })}
      className="flex min-h-11 w-full items-center justify-center gap-2 border border-default bg-elevated px-4 font-display text-2xs font-black tracking-label text-default transition-colors hover:border-strong hover:bg-overlay-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-cyan"
    >
      <TrophyIcon size={17} aria-hidden="true" />
      VIEW LEADERBOARD
    </Link>
  );
}
