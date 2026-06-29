/**
 * Zentro Digital Twin — Builder Actions (Stage 5A)
 *
 * High-level CONFIG actions for the builder UI.
 * Every action calls the Graph Engine — never writes directly to GraphStore.
 * No TELEMETRY. No COMMAND. No live device communication.
 */

import type { Component, Connection } from '../domain/types.js';
import type { EngineStores, MutationResult } from '../engine/graph-engine.js';
import {
  addComponent,
  updateComponent,
  removeComponent,
  addConnection,
  removeConnection,
} from '../engine/graph-engine.js';
import type { ComponentRegistry } from '../lib/component-registry.js';

// ---------------------------------------------------------------------------
// Component actions
// ---------------------------------------------------------------------------

/**
 * Place a new component instance on the canvas.
 * `typeId` must be registered in the registry.
 * `name` is the display label; `position` is the canvas (x, y).
 */
export function placeComponent(
  projectId:  string,
  typeId:     string,
  name:       string,
  position:   { x: number; y: number },
  stores:     EngineStores,
  registry:   ComponentRegistry,
  createdBy:  string,
): MutationResult<Component> {
  // Validate typeId exists in registry before generating an id
  registry.getOrThrow(typeId);

  const id = `cmp_${crypto.randomUUID().slice(0, 8)}`;

  return addComponent(
    projectId,
    { id, type: typeId, name, position, bindings: [] },
    createdBy,
    stores,
  );
}

/**
 * Persist a new canvas position for a component (drag-and-drop result).
 * Only updates `position` — no other fields affected.
 */
export function moveComponent(
  projectId:   string,
  componentId: string,
  position:    { x: number; y: number },
  stores:      EngineStores,
  createdBy:   string,
): MutationResult<Component> {
  return updateComponent(projectId, componentId, { position }, createdBy, stores);
}

/**
 * Rename a component.
 */
export function renameComponent(
  projectId:   string,
  componentId: string,
  name:        string,
  stores:      EngineStores,
  createdBy:   string,
): MutationResult<Component> {
  if (!name.trim()) throw new Error('Component name must not be empty.');
  return updateComponent(projectId, componentId, { name: name.trim() }, createdBy, stores);
}

/**
 * Duplicate an existing component: same type, name + " (copy)", position offset by +40.
 */
export function duplicateComponent(
  projectId:   string,
  componentId: string,
  stores:      EngineStores,
  registry:    ComponentRegistry,
  createdBy:   string,
): MutationResult<Component> {
  const source = stores.graph.getComponents(projectId).find(c => c.id === componentId);
  if (!source) throw new Error(`Component ${componentId} not found.`);
  const id = `cmp_${crypto.randomUUID().slice(0, 8)}`;
  const pos = source.position ?? { x: 60, y: 60 };
  return addComponent(
    projectId,
    {
      id,
      type:     source.type,
      name:     `${source.name} (copy)`,
      position: { x: pos.x + 40, y: pos.y + 40 },
      bindings: [],
    },
    createdBy,
    stores,
  );
}

/**
 * Delete a component from the graph.
 * Engine blocks deletion if any connection still references the component.
 */
export function deleteComponent(
  projectId:   string,
  componentId: string,
  stores:      EngineStores,
  createdBy:   string,
): MutationResult<{ componentId: string }> {
  return removeComponent(projectId, componentId, createdBy, stores);
}

/**
 * Delete a component together with every connection attached to it.
 * The engine blocks deleting a component that still has pipes; this removes the
 * pipes first so a Delete in the Builder always succeeds (LEGO-style).
 * Returns the removed component id and the ids of the connections removed with it.
 */
export function deleteComponentWithConnections(
  projectId:   string,
  componentId: string,
  stores:      EngineStores,
  createdBy:   string,
): { componentId: string; removedConnectionIds: string[] } {
  const attached = stores.graph.getConnections(projectId).filter(
    cn => cn.fromComponentId === componentId || cn.toComponentId === componentId,
  );
  const removedConnectionIds: string[] = [];
  for (const cn of attached) {
    removeConnection(projectId, cn.id, createdBy, stores);
    removedConnectionIds.push(cn.id);
  }
  removeComponent(projectId, componentId, createdBy, stores);
  return { componentId, removedConnectionIds };
}

// ---------------------------------------------------------------------------
// Connection actions
// ---------------------------------------------------------------------------

/**
 * Create a connection between two component ports.
 * Port and medium validation is performed by the Graph Engine.
 * Callers should first run port-validator.validateConnectionDraft() for richer UX errors.
 */
export function connectPorts(
  projectId:  string,
  from:       { componentId: string; portId: string },
  to:         { componentId: string; portId: string },
  medium:     Connection['medium'],
  direction:  Connection['topologicalDirection'],
  stores:     EngineStores,
  registry:   ComponentRegistry,
  createdBy:  string,
): MutationResult<Connection> {
  const id = `cn_${crypto.randomUUID().slice(0, 8)}`;

  return addConnection(
    projectId,
    {
      id,
      fromComponentId:      from.componentId,
      fromPortId:           from.portId,
      toComponentId:        to.componentId,
      toPortId:             to.portId,
      medium,
      topologicalDirection: direction,
    },
    registry,
    createdBy,
    stores,
  );
}

/**
 * Delete a connection.
 */
export function disconnectPorts(
  projectId:    string,
  connectionId: string,
  stores:       EngineStores,
  createdBy:    string,
): MutationResult<{ connectionId: string }> {
  return removeConnection(projectId, connectionId, createdBy, stores);
}
