import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { supportChannelFor, supportChannels, TransmissionCompose } from "@/features/profile";

export function generateStaticParams() {
  return supportChannels.map((channel) => ({ channel: channel.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/profile/talk-to-statoz/[channel]">): Promise<Metadata> {
  const { channel } = await params;
  const found = supportChannelFor(channel);
  if (!found) return { title: "Talk to StatOz | StatOz" };
  return {
    title: `${found.title} | Talk to StatOz | StatOz`,
    description: found.composeHint,
  };
}

export default async function TransmissionPage({
  params,
}: PageProps<"/profile/talk-to-statoz/[channel]">) {
  const { channel } = await params;
  const found = supportChannelFor(channel);
  if (!found) notFound();
  return <TransmissionCompose channel={found} />;
}
