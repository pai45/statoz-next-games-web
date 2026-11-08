import { Suspense } from "react";

import { notFound } from "next/navigation";

import { sportOrder, type Sport } from "@/domain/sports";
import { DeckEditor } from "@/features/cards-decks";

export function generateStaticParams() {
  return sportOrder.map((sport) => ({ sport }));
}

export default async function DeckPage({ params }: PageProps<"/decks/[sport]">) {
  const { sport } = await params;
  if (!sportOrder.includes(sport as Sport)) notFound();
  return (
    <Suspense fallback={null}>
      <DeckEditor sport={sport as Sport} />
    </Suspense>
  );
}
