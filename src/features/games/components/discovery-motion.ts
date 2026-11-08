export type DiscoveryPose = { x: number; y: number; rotate: number; scale: number; opacity: number };
export type DiscoveryFrame = DiscoveryPose & { at: number };
export type DiscoveryLayer = { id: string; asset: string; frames: DiscoveryFrame[] };
export type DiscoveryScene = { flutter: string; sport: string; title: string; kind: string; accent: string; pivot: number[]; layers: DiscoveryLayer[] };
export type DiscoveryFamily = { version: number; width: number; height: number; cycleMs: number; stillPhase: number; sourceHash: string; games: Record<string, DiscoveryScene> };

/** Same smoothstep and normalized tracks as Flutter; no random or wall-clock poses. */
export function sampleDiscoveryMotion(frames: DiscoveryFrame[], phase: number): DiscoveryPose {
  const identity: DiscoveryPose = { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 };
  if (!frames.length) return identity;
  const t = Math.max(0, Math.min(1, phase));
  let index = frames.findIndex(frame => frame.at >= t);
  if (index < 0) index = frames.length - 1;
  const a = frames[Math.max(0, index - 1)], b = frames[index];
  const u = b.at === a.at ? 0 : (t - a.at) / (b.at - a.at);
  const eased = u * u * (3 - 2 * u);
  return { x: a.x + (b.x - a.x) * eased, y: a.y + (b.y - a.y) * eased, rotate: a.rotate + (b.rotate - a.rotate) * eased, scale: a.scale + (b.scale - a.scale) * eased, opacity: a.opacity + (b.opacity - a.opacity) * eased };
}
