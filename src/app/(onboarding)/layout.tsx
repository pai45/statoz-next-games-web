/**
 * The pre-platform shell. No navigation chrome — these screens carry the
 * player from the first launch to the app, and nothing should lead away.
 */
export default function OnboardingLayout({ children }: LayoutProps<"/">) {
  return (
    <div
      className="flex min-h-dvh flex-col"
      style={{ background: "var(--ds-gradient-app-background)" }}
    >
      <main className="flex min-h-0 flex-1 flex-col pb-[env(safe-area-inset-bottom)]">
        {children}
      </main>
    </div>
  );
}
