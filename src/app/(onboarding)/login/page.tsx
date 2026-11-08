import type { Metadata } from "next";

import { AuthScreen } from "@/features/auth";

export const metadata: Metadata = {
  title: "Sign up or log in | StatOz",
  description: "Join StatOz with your email or a Google account.",
};

export default function LoginPage() {
  return <AuthScreen />;
}
