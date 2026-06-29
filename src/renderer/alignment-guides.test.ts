import { describe, it, expect } from 'vitest';
import { computeAlignment, ALIGN_THRESHOLD, type NodeBox } from './alignment-guides.js';

const box = (id: string, x: number, y: number, width = 100, height = 80): NodeBox => ({ id, x, y, width, height });

describe('computeAlignment', () => {
  it('returns no alignment when nodes are far apart', () => {
    const a = computeAlignment(box('a', 0, 0), [box('b', 500, 500)]);
    expect(a.x).toBeNull();
    expect(a.y).toBeNull();
    expect(a.v).toHaveLength(0);
    expect(a.h).toHaveLength(0);
  });

  it('snaps left edges that are within the threshold and emits a vertical guide', () => {
    // active.left = 3, other.left = 0 → within threshold → snap active.x to 0
    const a = computeAlignment(box('a', 3, 200), [box('b', 0, 0)]);
    expect(a.x).toBe(0);
    expect(a.v).toHaveLength(1);
    expect(a.v[0]!.x).toBe(0);
    // guide spans both boxes vertically
    expect(a.v[0]!.y1).toBe(0);
    expect(a.v[0]!.y2).toBe(280);
  });

  it('snaps centers on the X axis', () => {
    // active center = x+50; other center = 100+50 = 150 → snap so active center = 150 → x = 100
    const a = computeAlignment(box('a', 96, 300), [box('b', 100, 0)]);
    expect(a.x).toBe(100);
  });

  it('snaps top edges on the Y axis and emits a horizontal guide', () => {
    const a = computeAlignment(box('a', 400, 4), [box('b', 0, 0)]);
    expect(a.y).toBe(0);
    expect(a.h).toHaveLength(1);
    expect(a.h[0]!.y).toBe(0);
  });

  it('picks the closest match when several are in range', () => {
    // other1.left = 0 (delta 5), other2.left = 2 (delta 3) → snap to the closer (2)
    const a = computeAlignment(box('a', 5, 999), [box('b', 0, 0), box('c', 2, 0)]);
    expect(a.x).toBe(2);
  });

  it('does not snap just outside the threshold', () => {
    const a = computeAlignment(box('a', ALIGN_THRESHOLD + 1, 999), [box('b', 0, 0)]);
    expect(a.x).toBeNull();
  });
});
