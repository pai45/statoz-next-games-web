import { PlatformFrameGuard } from "@/features/games/shared/mobile-viewport/mobile-game-viewport";

/**
 * The shell a game owns outright. No navigation chrome: a match and a pack
 * reveal each take the whole screen, and nothing should lead away mid-play.
 */
export default function FullscreenLayout({ children }: LayoutProps<"/">) {
  return (
    <div
      className="flex min-h-dvh flex-col"
      style={{ background: "var(--ds-gradient-app-background)" }}
    >
      <main className="flex min-h-0 flex-1 flex-col"><PlatformFrameGuard>{children}</PlatformFrameGuard></main>
    </div>
  );
}
