import {
  ArrowLeftIcon,
  ArrowRightIcon,
  Button,
  StepMeter,
} from "@statoz/design-system/games";

export type SetupDockProps = {
  activeStep: number;
  stepCount: number;
  /** The forward action's label — NEXT until the last step, then FINISH SETUP. */
  ctaLabel: string;
  /** Whether the forward action still advances, rather than completing setup. */
  isNext: boolean;
  canGoPrevious: boolean;
  canAdvance?: boolean;
  helper: string;
  onPrevious: () => void;
  onNext: () => void;
};

/**
 * The bottom dock: how far along the player is, the pair of pager actions, and
 * a line saying what this step is for.
 */
export function SetupDock({
  activeStep,
  stepCount,
  ctaLabel,
  isNext,
  canGoPrevious,
  canAdvance = true,
  helper,
  onPrevious,
  onNext,
}: SetupDockProps) {
  return (
    <div className="relative z-10 mx-auto w-full max-w-[32.5rem] shrink-0 px-6 pb-[1.375rem] pt-4 lg:max-w-4xl">
      <StepMeter
        total={stepCount}
        active={activeStep}
        label="Profile setup progress"
      />

      <div className="mt-3.5 flex w-full gap-3.5">
        {canGoPrevious ? (
          <Button
            variant="tonal"
            size="lg"
            fullWidth
            onClick={onPrevious}
            leadingIcon={<ArrowLeftIcon size={20} />}
            className="flex-1"
          >
            PREVIOUS
          </Button>
        ) : null}

        <Button
          variant="solid"
          size="lg"
          fullWidth
          glow
          onClick={onNext}
          disabled={!canAdvance}
          trailingIcon={isNext ? <ArrowRightIcon size={20} /> : undefined}
          className="flex-1"
        >
          {ctaLabel}
        </Button>
      </div>

      <p className="mt-3 w-full max-w-[32.5rem] text-center text-sm text-muted">
        {helper}
      </p>
    </div>
  );
}
