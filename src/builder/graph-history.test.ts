import { describe, it, expect } from 'vitest';
import {
  createGraphHistory,
  captureGraph,
  restoreGraph,
  type GraphSnapshot,
} from './graph-history.js';
import { createInMemoryGraphStore, type EngineStores } from '../engine/graph-engine.js';
import { createInMemoryVersionStore } from '../domain/project-version.js';
import { createInMemoryEventStore } from '../domain/event-store.js';
import type { Component, Connection } from '../domain/types.js';

const PID = 'p1';
const comp = (id: string): Component => ({ id, type: 'storage_tank', name: id, projectId: PID, bindings: [] });
const conn = (id: string, a: string, b: string): Connection => ({
  id, projectId: PID, fromComponentId: a, fromPortId: 'o', toComponentId: b, toPortId: 'i',
  medium: 'hot_water', topologicalDirection: 'forward',
});
const snap = (cs: Component[], es: Connection[] = []): GraphSnapshot => ({ components: cs, connections: es });

function stores(): EngineStores {
  return { graph: createInMemoryGraphStore(), versions: createInMemoryVersionStore(), events: createInMemoryEventStore() };
}

describe('graph-history — stack', () => {
  it('starts empty/uninitialized', () => {
    const h = createGraphHistory();
    expect(h.initialized()).toBe(false);
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(false);
    expect(h.undo()).toBeNull();
  });

  it('reset establishes a baseline that cannot be undone past', () => {
    const h = createGraphHistory();
    h.reset(snap([comp('a')]));
    expect(h.initialized()).toBe(true);
    expect(h.canUndo()).toBe(false);
    expect(h.undo()).toBeNull();
  });

  it('records states and undoes/redoes through them', () => {
    const h = createGraphHistory();
    h.reset(snap([comp('a')]));
    h.record(snap([comp('a'), comp('b')]));
    h.record(snap([comp('a'), comp('b'), comp('c')]));

    expect(h.canUndo()).toBe(true);
    expect(h.undo()!.components.map(c => c.id)).toEqual(['a', 'b']);
    expect(h.undo()!.components.map(c => c.id)).toEqual(['a']);
    expect(h.canUndo()).toBe(false);
    expect(h.redo()!.components.map(c => c.id)).toEqual(['a', 'b']);
    expect(h.redo()!.components.map(c => c.id)).toEqual(['a', 'b', 'c']);
    expect(h.canRedo()).toBe(false);
  });

  it('a new record after undo drops the redo tail', () => {
    const h = createGraphHistory();
    h.reset(snap([comp('a')]));
    h.record(snap([comp('a'), comp('b')]));
    h.undo(); // back to [a]
    h.record(snap([comp('a'), comp('z')]));
    expect(h.canRedo()).toBe(false);
    expect(h.undo()!.components.map(c => c.id)).toEqual(['a']);
  });

  it('skips recording an identical consecutive state', () => {
    const h = createGraphHistory();
    h.reset(snap([comp('a')]));
    h.record(snap([comp('a')]));
    expect(h.size()).toBe(1);
  });

  it('enforces the bound by dropping oldest states', () => {
    const h = createGraphHistory(3);
    h.reset(snap([comp('s0')]));
    h.record(snap([comp('s1')]));
    h.record(snap([comp('s2')]));
    h.record(snap([comp('s3')])); // exceeds limit 3
    expect(h.size()).toBe(3);
  });
});

describe('graph-history — capture/restore against stores', () => {
  it('captures and restores a graph round-trip', () => {
    const s = stores();
    s.graph.setProject({ id: PID, name: 'x', siteType: 'r' });
    s.graph.setComponent(comp('a'));
    s.graph.setComponent(comp('b'));
    s.graph.setConnection(conn('e1', 'a', 'b'));

    const captured = captureGraph(s, PID);
    expect(captured.components).toHaveLength(2);
    expect(captured.connections).toHaveLength(1);

    // Mutate, then restore.
    s.graph.setComponent(comp('c'));
    expect(s.graph.getComponents(PID)).toHaveLength(3);

    restoreGraph(s, PID, captured);
    expect(s.graph.getComponents(PID).map(c => c.id).sort()).toEqual(['a', 'b']);
    expect(s.graph.getConnections(PID)).toHaveLength(1);
  });

  it('restore clears components/connections not in the snapshot', () => {
    const s = stores();
    s.graph.setProject({ id: PID, name: 'x', siteType: 'r' });
    s.graph.setComponent(comp('a'));
    restoreGraph(s, PID, snap([]));
    expect(s.graph.getComponents(PID)).toHaveLength(0);
  });
});
