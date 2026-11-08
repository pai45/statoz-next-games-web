import type { Metadata } from "next";

import { ProfileScreen } from "@/features/profile";

export const metadata: Metadata = {
  title: "Profile | StatOz",
  description:
    "Your StatOz Games player card, earned trophies, personal records, and customized look.",
};

export default function ProfilePage() {
  return <ProfileScreen />;
}
