import type { Metadata } from "next";

import { AllCardsScreen } from "@/features/profile";

export const metadata: Metadata = { title: "All Cards | StatOz", description: "Browse every StatOz card in your collection." };

export default function CardsPage() { return <AllCardsScreen />; }
