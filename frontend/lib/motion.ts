/**
 * Whether the user asked the OS to reduce motion. Canvas animations live in JS,
 * so CSS media queries alone cannot disable them.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Duration helper: 0 when motion is reduced, otherwise the provided duration. */
export function motionDuration(ms: number): number {
  return prefersReducedMotion() ? 0 : ms;
}
