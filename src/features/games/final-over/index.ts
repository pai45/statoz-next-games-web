/**
 * Final Over's public API.
 *
 * Only the surface the launcher mounts. The engine, the renderer and the
 * progress store stay internal — nothing outside this module should be able to
 * reach a resolver or a canvas painter.
 */
export { FinalOver } from "./components/final-over";
export type { FinalOverProps } from "./components/final-over";
