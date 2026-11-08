import type { Metadata } from "next";
import { Suspense } from "react";

import { LeaderboardSearchScreen } from "@/features/leaderboard";

export const metadata: Metadata = { title: "Player Search | StatOz" };

export default function LeaderboardSearchPage() {
  return <Suspense><LeaderboardSearchScreen /></Suspense>;
}
