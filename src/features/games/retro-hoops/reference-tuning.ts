/** Calibrated from GameLog _k8IIS9n3dk; intervals are recording observations,
 * implementation values are authored fits in the existing 60 Hz/world scale. */
export const REFERENCE_TUNING={
  clockTicksPerStep:2, // Authored fit to the accelerated recording countdown; not native timing.
  source:"https://www.youtube.com/watch?v=_k8IIS9n3dk",
  passGatherTicks:8,passReleaseTicks:14,passRecoveryTicks:8,passMinFlightTicks:16,passWorldUnitsPerTick:9,
  shotTakeoffTick:10,shotReleaseTick:22,shotJumpVelocity:240,
  crowdFrameTicks:18,crowdFrames:4,
} as const;
