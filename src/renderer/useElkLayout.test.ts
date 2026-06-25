/** @vitest-environment happy-dom */
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useElkLayout } from './useElkLayout.js';
import type { ComponentNode, ConnectionEdge } from './flow-transformers.js';
import { HealthState, NodeStatus, SensorState, ValueProvenance, FlowState } from '../domain/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function makeEdge(source: string, target: string): ConnectionEdge {
  return {
    id:      `${source}->${target}`,
    source,
    target,
    type:    'flowEdge',
    animated: false,
    data: {
      connectionId: `${source}->${target}`,
      animated:     false,
      viewModel: {
        connectionId: `${source}->${target}`,
        flow:         FlowState.Unknown,
        value:        null,
        status:       NodeStatus.Unknown,
        sensorState:  SensorState.Unknown,
        provenance:   ValueProvenance.Unknown,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useElkLayout', () => {
  it('isReady is false before ELK async computation completes', () => {
    const nodes = [makeNode('a'), makeNode('b')];
    const edges = [makeEdge('a', 'b')];
    const { result } = renderHook(() => useElkLayout(nodes, edges));
    // Synchronously: isReady must be false
    expect(result.current.isReady).toBe(false);
  });

  it('falls back to seed positions before layout is ready', () => {
    const nodes = [makeNode('a', 10, 20), makeNode('b', 30, 40)];
    const edges = [makeEdge('a', 'b')];
    const { result } = renderHook(() => useElkLayout(nodes, edges));
    // Before ELK resolves, layoutNodes equals the input nodes
    expect(result.current.layoutNodes[0]!.position).toEqual({ x: 10, y: 20 });
  });

  it('isReady becomes true after ELK completes', async () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
    const edges = [makeEdge('a', 'b'), makeEdge('b', 'c')];
    const { result } = renderHook(() => useElkLayout(nodes, edges));
    await waitFor(() => expect(result.current.isReady).toBe(true));
  });

  it('layoutNodes contain ELK positions for all nodes after layout', async () => {
    const nodes = [makeNode('a', 0, 0), makeNode('b', 0, 0), makeNode('c', 0, 0)];
    const edges = [makeEdge('a', 'b'), makeEdge('b', 'c')];
    const { result } = renderHook(() => useElkLayout(nodes, edges));
    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(result.current.layoutNodes).toHaveLength(3);
    for (const n of result.current.layoutNodes) {
      expect(typeof n.position.x).toBe('number');
      expect(typeof n.position.y).toBe('number');
    }
  });

  it('ELK positions differ from seed positions (layout is non-trivial)', async () => {
    // All nodes start at (0,0) — ELK should spread them out
    const nodes = [makeNode('a', 0, 0), makeNode('b', 0, 0), makeNode('c', 0, 0)];
    const edges = [makeEdge('a', 'b'), makeEdge('b', 'c')];
    const { result } = renderHook(() => useElkLayout(nodes, edges));
    await waitFor(() => expect(result.current.isReady).toBe(true));

    const positions = result.current.layoutNodes.map(n => n.position);
    const uniqueX = new Set(positions.map(p => p.x));
    // Layered layout should produce at least 2 distinct X positions
    expect(uniqueX.size).toBeGreaterThan(1);
  });

  it('does not mutate original nodes — input positions unchanged after layout', async () => {
    const nodes = [makeNode('a', 11, 22), makeNode('b', 33, 44)];
    const edges = [makeEdge('a', 'b')];
    const { result } = renderHook(() => useElkLayout(nodes, edges));
    await waitFor(() => expect(result.current.isReady).toBe(true));

    // Original node positions must be unchanged
    expect(nodes[0]!.position).toEqual({ x: 11, y: 22 });
    expect(nodes[1]!.position).toEqual({ x: 33, y: 44 });
  });

  it('recomputes layout when topology changes — new node gets a position', async () => {
    const initNodes = [makeNode('a'), makeNode('b')];
    const initEdges = [makeEdge('a', 'b')];

    let nodes = initNodes;
    let edges = initEdges;

    const { result, rerender } = renderHook(() => useElkLayout(nodes, edges));
    await waitFor(() => expect(result.current.isReady).toBe(true));

    // Add a third node and edge — topology changes
    nodes = [...initNodes, makeNode('c')];
    edges = [...initEdges, makeEdge('b', 'c')];
    rerender();

    await waitFor(() => {
      expect(result.current.layoutNodes).toHaveLength(3);
      const cNode = result.current.layoutNodes.find(n => n.id === 'c');
      expect(cNode).toBeDefined();
      expect(typeof cNode!.position.x).toBe('number');
    });
  });

  it('ViewModel-only change does not reset isReady to false', async () => {
    // Simulate a telemetry tick: same topology, different viewModel values
    let nodes = [makeNode('a', 5, 5), makeNode('b', 10, 10)];
    const edges = [makeEdge('a', 'b')];

    const { result, rerender } = renderHook(() => useElkLayout(nodes, edges));
    await waitFor(() => expect(result.current.isReady).toBe(true));

    const positionsBefore = result.current.layoutNodes.map(n => ({ ...n.position }));

    // Update viewModel temperature (simulates a telemetry tick) — IDs unchanged
    nodes = nodes.map(n => ({
      ...n,
      data: { ...n.data, viewModel: { ...n.data.viewModel, liveValues: { temperature: 62 } } },
    }));
    rerender();

    // isReady stays true — layout was NOT reset
    expect(result.current.isReady).toBe(true);
    // positions are unchanged (same topology key → same cached ELK result)
    const positionsAfter = result.current.layoutNodes.map(n => ({ ...n.position }));
    expect(positionsAfter).toEqual(positionsBefore);
  });
});
