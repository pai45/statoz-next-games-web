import { accentVar } from "@statoz/design-system/games";

const CYAN = accentVar("cyan");

export type QuickPlayHeaderProps = {
  /** How many free games sit under the header. */
  count: number;
};

/** The shelf label above a deck's free games: a title, a rule, and a count. */
export function QuickPlayHeader({ count }: QuickPlayHeaderProps) {
  return (
    <div className="flex items-center gap-2.5">
      <h3 className="font-display text-xs font-black leading-compact tracking-ultra">
        QUICK PLAY
      </h3>

      <span
        aria-hidden
        className="h-px flex-1"
        style={{ background: `color-mix(in srgb, ${CYAN} 28%, transparent)` }}
      />

      <span
        className="shrink-0 border px-2 py-1 font-display text-2xs font-black leading-compact tracking-wide"
        style={{
          color: CYAN,
          borderColor: `color-mix(in srgb, ${CYAN} 38%, transparent)`,
          background: `color-mix(in srgb, ${CYAN} 10%, transparent)`,
        }}
      >
        {count} FREE GAME{count === 1 ? "" : "S"}
      </span>
    </div>
  );
}
