import { Suspense } from "react";
import { PlatformLandscape } from "@/features/games/shared/mobile-viewport/mobile-game-viewport";
import { PlatformBreadcrumbs, PlatformTopBar } from "@/features/shell";
import frameStyles from "@/features/shell/components/platform-frame.module.css";

/** One command bar; game and shop orientation policies remain feature-owned. */
export default function PlatformLayout({ children }: LayoutProps<"/">) {
  return <Suspense fallback={<div role="status">Opening StatOz…</div>}><PlatformLandscape>
    <div className={frameStyles.frame}>
      <a href="#platform-content" className={frameStyles.skip}>Skip to content</a>
      <PlatformTopBar />
      <PlatformBreadcrumbs />
      <main id="platform-content" className={frameStyles.main}>{children}</main>
    </div>
  </PlatformLandscape></Suspense>;
}
