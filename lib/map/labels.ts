/**
 * Label visibility for the map: priority-by-zoom plus greedy collision culling
 * in screen space. Pure and allocation-light so it can run on every zoom frame.
 */

export interface LabelBox {
  id: string;
  /** Anchor (marker) position in screen px. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Lower rank wins collisions (e.g. selected/bookmarked first, then priority). */
  rank: number;
}

/** Highest city priority that gets a label at zoom scale `k`. */
export function maxPriorityForZoom(k: number): 1 | 2 | 3 {
  if (k >= 3.2) return 3;
  if (k >= 1.7) return 2;
  return 1;
}

/** Approximate rendered width of a two-line label (name + time) at 11px. */
export function estimateLabelWidth(name: string): number {
  return Math.max(name.length * 6.4, 42) + 12;
}

/**
 * Greedy placement: labels sorted by rank claim their box; any later label that
 * overlaps an accepted one (or falls off-screen) is hidden.
 * Labels sit to the right of the marker; boxes include a small padding.
 */
export function resolveLabelCollisions(
  boxes: readonly LabelBox[],
  viewport: { width: number; height: number },
  padding = 3,
): Set<string> {
  const sorted = [...boxes].sort((a, b) => a.rank - b.rank);
  const placed: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const visible = new Set<string>();
  for (const b of sorted) {
    const x1 = b.x + 6 - padding;
    const y1 = b.y - b.height / 2 - padding;
    const x2 = b.x + 6 + b.width + padding;
    const y2 = b.y + b.height / 2 + padding;
    if (x2 < 0 || y2 < 0 || x1 > viewport.width || y1 > viewport.height) continue;
    let hit = false;
    for (const p of placed) {
      if (x1 < p.x2 && x2 > p.x1 && y1 < p.y2 && y2 > p.y1) {
        hit = true;
        break;
      }
    }
    if (!hit) {
      placed.push({ x1, y1, x2, y2 });
      visible.add(b.id);
    }
  }
  return visible;
}
