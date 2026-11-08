import type { Metadata } from "next";
import { Suspense } from "react";

import { XpProgressScreen } from "@/features/profile";

export const metadata: Metadata = {
  title: "XP Progress | StatOz",
  description: "Review your StatOz level, XP history, and mastery tracks.",
};

export default function XpProgressPage() {
  return (
    <Suspense fallback={null}>
      <XpProgressScreen />
    </Suspense>
  );
}
