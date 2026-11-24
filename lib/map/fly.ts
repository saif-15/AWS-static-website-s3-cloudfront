/**
 * Smooth zoom-pan interpolation between two view states (no d3-transition needed).
 * Views are expressed as the world-space point at the viewport centre plus scale.
 */

export interface View {
  cx: number;
  cy: number;
  k: number;
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/**
 * Interpolate centre linearly and scale geometrically, with a gentle zoom-out
 * "hop" in the middle when travelling far relative to the viewport.
 */
export function interpolateView(a: View, b: View, viewportWidth: number) {
  const dist = Math.hypot(b.cx - a.cx, b.cy - a.cy);
  const hop = Math.min(0.55, (dist * Math.min(a.k, b.k)) / Math.max(1, viewportWidth) / 2);
  return (t: number): View => {
    const k = a.k * (b.k / a.k) ** t * (1 - hop * Math.sin(Math.PI * t));
    return { cx: a.cx + (b.cx - a.cx) * t, cy: a.cy + (b.cy - a.cy) * t, k: Math.max(0.1, k) };
  };
}

/** Duration scaled by distance travelled, clamped to a calm range. */
export function flyDuration(a: View, b: View, viewportWidth: number): number {
  const dist = Math.hypot(b.cx - a.cx, b.cy - a.cy) * Math.min(a.k, b.k);
  const zoom = Math.abs(Math.log2(b.k / a.k));
  return Math.round(Math.min(1600, Math.max(550, 500 + (dist / viewportWidth) * 600 + zoom * 180)));
}
