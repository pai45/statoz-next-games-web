/**
 * Hoop Duel's public API.
 *
 * Only the surface the launcher mounts. The engine, the renderer and the
 * progress store stay internal — nothing outside this module should be able to
 * reach a simulation step or a canvas painter.
 */
export { HoopDuel } from "./components/hoop-duel";
export type { HoopDuelProps } from "./components/hoop-duel";
