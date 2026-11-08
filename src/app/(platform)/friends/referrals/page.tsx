import type { Metadata } from "next";

import { ReferralScreen } from "@/features/friends";

export const metadata: Metadata = {
  title: "Refer a Friend | StatOz",
  description: "Share your invite link and earn 500 Oz Coins when a friend joins StatOz.",
};

export default function ReferralsPage() {
  return <ReferralScreen />;
}
