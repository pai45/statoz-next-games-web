import { accentVar, withAlpha } from "@statoz/design-system/games";

const CYAN = accentVar("cyan");

export type SetupTopBarProps = {
  skipLabel: string;
  onSkip: () => void;
  showSkip?: boolean;
};

/** Setup's own chrome: a cyan tally, the screen's name, and the way out. */
export function SetupTopBar({ skipLabel, onSkip, showSkip = true }: SetupTopBarProps) {
  return (
    <header
      className="relative z-10 flex h-15 shrink-0 items-center gap-3 border-b pl-[18px] pr-2.5"
      style={{
        background: withAlpha("var(--ds-color-background-elevated)", 0.55),
        borderColor: CYAN,
        borderBottomWidth: "1.4px",
      }}
    >
      <span aria-hidden className="h-[22px] w-1 shrink-0" style={{ background: CYAN }} />

      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <p
          className="truncate font-display text-base font-black leading-tight"
          style={{ letterSpacing: "var(--ds-tracking-ultra)" }}
        >
          PROFILE SETUP
        </p>
        <p
          className="truncate font-display text-2xs font-extrabold leading-compact"
          style={{
            color: withAlpha(CYAN, 0.7),
            letterSpacing: "var(--ds-tracking-mega)",
          }}
        >
          SYS://OPERATIVE-INIT
        </p>
      </div>

      {showSkip ? <button
        type="button"
        onClick={onSkip}
        className="shrink-0 px-3 py-2 font-display text-xs font-extrabold transition-opacity hover:opacity-75"
        style={{ color: CYAN, letterSpacing: "var(--ds-tracking-mega)" }}
      >
        {skipLabel}
      </button> : null}
    </header>
  );
}
