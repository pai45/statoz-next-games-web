import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { GameLauncher, gameForHref, playableGameHrefs } from "@/features/games";

/**
 * Every playable route is known up front, so all of them prerender — which the
 * GitHub Pages export requires, since it has no server to resolve a slug.
 */
export function generateStaticParams() {
  return playableGameHrefs().map((href) => ({
    slug: href.replace(/^\/play\//, "").split("/"),
  }));
}

async function resolve(params: Promise<{ slug: string[] }>) {
  const { slug } = await params;
  return gameForHref(`/play/${slug.join("/")}`);
}

// Enable native safe-area insets for this game’s full-screen mobile frame.
export async function generateViewport({ params }: PageProps<"/play/[...slug]">): Promise<Viewport> {
  const found = await resolve(params);
  if (found && ["cricketer","yorker","f1-racing","football-shooting","retro-football-2","stick-cricket","archery-test","longbow"].includes(found.game)) return {viewportFit:"cover",themeColor:"#17201b"};
  if (found?.game === "holdover") return {viewportFit:"cover",themeColor:"#050607"};
  if (found?.game === "hoop-legacy") return {viewportFit:"cover",themeColor:"#05070b"};
  if (found?.game === "rim-rush") return {viewportFit:"cover",themeColor:"#14392e"};
  if (found?.game === "football-chess") return {viewportFit:"cover",themeColor:"#24170d"};
  if (found?.game === "grand-prix-dash") return {viewportFit:"cover",themeColor:"#1b1714"};
  return found?.game === "vibe-basketball" ? { viewportFit: "cover", themeColor: "#05070c" } : {};
}

export async function generateMetadata({
  params,
}: PageProps<"/play/[...slug]">): Promise<Metadata> {
  const found = await resolve(params);
  if (!found) return { title: "Play" };

  return {
    title: found.entry.title,
    description: found.entry.subtitle,
  };
}

export default async function PlayPage({ params }: PageProps<"/play/[...slug]">) {
  const found = await resolve(params);
  if (!found) notFound();

  return <Suspense fallback={<div role="status">Opening game…</div>}><GameLauncher game={found.game} entry={found.entry} /></Suspense>;
}
