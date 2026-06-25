/**
 * Zentro Digital Twin — ComponentDefinition Validator
 *
 * Validates shape and SDK safety constraints only (SDK §3 & §6).
 * Does NOT evaluate runtime behaviour, profiles, alarms, or commands.
 */

import type { ComponentDefinition } from './component-registry.js';

export type ValidationResult =
  | { valid: true }
  | { valid: false; errors: string[] };

// ---------------------------------------------------------------------------
// Valid value sets (mirrors the union types in types.ts)
// ---------------------------------------------------------------------------

const VALID_CATEGORIES = new Set([
  'storage', 'source', 'pump', 'valve', 'sensor', 'consumer', 'zone', 'meter', 'air',
]);
const VALID_MEDIUMS = new Set([
  'hot_water', 'cold_water', 'recirc', 'gas', 'air', 'electric', 'mixed',
]);
const VALID_METRICS = new Set([
  'temperature', 'pressure', 'flow', 'humidity', 'co2', 'runtime', 'diff_pressure', 'energy',
]);
const VALID_ROLES   = new Set(['inlet', 'outlet', 'bidirectional']);
const VALID_ANCHORS = new Set(['top', 'bottom', 'left', 'right']);
const VALID_SHAPES  = new Set(['tank', 'pump', 'valve', 'exchanger', 'sensor', 'zone', 'generic']);
const VALID_SECTIONS = new Set([
  'live', 'commands', 'history', 'alarms', 'maintenance', 'config', 'dependencies',
]);

// ---------------------------------------------------------------------------
// validateDefinition
// ---------------------------------------------------------------------------

export function validateDefinition(def: ComponentDefinition): ValidationResult {
  const errors: string[] = [];

  // --- Identity ---
  if (!def.typeId || def.typeId.trim() === '') {
    errors.push('typeId must be a non-empty string');
  }
  if (!def.label || def.label.trim() === '') {
    errors.push('label must be a non-empty string');
  }
  if (!VALID_CATEGORIES.has(def.category)) {
    errors.push(`category '${def.category}' is not a valid ComponentCategory`);
  }

  // --- Ports ---
  const portIds = new Set<string>();
  for (const port of def.ports) {
    if (portIds.has(port.id)) {
      errors.push(`Duplicate port id '${port.id}'`);
    }
    portIds.add(port.id);

    if (!VALID_MEDIUMS.has(port.medium)) {
      errors.push(`Port '${port.id}': invalid medium '${port.medium}'`);
    }
    if (!VALID_ROLES.has(port.role)) {
      errors.push(`Port '${port.id}': invalid role '${port.role}'`);
    }
    if (!VALID_ANCHORS.has(port.anchor)) {
      errors.push(`Port '${port.id}': invalid anchor '${port.anchor}'`);
    }
  }

  // --- SensorSlots ---
  const slotIds = new Set<string>();
  for (const slot of def.sensorSlots) {
    if (slotIds.has(slot.id)) {
      errors.push(`Duplicate sensorSlot id '${slot.id}'`);
    }
    slotIds.add(slot.id);

    if (!VALID_METRICS.has(slot.metric)) {
      errors.push(`SensorSlot '${slot.id}': invalid metric '${slot.metric}'`);
    }
    if (slot.defaultTtlSeconds <= 0) {
      errors.push(`SensorSlot '${slot.id}': defaultTtlSeconds must be > 0`);
    }
  }

  // --- Commands ---
  const commandIds = new Set<string>();
  for (const cmd of def.commands) {
    if (commandIds.has(cmd.id)) {
      errors.push(`Duplicate command id '${cmd.id}'`);
    }
    commandIds.add(cmd.id);

    // SDK §1: dangerous commands must declare at least one interlock key (data only)
    if (cmd.dangerous && (!cmd.interlockKeys || cmd.interlockKeys.length === 0)) {
      errors.push(
        `Command '${cmd.id}' is dangerous but declares no interlockKeys (SDK §1)`,
      );
    }
  }

  // --- Visual ---
  if (!VALID_METRICS.has(def.visual.primaryStatusMetric)) {
    errors.push(
      `visual.primaryStatusMetric '${def.visual.primaryStatusMetric}' is not a valid ProfileMetric`,
    );
  }

  if (!VALID_SHAPES.has(def.visual.shape)) {
    errors.push(`visual.shape '${def.visual.shape}' is not a valid shape`);
  }

  for (const portId of Object.keys(def.visual.portAnchors)) {
    if (!portIds.has(portId)) {
      errors.push(`visual.portAnchors references unknown port id '${portId}'`);
    }
  }

  if (def.visual.propertyPanel.sections.length === 0) {
    errors.push('visual.propertyPanel.sections must not be empty');
  }

  for (const section of def.visual.propertyPanel.sections) {
    if (!VALID_SECTIONS.has(section)) {
      errors.push(`visual.propertyPanel.sections contains invalid value '${section}'`);
    }
  }

  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}
