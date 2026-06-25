import { describe, it, expect } from 'vitest';
import { downstreamOf, getComponent, getComponents, getConnections } from './graph-queries.js';
import { createInMemoryGraphStore } from './graph-engine.js';
import type { Connection } from '../domain/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function conn(
  id:              string,
  projectId:       string,
  fromComponentId: string,
  toComponentId:   string,
  medium:          Connection['medium'] = 'hot_water',
): Connection {
  return {
    id, projectId, fromComponentId, fromPortId: 'out',
    toComponentId, toPortId: 'in',
    medium, topologicalDirection: 'forward',
  };
}

// ---------------------------------------------------------------------------
// downstreamOf
// ---------------------------------------------------------------------------

describe('downstreamOf', () => {
  it('empty connection list returns []', () => {
    expect(downstreamOf('A', [])).toEqual([]);
  });

  it('direct neighbour is returned', () => {
    const result = downstreamOf('A', [conn('c1', 'p', 'A', 'B')]);
    expect(result).toContain('B');
    expect(result).toHaveLength(1);
  });

  it('transitive chain A→B→C from A returns [B, C]', () => {
    const connections = [
      conn('c1', 'p', 'A', 'B'),
      conn('c2', 'p', 'B', 'C'),
    ];
    const result = downstreamOf('A', connections);
    expect(result).toContain('B');
    expect(result).toContain('C');
    expect(result).toHaveLength(2);
  });

  it('does not include the origin componentId in the result', () => {
    const result = downstreamOf('A', [conn('c1', 'p', 'A', 'B')]);
    expect(result).not.toContain('A');
  });

  it('handles a cycle (A→B→A) without hanging and without duplicates', () => {
    const connections = [
      conn('c1', 'p', 'A', 'B'),
      conn('c2', 'p', 'B', 'A'),
    ];
    const result = downstreamOf('A', connections);
    expect(result).toContain('B');
    expect(result.filter(id => id === 'B')).toHaveLength(1); // no duplicates
    expect(result).not.toContain('A');                        // origin excluded
  });

  it('medium filter returns only matching connections', () => {
    const connections = [
      conn('c1', 'p', 'A', 'B', 'hot_water'),
      conn('c2', 'p', 'A', 'C', 'recirc'),
    ];
    const result = downstreamOf('A', connections, 'hot_water');
    expect(result).toContain('B');
    expect(result).not.toContain('C');
  });

  it('node with no outgoing connections returns []', () => {
    const connections = [conn('c1', 'p', 'X', 'Y')];
    expect(downstreamOf('Y', connections)).toEqual([]);
  });

  it('branching graph returns all reachable nodes', () => {
    // A → B, A → C, B → D
    const connections = [
      conn('c1', 'p', 'A', 'B'),
      conn('c2', 'p', 'A', 'C'),
      conn('c3', 'p', 'B', 'D'),
    ];
    const result = downstreamOf('A', connections);
    expect(result).toContain('B');
    expect(result).toContain('C');
    expect(result).toContain('D');
    expect(result).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// GraphStore read helpers
// ---------------------------------------------------------------------------

describe('getComponent', () => {
  it('returns the component if it exists', () => {
    const graph = createInMemoryGraphStore();
    const cmp = { id: 'c1', projectId: 'p', type: 'tank', name: 'T', bindings: [] };
    graph.setComponent(cmp);
    expect(getComponent(graph, 'p', 'c1')).toBe(cmp);
  });

  it('returns undefined for unknown componentId', () => {
    const graph = createInMemoryGraphStore();
    expect(getComponent(graph, 'p', 'nonexistent')).toBeUndefined();
  });
});

describe('getComponents', () => {
  it('returns all components for the project', () => {
    const graph = createInMemoryGraphStore();
    graph.setComponent({ id: 'c1', projectId: 'p', type: 'tank', name: 'T1', bindings: [] });
    graph.setComponent({ id: 'c2', projectId: 'p', type: 'pump', name: 'T2', bindings: [] });
    graph.setComponent({ id: 'c3', projectId: 'q', type: 'tank', name: 'T3', bindings: [] });
    const result = getComponents(graph, 'p');
    expect(result).toHaveLength(2);
    expect(result.map(c => c.id).sort()).toEqual(['c1', 'c2']);
  });

  it('returns empty array for unknown project', () => {
    const graph = createInMemoryGraphStore();
    expect(getComponents(graph, 'nonexistent')).toHaveLength(0);
  });
});

describe('getConnections', () => {
  it('returns connections only for the requested project', () => {
    const graph = createInMemoryGraphStore();
    graph.setConnection(conn('cn1', 'p', 'A', 'B'));
    graph.setConnection(conn('cn2', 'q', 'C', 'D'));
    expect(getConnections(graph, 'p')).toHaveLength(1);
    expect(getConnections(graph, 'p')[0]?.id).toBe('cn1');
  });
});
