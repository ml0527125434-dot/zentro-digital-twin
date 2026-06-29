import { describe, it, expect } from 'vitest';
import { copySelection, planPaste } from './clipboard.js';
import type { Component, Connection } from '../domain/types.js';

const PID = 'p1';
const comp = (id: string, x = 10, y = 20): Component => ({
  id, type: 'storage_tank', name: id, projectId: PID, position: { x, y }, bindings: [],
});
const conn = (id: string, a: string, b: string): Connection => ({
  id, projectId: PID, fromComponentId: a, fromPortId: 'hot_out', toComponentId: b, toPortId: 'cold_in',
  medium: 'hot_water', topologicalDirection: 'forward',
});

describe('clipboard — copySelection', () => {
  it('returns null when nothing selected', () => {
    expect(copySelection([comp('a')], [], [])).toBeNull();
  });

  it('copies selected components only', () => {
    const cb = copySelection([comp('a'), comp('b'), comp('c')], [], ['a', 'c']);
    expect(cb!.components.map(c => c.id).sort()).toEqual(['a', 'c']);
  });

  it('includes only connections internal to the selection', () => {
    const comps = [comp('a'), comp('b'), comp('c')];
    const conns = [conn('e1', 'a', 'b'), conn('e2', 'b', 'c')];
    const cb = copySelection(comps, conns, ['a', 'b']);
    expect(cb!.connections.map(c => c.id)).toEqual(['e1']); // e2 leaves the selection
  });

  it('deep-clones (no aliasing)', () => {
    const comps = [comp('a')];
    const cb = copySelection(comps, [], ['a'])!;
    cb.components[0]!.name = 'X';
    expect(comps[0]!.name).toBe('a');
  });
});

describe('clipboard — planPaste', () => {
  it('offsets positions and suffixes names', () => {
    const cb = { components: [comp('a', 100, 200)], connections: [] };
    const plan = planPaste(cb, 40);
    expect(plan.components[0]!.position).toEqual({ x: 140, y: 240 });
    expect(plan.components[0]!.name).toBe('a (copy)');
    expect(plan.components[0]!.sourceId).toBe('a');
  });

  it('maps internal connections to source ids for remapping', () => {
    const cb = { components: [comp('a'), comp('b')], connections: [conn('e1', 'a', 'b')] };
    const plan = planPaste(cb, 40);
    expect(plan.connections[0]).toMatchObject({
      fromSourceId: 'a', toSourceId: 'b', fromPortId: 'hot_out', toPortId: 'cold_in',
      medium: 'hot_water', direction: 'forward',
    });
  });
});
