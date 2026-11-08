import type { Metadata } from "next";

import { DeckLocker } from "@/features/cards-decks";

export const metadata: Metadata = {
  title: "Deck Locker | StatOz",
  description: "Create, apply, and tune your active StatOz squads across every sport.",
};

export default function DeckLockerPage() {
  return <DeckLocker />;
}
