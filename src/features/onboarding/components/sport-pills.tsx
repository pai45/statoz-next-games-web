import { accentVar, glow } from "@statoz/design-system/games";
import { sportModuleFor, sportOrder, type Sport } from "@/domain/sports";
import { SportIcon } from "@/features/matches";

export type SportPillsProps = {
  selected: Sport;
  onSelect: (sport: Sport) => void;
};

/** The sport strip above the league and club pickers. */
export function SportPills({ selected, onSelect }: SportPillsProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Primary sport"
      className="flex gap-2 overflow-x-auto pb-1"
    >
      {sportOrder.map((sport) => {
        const entry = sportModuleFor(sport);
        const active = sport === selected;
        const color = accentVar(entry.accent);

        return (
          <button
            key={sport}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={entry.label}
            onClick={() => onSelect(sport)}
            className="grid h-12 w-14 shrink-0 place-items-center border transition-[border-color,box-shadow,background] duration-150"
            style={{
              color,
              background: active
                ? "var(--ds-color-background-secondary)"
                : "color-mix(in srgb, var(--ds-color-background-secondary) 78%, transparent)",
              borderColor: `color-mix(in srgb, ${color} ${active ? 95 : 48}%, transparent)`,
              borderWidth: active ? 2 : 1,
              boxShadow: active
                ? glow(color, { alpha: 0.14, blur: 12, spread: -3 })
                : undefined,
            }}
          >
            <SportIcon
              sport={sport}
              size={22}
              className="transition-transform duration-150"
              style={{
                color: active
                  ? color
                  : `color-mix(in srgb, ${color} 62%, transparent)`,
                transform: active ? "scale(1.1)" : undefined,
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
