/**
 * Tennis Rally's public API.
 *
 * Only the surface the launcher mounts. The engine, the renderer and the
 * progress store stay internal — nothing outside this module should be able to
 * reach a simulation step or a canvas painter.
 */
export { TennisRally } from "./components/tennis-rally";
export type { TennisRallyProps } from "./components/tennis-rally";
