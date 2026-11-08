"use client";

import { AuthBoundary } from "@/features/auth";
import { PlayerHub } from "./player-hub";

export function ProfileScreen({ initialTab }: { initialTab?: string }) {
  return <AuthBoundary allowGuest intent="view your player profile" message="Your games, achievements, and player identity." returnTo="/profile"><PlayerHub initialTab={initialTab} /></AuthBoundary>;
}
