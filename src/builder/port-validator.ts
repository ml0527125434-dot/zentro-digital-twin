/**
 * Zentro Digital Twin — Port Validator (Stage 5A)
 *
 * Pre-flight connection validation for the Builder UI.
 * Returns all errors at once (not just the first) for richer UX feedback.
 * Mirrors the engine's own checks but provides human-readable messages
 * and catches all problems before any mutation is attempted.
 */

import type { Connection } from '../domain/types.js';
import type { ComponentRegistry } from '../lib/component-registry.js';

export type ValidationResult =
  | { valid: true }
  | { valid: false; errors: string[] };

export interface ConnectionDraft {
  fromComponentId: string;
  fromComponentType: string;
  fromPortId:      string;
  toComponentId:   string;
  toComponentType: string;
  toPortId:        string;
  medium:          Connection['medium'];
}

/**
 * Validates a connection draft before it is submitted to the Graph Engine.
 * Checks all 8 rules; returns all errors if more than one rule is violated.
 */
export function validateConnectionDraft(
  draft:               ConnectionDraft,
  registry:            ComponentRegistry,
  existingConnections: Connection[],
): ValidationResult {
  const errors: string[] = [];

  // Rule 1 — no self-loop
  if (draft.fromComponentId === draft.toComponentId) {
    errors.push('Cannot connect a component to itself.');
  }

  // Resolve definitions
  const fromDef = registry.get(draft.fromComponentType);
  const toDef   = registry.get(draft.toComponentType);

  if (!fromDef) {
    errors.push(`Component type '${draft.fromComponentType}' is not registered.`);
  }
  if (!toDef) {
    errors.push(`Component type '${draft.toComponentType}' is not registered.`);
  }

  // Early exit if definitions missing — remaining checks would throw
  if (!fromDef || !toDef) {
    return { valid: false, errors };
  }

  const fromPort = fromDef.ports.find(p => p.id === draft.fromPortId);
  const toPort   = toDef.ports.find(p => p.id === draft.toPortId);

  // Rule 2 — source port exists
  if (!fromPort) {
    errors.push(
      `Port '${draft.fromPortId}' does not exist on type '${draft.fromComponentType}'.`,
    );
  }

  // Rule 3 — target port exists
  if (!toPort) {
    errors.push(
      `Port '${draft.toPortId}' does not exist on type '${draft.toComponentType}'.`,
    );
  }

  if (fromPort) {
    // Rule 4 — medium matches source port
    if (fromPort.medium !== draft.medium) {
      errors.push(
        `Medium '${draft.medium}' does not match source port '${draft.fromPortId}' (${fromPort.medium}).`,
      );
    }
    // Rule 6 — source port must not be an inlet
    if (fromPort.role === 'inlet') {
      errors.push(
        `Port '${draft.fromPortId}' is an inlet — connections must start from an outlet or bidirectional port.`,
      );
    }
  }

  if (toPort) {
    // Rule 5 — medium matches target port
    if (toPort.medium !== draft.medium) {
      errors.push(
        `Medium '${draft.medium}' does not match target port '${draft.toPortId}' (${toPort.medium}).`,
      );
    }
    // Rule 7 — target port must not be an outlet
    if (toPort.role === 'outlet') {
      errors.push(
        `Port '${draft.toPortId}' is an outlet — connections must end at an inlet or bidirectional port.`,
      );
    }
  }

  // Rule 8 — no duplicate connection
  const duplicate = existingConnections.find(
    cn =>
      cn.fromComponentId === draft.fromComponentId &&
      cn.fromPortId      === draft.fromPortId      &&
      cn.toComponentId   === draft.toComponentId   &&
      cn.toPortId        === draft.toPortId,
  );
  if (duplicate) {
    errors.push(
      `A connection from '${draft.fromPortId}' to '${draft.toPortId}' already exists (id: ${duplicate.id}).`,
    );
  }

  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}
