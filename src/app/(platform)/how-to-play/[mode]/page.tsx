import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { guideFor, guides, HowToPlayGuide } from "@/features/how-to-play";

export function generateStaticParams() {
  return guides.map((guide) => ({ mode: guide.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/how-to-play/[mode]">): Promise<Metadata> {
  const { mode } = await params;
  const guide = guideFor(mode);
  if (!guide) return { title: "How to Play | StatOz" };
  return {
    title: `${guide.title} | How to Play | StatOz`,
    description: guide.purpose,
  };
}

export default async function HowToPlayGuidePage({
  params,
}: PageProps<"/how-to-play/[mode]">) {
  const { mode } = await params;
  const guide = guideFor(mode);
  if (!guide) notFound();
  return <HowToPlayGuide guide={guide} />;
}
