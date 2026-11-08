export function usesMobileLandscape(game: string): boolean {
  // Final Third is designed portrait-first (swipe up at the goal), like a phone football game.
  return game !== 'tennis-rally' && game !== 'final-third' && game !== 'archery-test' && game !== 'football-shooting';
}

/** Phones only (either side of the screen at most 500px), not tablets: these get the landscape platform shell. */
export const phoneQuery = '(pointer: coarse) and (max-width: 500px), (pointer: coarse) and (max-height: 500px)';

/**
 * Whether an app route takes over the whole screen rather than living inside
 * the rotated platform shell. Games, streaks and sign-in leave it; the shop
 * stays in the same landscape shell as the other platform tabs.
 */
export function leavesPlatformFrame(pathname: string): boolean {
  return /^\/(play|streaks|login|onboarding)(\/|$)/.test(pathname);
}

export function landscapeGeometry(width: number, height: number) {
  return {
    width: Math.max(width, height),
    height: Math.min(width, height),
    transform: height > width ? `translateX(${width}px) rotate(90deg)` : 'none',
  };
}
