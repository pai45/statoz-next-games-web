import type { Metadata } from "next";
import { Suspense } from "react";

import { LeaderboardScreen } from "@/features/leaderboard";

export const metadata: Metadata = {
  title: "Leaderboard | StatOz",
  description:
    "Explore the Master leaderboard and every game's Weekly and Season rankings. Compare Rank Points and find players.",
};

export default function LeaderboardPage() {
  return <Suspense><LeaderboardScreen /></Suspense>;
}
