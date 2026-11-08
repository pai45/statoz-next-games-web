// The playable game is now Rally Dash (../rally-dash). This module keeps the legacy
// Grand Prix progress that the profile still reads.

/**
 * The mode's contribution to the profile, and the demo reset. The field, the
 * engine, and every rule stay inside the module.
 */
export {
  readGrandPrixStats,
  resetGrandPrixProgress,
  useGrandPrixStats,
  type GrandPrixStats,
} from "./state/grand-prix-progress";
