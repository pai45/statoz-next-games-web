import type { Metadata } from "next";

import { AuthBoundary } from "@/features/auth";
import { StreakScreen } from "@/features/streaks";

export const metadata: Metadata = {
  title: "Streaks · StatOz",
  description: "Track daily StatOz activity and claim streak rewards.",
};

export default function StreaksPage() {
  return (
    <AuthBoundary
      fullScreen
      intent="view your streaks"
      message="Your streak calendar and rewards are saved to your player account."
      returnTo="/streaks"
    >
      <StreakScreen />
    </AuthBoundary>
  );
}

