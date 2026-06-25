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
