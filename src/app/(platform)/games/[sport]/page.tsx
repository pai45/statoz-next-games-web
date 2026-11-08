import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { gameSportModules, gameSportOrder, type GameSport } from "@/domain/game-sports";
import { gameCatalogHref } from "@/features/games/shared/navigation";

/** Every sport is known up front, so all five decks prerender. */
export function generateStaticParams() {
  return gameSportOrder.map((sport) => ({ sport }));
}

function resolve(sport: string): GameSport | null {
  return sport in gameSportModules ? (sport as GameSport) : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/games/[sport]">): Promise<Metadata> {
  const sport = resolve((await params).sport);
  if (!sport) return { title: "Games" };

  const label = gameSportModules[sport].label;
  return {
    title: `${label} games`,
    description: `Every StatOz game you can play on ${label.toLowerCase()}.`,
  };
}

export default async function SportGamesPage({ params }: PageProps<"/games/[sport]">) {
  const sport = resolve((await params).sport);
  if (!sport) notFound();

  redirect(gameCatalogHref(sport));
}
