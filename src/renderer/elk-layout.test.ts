import { describe, it, expect } from 'vitest';
import { computeElkLayout, applyElkPositions } from './elk-layout.js';
import type { ComponentNode } from './flow-transformers.js';
import { HealthState, NodeStatus, SensorState, ValueProvenance, FlowState } from '../domain/types.js';

function makeNode(id: string, x = 0, y = 0): ComponentNode {
  return {
    id,
    type:     'storage_tank',
    position: { x, y },
    data: {
      componentId:  id,
      name:         id,
      typeId:       'storage_tank',
      viewModel: {
        componentId:       id,
        health:            HealthState.Healthy,
        operationalStatus: NodeStatus.Ok,
        sensorState:       SensorState.Live,
        provenance:        ValueProvenance.Measured,
        liveValues:        {},
        activeCommands:    [],
        activeAlarms:      [],
      },
    },
  };
}

describe('computeElkLayout', () => {
  it('returns a position for every node', async () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
    const edges = [{ source: 'a', target: 'b' }, { source: 'b', target: 'c' }];
    const positions = await computeElkLayout(nodes, edges);
    expect(positions.has('a')).toBe(true);
    expect(positions.has('b')).toBe(true);
    expect(positions.has('c')).toBe(true);
  });

  it('positions are numeric x/y values', async () => {
    const nodes = [makeNode('a'), makeNode('b')];
    const edges = [{ source: 'a', target: 'b' }];
    const positions = await computeElkLayout(nodes, edges);
    const posA = positions.get('a')!;
    expect(typeof posA.x).toBe('number');
    expect(typeof posA.y).toBe('number');
  });

  it('runs with no edges (isolated nodes)', async () => {
    const nodes = [makeNode('x'), makeNode('y')];
    const positions = await computeElkLayout(nodes, []);
    expect(positions.size).toBe(2);
  });

  it('runs with empty inputs', async () => {
    const positions = await computeElkLayout([], []);
    expect(positions.size).toBe(0);
  });
});

describe('applyElkPositions', () => {
  it('returns a new array (does not mutate originals)', () => {
    const nodes = [makeNode('a', 10, 20)];
    const positions = new Map([['a', { x: 99, y: 88 }]]);
    const updated = applyElkPositions(nodes, positions);
    expect(updated).not.toBe(nodes);
    expect(nodes[0]!.position).toEqual({ x: 10, y: 20 }); // original unchanged
  });

  it('updates position for nodes present in the map', () => {
    const nodes = [makeNode('a')];
    const positions = new Map([['a', { x: 50, y: 75 }]]);
    const updated = applyElkPositions(nodes, positions);
    expect(updated[0]!.position).toEqual({ x: 50, y: 75 });
  });

  it('keeps original position for nodes not in the map', () => {
    const nodes = [makeNode('a', 10, 20), makeNode('b', 30, 40)];
    const positions = new Map([['a', { x: 99, y: 88 }]]);
    const updated = applyElkPositions(nodes, positions);
    expect(updated[1]!.position).toEqual({ x: 30, y: 40 });
  });
});
