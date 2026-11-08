import type { Metadata } from "next";

import { OnboardingScreen } from "@/features/onboarding";

export const metadata: Metadata = {
  title: "Set up your profile | StatOz",
  description:
    "Pick your avatar, your banner, and the clubs you follow before entering StatOz.",
};

export default function OnboardingPage() {
  return <OnboardingScreen />;
}
