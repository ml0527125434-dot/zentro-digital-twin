/**
 * Zentro Digital Twin — Binding Editor (Stage 5A)
 *
 * BindingDraft model and helpers for assigning sensor bindings to
 * component SensorSlots and connection segment sensors.
 *
 * All mutations go through the Graph Engine (updateComponent / updateConnection).
 * Binding.metric is always derived from the SensorSlot — never user-input.
 * No TELEMETRY. No COMMAND.
 */

import type { Binding, BindingSource, Component, Connection } from '../domain/types.js';
import type { SensorSlot } from '../lib/component-registry.js';
import type { EngineStores, MutationResult } from '../engine/graph-engine.js';
import { updateComponent, updateConnection } from '../engine/graph-engine.js';

// ---------------------------------------------------------------------------
// BindingDraft — user-editable form state before a Binding is committed
// ---------------------------------------------------------------------------

export interface BindingDraft {
  /** References SensorSlot.id in the ComponentDefinition */
  slotId:     string;
  source:     BindingSource;
  /** Protocol-specific address: MQTT topic, Modbus register, KNX group, etc. */
  address:    string;
  unit?:      string;
  ttlSeconds: number;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type BindingValidationResult =
  | { valid: true }
  | { valid: false; errors: string[] };

const VALID_SOURCES: ReadonlySet<string> = new Set([
  'mqtt', 'modbus', 'knx', 'dry_contact', 'api',
]);

/**
 * Validates a BindingDraft against a SensorSlot before committing.
 * Returns all errors, not just the first.
 */
export function validateBindingDraft(
  draft: BindingDraft,
  slot:  SensorSlot,
): BindingValidationResult {
  const errors: string[] = [];

  if (draft.slotId !== slot.id) {
    errors.push(`Draft slotId '${draft.slotId}' does not match slot id '${slot.id}'.`);
  }
  if (!VALID_SOURCES.has(draft.source)) {
    errors.push(`Invalid binding source '${draft.source}'.`);
  }
  if (!draft.address.trim()) {
    errors.push('Binding address must not be empty.');
  }
  if (draft.ttlSeconds <= 0) {
    errors.push(`ttlSeconds must be > 0 (got ${draft.ttlSeconds}).`);
  }

  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

// ---------------------------------------------------------------------------
// Component binding helpers
// ---------------------------------------------------------------------------

/**
 * Add or replace a binding on a component for the given SensorSlot.
 * If a binding already exists for the same metric, it is replaced.
 * Calls updateComponent() via Graph Engine — writes event + version.
 */
export function assignComponentBinding(
  projectId:   string,
  componentId: string,
  draft:       BindingDraft,
  slot:        SensorSlot,
  stores:      EngineStores,
  createdBy:   string,
): MutationResult<Component> {
  const component = stores.graph.getComponent(projectId, componentId);
  if (!component) {
    throw new Error(`Component '${componentId}' not found in project '${projectId}'.`);
  }

  const newBinding: Binding = {
    id:         `b_${crypto.randomUUID().slice(0, 8)}`,
    source:     draft.source,
    address:    draft.address.trim(),
    metric:     slot.metric,      // derived from slot — never from draft
    ttlSeconds: draft.ttlSeconds,
    ...(draft.unit !== undefined ? { unit: draft.unit } : {}),
  };

  // Replace existing binding for the same metric, or append
  const existing = component.bindings.filter(b => b.metric !== slot.metric);
  const bindings = [...existing, newBinding];

  return updateComponent(projectId, componentId, { bindings }, createdBy, stores);
}

/**
 * Remove a binding from a component by binding id.
 * Calls updateComponent() via Graph Engine.
 */
export function removeComponentBinding(
  projectId:   string,
  componentId: string,
  bindingId:   string,
  stores:      EngineStores,
  createdBy:   string,
): MutationResult<Component> {
  const component = stores.graph.getComponent(projectId, componentId);
  if (!component) {
    throw new Error(`Component '${componentId}' not found in project '${projectId}'.`);
  }

  const bindings = component.bindings.filter(b => b.id !== bindingId);
  if (bindings.length === component.bindings.length) {
    throw new Error(
      `Binding '${bindingId}' not found on component '${componentId}'.`,
    );
  }

  return updateComponent(projectId, componentId, { bindings }, createdBy, stores);
}

// ---------------------------------------------------------------------------
// Connection binding helpers
// ---------------------------------------------------------------------------

/**
 * Add or replace a segment-sensor binding on a connection.
 * Calls updateConnection() via Graph Engine.
 */
export function assignConnectionBinding(
  projectId:    string,
  connectionId: string,
  draft:        BindingDraft,
  slot:         SensorSlot,
  stores:       EngineStores,
  createdBy:    string,
): MutationResult<Connection> {
  const connection = stores.graph.getConnection(projectId, connectionId);
  if (!connection) {
    throw new Error(`Connection '${connectionId}' not found in project '${projectId}'.`);
  }

  const newBinding: Binding = {
    id:         `b_${crypto.randomUUID().slice(0, 8)}`,
    source:     draft.source,
    address:    draft.address.trim(),
    metric:     slot.metric,
    ttlSeconds: draft.ttlSeconds,
    ...(draft.unit !== undefined ? { unit: draft.unit } : {}),
  };

  const existing  = (connection.bindings ?? []).filter(b => b.metric !== slot.metric);
  const bindings  = [...existing, newBinding];

  return updateConnection(projectId, connectionId, { bindings }, createdBy, stores);
}

/**
 * Remove a segment-sensor binding from a connection by binding id.
 * Also clears valueBindingId if it pointed to the removed binding.
 * Calls updateConnection() via Graph Engine.
 */
export function removeConnectionBinding(
  projectId:    string,
  connectionId: string,
  bindingId:    string,
  stores:       EngineStores,
  createdBy:    string,
): MutationResult<Connection> {
  const connection = stores.graph.getConnection(projectId, connectionId);
  if (!connection) {
    throw new Error(`Connection '${connectionId}' not found in project '${projectId}'.`);
  }

  const bindings = (connection.bindings ?? []).filter(b => b.id !== bindingId);
  if (bindings.length === (connection.bindings ?? []).length) {
    throw new Error(
      `Binding '${bindingId}' not found on connection '${connectionId}'.`,
    );
  }

  const clearValue = connection.valueBindingId === bindingId;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Parameters<typeof updateConnection>[2] = clearValue
    ? { bindings, valueBindingId: undefined } as any
    : { bindings };

  return updateConnection(projectId, connectionId, patch, createdBy, stores);
}
