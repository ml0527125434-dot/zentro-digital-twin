/**
 * Zentro Digital Twin — Graph History (Stage 35, P0-2)
 *
 * Undo/redo for the Builder's CONFIG graph (components + connections only).
 * The history is a bounded stack of graph SNAPSHOTS with a moving pointer:
 *
 *   stack:  [S0, S1, S2, ...]   pointer -> current state
 *   S0 is the baseline captured when the builder first sees the graph; every
 *   subsequent mutation pushes a new post-state. undo/redo move the pointer.
 *
 * Snapshots are plain data; restore writes them straight into the GraphStore
 * (bypassing the engine — undo restores a known-good state, it is not a new
 * user mutation, so it must not emit events or bump the version).
 */

import type { Component, Connection } from '../domain/types.js';
import type { EngineStores } from '../engine/graph-engine.js';

export interface GraphSnapshot {
  components: Component[];
  connections: Connection[];
}

function clone<T>(v: T): T {
  return typeof structuredClone === 'function'
    ? structuredClone(v)
    : (JSON.parse(JSON.stringify(v)) as T);
}

/** Read the current CONFIG graph for a project into a detached snapshot. */
export function captureGraph(stores: EngineStores, projectId: string): GraphSnapshot {
  return {
    components: stores.graph.getComponents(projectId).map(clone),
    connections: stores.graph.getConnections(projectId).map(clone),
  };
}

/**
 * Replace the project's CONFIG graph with a snapshot. Clears existing
 * components/connections first so a load is a clean replacement.
 */
export function restoreGraph(
  stores: EngineStores,
  projectId: string,
  snapshot: GraphSnapshot,
): void {
  // Remove connections first (they reference components), then components.
  for (const cn of stores.graph.getConnections(projectId)) {
    stores.graph.deleteConnection(projectId, cn.id);
  }
  for (const c of stores.graph.getComponents(projectId)) {
    stores.graph.deleteComponent(projectId, c.id);
  }
  for (const c of snapshot.components) stores.graph.setComponent(clone(c));
  for (const cn of snapshot.connections) stores.graph.setConnection(clone(cn));
}

function sameSnapshot(a: GraphSnapshot, b: GraphSnapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export interface GraphHistory {
  /** (Re)initialize the stack with a single baseline state. */
  reset(initial: GraphSnapshot): void;
  /** Push a new post-mutation state. No-op if identical to the current state. */
  record(snapshot: GraphSnapshot): void;
  /** Move back one step; returns the state to restore, or null if at the start. */
  undo(): GraphSnapshot | null;
  /** Move forward one step; returns the state to restore, or null if at the end. */
  redo(): GraphSnapshot | null;
  canUndo(): boolean;
  canRedo(): boolean;
  /** True once a baseline has been set. */
  initialized(): boolean;
  /** Number of states currently held (for tests/debug). */
  size(): number;
}

export function createGraphHistory(limit = 50): GraphHistory {
  let stack: GraphSnapshot[] = [];
  let pointer = -1;

  return {
    reset(initial) {
      stack = [clone(initial)];
      pointer = 0;
    },
    record(snapshot) {
      if (pointer < 0) {
        // No baseline yet — treat the first record as the baseline.
        stack = [clone(snapshot)];
        pointer = 0;
        return;
      }
      if (sameSnapshot(snapshot, stack[pointer]!)) return; // skip no-ops
      // Drop any redo tail, then push.
      stack = stack.slice(0, pointer + 1);
      stack.push(clone(snapshot));
      // Enforce the bound by dropping the oldest entries.
      if (stack.length > limit) {
        stack = stack.slice(stack.length - limit);
      }
      pointer = stack.length - 1;
    },
    undo() {
      if (pointer <= 0) return null;
      pointer -= 1;
      return clone(stack[pointer]!);
    },
    redo() {
      if (pointer < 0 || pointer >= stack.length - 1) return null;
      pointer += 1;
      return clone(stack[pointer]!);
    },
    canUndo() {
      return pointer > 0;
    },
    canRedo() {
      return pointer >= 0 && pointer < stack.length - 1;
    },
    initialized() {
      return pointer >= 0;
    },
    size() {
      return stack.length;
    },
  };
}
