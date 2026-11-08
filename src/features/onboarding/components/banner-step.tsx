import { SelectableTile } from "@statoz/design-system/games";

import { profileBannerOptions } from "@/mocks/onboarding";

import { BannerVisual } from "./banner-visual";
import styles from "./motion.module.css";
import { StepShell } from "./step-shell";

export type BannerStepProps = {
  selectedId: string;
  onSelect: (id: string) => void;
};

/** Step two: the colours that fly behind the dossier. */
export function BannerStep({ selectedId, onSelect }: BannerStepProps) {
  return (
    <StepShell
      title="CHOOSE YOUR BANNER"
      subtitle="The colours that fly behind your dossier."
    >
      <div
        role="radiogroup"
        aria-label="Banner"
        className="grid gap-4 lg:grid-cols-2"
      >
        {profileBannerOptions.map((banner, index) => (
          <div
            key={banner.id}
            className={styles.deal}
            style={
              {
                "--deal-delay": `${220 + index * 75}ms`,
                "--deal-tilt": index % 2 === 0 ? "-4deg" : "4deg",
              } as React.CSSProperties
            }
          >
            <SelectableTile
              label={banner.label}
              selected={banner.id === selectedId}
              onSelect={() => onSelect(banner.id)}
              className="aspect-[2.35] w-full"
            >
              <BannerVisual banner={banner} />

              <span
                className="absolute inset-x-0 bottom-0 flex h-[30px] items-center px-3"
                style={{
                  background:
                    "color-mix(in srgb, var(--ds-color-background-primary) 50%, transparent)",
                }}
              >
                <span
                  className="truncate font-display text-2xs font-extrabold"
                  style={{ letterSpacing: "var(--ds-tracking-ultra)" }}
                >
                  {banner.label.toUpperCase()}
                </span>
              </span>
            </SelectableTile>
          </div>
        ))}
      </div>
    </StepShell>
  );
}
