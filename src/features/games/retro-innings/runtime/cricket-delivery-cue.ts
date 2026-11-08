/** Native source frame007 shows a white pitch arrow. Its placement here follows
 * the existing incoming trajectory, whose ground contact is at flight fraction .67.
 * This describes our simulation, not recovered SNES physics or target-control logic.
 */
type DeliveryView = {
  status: string;
  phase: string;
  ball?: { hit: boolean } | null;
  plan?: { lane: string; x?: number; deliveryBounced?: boolean; landing?: {x:number;y:number;z:number} } | null;
  camera: { x: number; y: number };
};
type Families = Record<string, { target: readonly number[] }>;

export function deliveryLandingMarker(state: DeliveryView, families: Families) {
  if (state.status !== 'playing' || !['runup', 'delivery'].includes(state.phase)
    || !state.plan || state.ball?.hit) return null;
  const family = families[state.plan.lane] ?? families.off;
  if (!family) return null;
  const targetX = Number.isFinite(state.plan.x) ? state.plan.x!
    : state.plan.lane === 'wide' ? 477 : 400 + family.target[0] - 98;
  const point = state.plan.landing ?? { x: 420 + (targetX - 420) * .67, y: 432 + (350 - 432) * .67, z: 0 };
  return {
    point,
    screen: { x: point.x - state.camera.x, y: point.y - state.camera.y },
    stage: state.plan.deliveryBounced ? 'bounced' : 'anticipated',
    anchor: 'arrow-tip',
  } as const;
}

// A seven-pixel upward arrow with a short stem, matching the observed source cue.
// The tip identifies the bounce location; shade is a ground shadow, not a glow.
export const landingArrowRows = ['...#...', '..###..', '.#####.', '#######', '..###..', '..###..', '..###..'] as const;
