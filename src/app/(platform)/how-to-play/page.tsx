import type { Metadata } from "next";

import { HowToPlayHub } from "@/features/how-to-play";

export const metadata: Metadata = {
  title: "How to Play | StatOz",
  description:
    "Every playable mode explained: predictions, outcome markets, the card duel, the shootout, the bingo grid, football chess.",
};

export default function HowToPlayPage() {
  return <HowToPlayHub />;
}
