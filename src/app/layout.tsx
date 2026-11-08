import {HostReady} from '@/shared/host-ready';
import type { Metadata } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";

import { AuthProvider } from "@/features/auth";
import { StreakCelebrationHost } from "@/features/streaks/components/streak-celebration-host";

import { DeviceAssets } from "@/features/device-assets/device-assets";

import { MobileGameNavigationBridge } from "@/features/games/shared/mobile-viewport/mobile-game-viewport";

import "./globals.css";

/**
 * Space Grotesk and Orbitron are self-hosted rather than pulled through
 * `next/font/google`. The Google loader fetches the font at build time and
 * silently substitutes an Arial-metric fallback when that request fails, which
 * left the whole app — body copy and Orbitron display type alike — rendering
 * as Arial on any offline build. Shipping local font files makes the typography
 * deterministic. Both are variable fonts, so one file covers every weight.
 */
const spaceGrotesk = localFont({
  src: "./fonts/space-grotesk-variable.ttf",
  weight: "300 700",
  style: "normal",
  variable: "--font-space-grotesk",
  display: "swap",
});

const orbitron = localFont({
  src: "./fonts/orbitron-latin-variable.woff2",
  weight: "400 900",
  style: "normal",
  variable: "--font-orbitron",
  display: "swap",
});

export const metadata: Metadata = {
  other: { "statoz-assets-build": process.env.NEXT_PUBLIC_ASSET_BUILD_ID || "development" },
  title: "StatOz Games Demo",
  description: "Sports arcade demo and UI reference.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${orbitron.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col"><HostReady/>
        <Suspense fallback={null}><MobileGameNavigationBridge /></Suspense>
        <AuthProvider>
          <DeviceAssets>
            {children}
            <StreakCelebrationHost />
          </DeviceAssets>
        </AuthProvider>
      </body>
    </html>
  );
}
