/* eslint-disable @typescript-eslint/no-explicit-any -- Presentation reads the preserved JavaScript match state. */
/** Source pose identities from movement-identity-v3; holds are authored adaptations.
 * Recording sample times are evidence for sequence order, not native game cadence.
 */
export const bowlingHolds = [
  { id: 'bowler-4', until: 90, phase: 'release', sourceSecond: 132 },
  { id: 'bowler-5', until: 220, phase: 'follow-through', sourceSecond: 132.1 },
  { id: 'bowler-6', until: 460, phase: 'recovery', sourceSecond: 132.25 },
  { id: 'bowler-ready', until: Infinity, phase: 'ready', sourceSecond: null },
] as const;

export function bowlingPose(s: any) {
  if (s.phase === 'runup') {
    // The existing simulation releases at 500ms. Play the four preparation
    // poses once, in order, so the front-foot plant cannot jump back to pose 0.
    return 'bowler-' + Math.min(3,Math.floor((s.age+1e-6) / 125));
  }
  if (s.phase === 'delivery' && s.ball) {
    const release = [...s.events].reverse().find((event: any) => event.type === 'release');
    const age = release ? s.time - release.time : s.age;
    return bowlingHolds.find(hold => age < hold.until)!.id;
  }
  return 'bowler-ready';
}

export function runningPose(s: any, runner: any) {
  if (!s.run.moving) return 'runner-distant';
  // Use actual leg length, so short and long run paths share the same foot cadence.
  // Eight world units/pose is authored tuning. Opposite-facing source art is pending.
  const index=s.run.from?.findIndex((p:any)=>p.id===runner.id)??-1;
  const from=s.run.from?.[index],to=s.run.to?.[index];
  if(!from||!to)return 'runner-distant';
  const travelled=Math.hypot(to.x-from.x,to.y-from.y)*Math.max(0,Math.min(1,s.run.p));
  const step = Math.floor(travelled / 8) + runner.id * 4;
  return 'runner-stride-' + ((step % 8 + 8) % 8);
}
