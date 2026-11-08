import { Button } from "@statoz/design-system/games";

/**
 * The half-width SKIP that sits under every step of a pack flow. Deliberately
 * quiet: it should be findable without competing with the reveal.
 */
export function PackSkipButton({
  onClick,
  label = "SKIP",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-6 pb-5"
      style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
    >
      <div className="pointer-events-auto w-1/2 max-w-xs">
        <Button variant="tonal" size="md" fullWidth onClick={onClick}>
          {label}
        </Button>
      </div>
    </div>
  );
}

/**
 * How far through the pack the player is. Flutter draws this as decoration;
 * here it is announced too, so the count is not carried by sight alone.
 */
export function ProgressDots({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div
      className="flex flex-col items-center gap-2 rounded-sm bg-background/95 px-3.5 py-2"
      role="status"
      aria-live="polite"
    >
      <span
        className="font-bold leading-compact text-muted"
        style={{
          fontSize: "var(--ds-text-2xs)",
          letterSpacing: "var(--ds-tracking-mega)",
        }}
      >
        CARD {current} OF {total}
      </span>
      <span aria-hidden className="flex items-center gap-1">
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className="h-[3px] rounded-sm transition-all duration-300"
            style={{
              width: index < current ? 24 : 14,
              background:
                index < current
                  ? "var(--ds-color-accent-cyan)"
                  : "color-mix(in srgb, var(--ds-color-text-muted) 28%, transparent)",
            }}
          />
        ))}
      </span>
    </div>
  );
}

/**
 * An unopened slot on the intro screen — one per card the pack is about to
 * flip, so the player can see how much is coming.
 */
export function MysterySlot() {
  return (
    <span
      aria-hidden
      className="grid h-[62px] w-[46px] place-items-center border bg-surface-elevated/50 font-display text-xl font-black text-cyan"
      style={{
        borderColor: "color-mix(in srgb, var(--ds-color-accent-cyan) 45%, transparent)",
      }}
    >
      ?
    </span>
  );
}

/**
 * A left-aligned section header over a group of cards: an accent tick, the
 * group name, and how many are in it. Static chrome, so it carries no glow.
 */
export function SummaryGroupHeader({
  title,
  count,
}: {
  title: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden className="h-4 w-[3px] bg-cyan/90" />
      <h2
        className="font-display font-black text-cyan"
        style={{
          fontSize: "var(--ds-text-sm)",
          letterSpacing: "var(--ds-tracking-ultra)",
        }}
      >
        {title}
      </h2>
      <span
        className="ds-tabular font-bold text-muted"
        style={{ fontSize: "var(--ds-text-xs)" }}
      >
        {count}
      </span>
    </div>
  );
}

/**
 * Docks the step's primary action to the bottom edge, so the content above can
 * scroll while the way forward stays put.
 */
export function BottomCtaBar({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="w-full border-t bg-background px-6 pt-3.5"
      style={{
        borderColor:
          "color-mix(in srgb, var(--ds-color-accent-cyan) 12%, transparent)",
        paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
      }}
    >
      <div className="mx-auto w-full max-w-sm">{children}</div>
    </div>
  );
}
