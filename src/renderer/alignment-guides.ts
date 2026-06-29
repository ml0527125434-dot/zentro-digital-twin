/**
 * Alignment guides (Stage E, pid-spec §3.4) — pure geometry, no React.
 *
 * Given the actively-dragged node box and the other node boxes, find the closest
 * edge/center alignment within `threshold` on each axis and return the snapped
 * origin (x/y) plus the guide lines to draw. Edges = left/right/top/bottom,
 * centers = mid-x/mid-y. Closest match per axis wins (so a drag snaps cleanly).
 */

export interface NodeBox {
  id:     string;
  x:      number;   // top-left
  y:      number;
  width:  number;
  height: number;
}

/** Vertical guide line (an X alignment): drawn at `x`, spanning y1..y2. */
export interface VGuide { x: number; y1: number; y2: number; }
/** Horizontal guide line (a Y alignment): drawn at `y`, spanning x1..x2. */
export interface HGuide { y: number; x1: number; x2: number; }

export interface Alignment {
  /** Snapped top-left x (null = no X alignment within threshold). */
  x: number | null;
  /** Snapped top-left y (null = no Y alignment within threshold). */
  y: number | null;
  v: VGuide[];
  h: HGuide[];
}

/** Default snap/guide threshold, in flow units. */
export const ALIGN_THRESHOLD = 6;

export function computeAlignment(
  active: NodeBox,
  others: NodeBox[],
  threshold: number = ALIGN_THRESHOLD,
): Alignment {
  // Active anchor positions and the offset of each anchor from the top-left.
  const aX   = [active.x, active.x + active.width / 2, active.x + active.width];
  const aY   = [active.y, active.y + active.height / 2, active.y + active.height];
  const offX = [0, active.width / 2, active.width];
  const offY = [0, active.height / 2, active.height];

  let bestX: { d: number; snap: number; line: number; box: NodeBox } | null = null;
  let bestY: { d: number; snap: number; line: number; box: NodeBox } | null = null;

  for (const o of others) {
    const oX = [o.x, o.x + o.width / 2, o.x + o.width];
    const oY = [o.y, o.y + o.height / 2, o.y + o.height];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const dx = Math.abs(aX[i]! - oX[j]!);
        if (dx <= threshold && (!bestX || dx < bestX.d)) {
          bestX = { d: dx, snap: oX[j]! - offX[i]!, line: oX[j]!, box: o };
        }
        const dy = Math.abs(aY[i]! - oY[j]!);
        if (dy <= threshold && (!bestY || dy < bestY.d)) {
          bestY = { d: dy, snap: oY[j]! - offY[i]!, line: oY[j]!, box: o };
        }
      }
    }
  }

  const v: VGuide[] = [];
  const h: HGuide[] = [];

  if (bestX) {
    v.push({
      x:  bestX.line,
      y1: Math.min(active.y, bestX.box.y),
      y2: Math.max(active.y + active.height, bestX.box.y + bestX.box.height),
    });
  }
  if (bestY) {
    h.push({
      y:  bestY.line,
      x1: Math.min(active.x, bestY.box.x),
      x2: Math.max(active.x + active.width, bestY.box.x + bestY.box.width),
    });
  }

  return { x: bestX ? bestX.snap : null, y: bestY ? bestY.snap : null, v, h };
}
