/**
 * Zentro Digital Twin — Graph Queries (Stage 1B)
 *
 * Read-only queries on the Component Graph. No mutations, no side effects.
 *
 * downstreamOf() is LAZY — call on-demand (impact panel) only.
 * Never call per telemetry update (Constitution Art. 15 + scale note).
 */

import type { Component, Connection, Medium } from '../domain/types.js';
import type { GraphStore } from './graph-engine.js';

// ---------------------------------------------------------------------------
// downstreamOf — traversal of the Connection graph
// Returns all component ids reachable downstream from componentId.
// Does NOT include componentId itself.
// Safe against cycles (visited set).
// ---------------------------------------------------------------------------

export function downstreamOf(
  componentId: string,
  connections: Connection[],
  medium?:     Medium,
): string[] {
  const visited = new Set<string>();
  const stack   = [componentId];

  while (stack.length > 0) {
    const cur = stack.pop()!;
    for (const cn of connections) {
      if (
        cn.fromComponentId === cur &&
        (!medium || cn.medium === medium) &&
        !visited.has(cn.toComponentId)
      ) {
        visited.add(cn.toComponentId);
        stack.push(cn.toComponentId);
      }
    }
  }

  // Exclude the origin itself in case of a cycle that loops back
  visited.delete(componentId);
  return [...visited];
}

// ---------------------------------------------------------------------------
// Read helpers — thin wrappers over GraphStore for use in engine and tests
// ---------------------------------------------------------------------------

export function getComponent(
  graph:       GraphStore,
  projectId:   string,
  componentId: string,
): Component | undefined {
  return graph.getComponent(projectId, componentId);
}

export function getComponents(
  graph:     GraphStore,
  projectId: string,
): Component[] {
  return graph.getComponents(projectId);
}

export function getConnections(
  graph:     GraphStore,
  projectId: string,
): Connection[] {
  return graph.getConnections(projectId);
}
