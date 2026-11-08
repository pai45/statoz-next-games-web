export { StreakScreen } from "./components/streak-screen";
export { StreakCelebrationHost } from "./components/streak-celebration-host";
export { streakMilestones, streakMilestoneFor } from "./data/milestones";
export { claimStreakMilestone } from "./rewards";
export {
  addLocalCalendarDays,
  bestStreak,
  coerceStreakSnapshot,
  consumeStreakCelebration,
  createSeededStreakSnapshot,
  currentStreak,
  localDateFromKey,
  localDateKey,
  readStreakSnapshot,
  recordStreakActivity,
  useIsStreakHydrated,
  useStreakSnapshot,
} from "./state/streak-store";
export type {
  StreakActivity,
  StreakCategory,
  StreakCelebration,
  StreakClaimResult,
  StreakMilestone,
  StreakMilestoneReward,
  StreakRecordResult,
  StreakSnapshot,
} from "./types";

