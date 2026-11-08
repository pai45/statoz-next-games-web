import type { Metadata } from "next";

import { FriendsArena } from "@/features/friends";

export const metadata: Metadata = {
  title: "Friends Arena | StatOz",
  description:
    "Search the rival network by tag or username, add friends, and challenge them from a friends-scoped leaderboard.",
};

export default function FriendsPage() {
  return <FriendsArena />;
}
