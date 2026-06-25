/**
 * Zentro Digital Twin — Component Registry
 *
 * Runtime registry for ComponentDefinitions (the blueprints).
 * Registering a definition is how a new component type enters the platform
 * without touching the Core Engine (Constitution Art. 14).
 *
 * ComponentDefinition shape is defined in the Component SDK (04_COMPONENT_SDK.md).
 * It is declared here as a local interface so this module compiles standalone
 * in Stage 1A; the full SDK types arrive in Stage 2.
 */

import type { Medium, ProfileMetric } from '../domain/types.js';

// ---------------------------------------------------------------------------
// ComponentDefinition (minimal shape for Stage 1A — full SDK in Stage 2)
// ---------------------------------------------------------------------------

export type ComponentCategory =
  | 'storage'
  | 'source'
  | 'pump'
  | 'valve'
  | 'sensor'
  | 'consumer'
  | 'zone'
  | 'meter'
  | 'air';

export interface PortDef {
  id:     string;
  label:  string;
  medium: Medium;
  role:   'inlet' | 'outlet' | 'bidirectional';
  anchor: 'top' | 'bottom' | 'left' | 'right';
}

export interface SensorSlot {
  id:                string;
  label:             string;
  metric:            ProfileMetric;
  unit?:             string;
  required:          boolean;
  defaultTtlSeconds: number;
}

export interface CommandDef {
  id:            string;
  label:         string;
  dangerous:     boolean;
  confirm:       boolean;
  interlockKeys?: string[];
}

export interface PropertyDef {
  key:      string;
  label:    string;
  type:     'number' | 'string' | 'boolean' | 'enum';
  unit?:    string;
  options?: string[];
  default?: unknown;
  editable: boolean;
}

export interface VisualDef {
  shape:               'tank' | 'pump' | 'valve' | 'exchanger' | 'sensor' | 'zone' | 'generic';
  icon?:               string;
  primaryStatusMetric: ProfileMetric;
  portAnchors:         Record<string, PortDef['anchor']>;
  dashboardCard:       { fields: string[] };
  propertyPanel:       { sections: ('live' | 'commands' | 'history' | 'alarms' | 'maintenance' | 'config' | 'dependencies')[] };
}

export interface ComponentDefinition {
  typeId:                     string;
  category:                   ComponentCategory;
  label:                      string;
  ports:                      PortDef[];
  properties:                 PropertyDef[];
  sensorSlots:                SensorSlot[];
  commands:                   CommandDef[];
  defaultOperationalProfileId?: string;
  ruleRefs?:                  string[];
  visual:                     VisualDef;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export interface ComponentRegistry {
  /** Register a definition. Throws if typeId is already registered. */
  register(definition: ComponentDefinition): void;

  /** Returns the definition or undefined if not found. */
  get(typeId: string): ComponentDefinition | undefined;

  /** Returns the definition or throws if not found. */
  getOrThrow(typeId: string): ComponentDefinition;

  /** All registered definitions, in registration order. */
  listAll(): ComponentDefinition[];
}

export function createComponentRegistry(): ComponentRegistry {
  const definitions = new Map<string, ComponentDefinition>();

  return {
    register(definition) {
      if (definitions.has(definition.typeId)) {
        throw new Error(
          `ComponentRegistry: typeId "${definition.typeId}" is already registered. ` +
          'Each type may only be registered once.',
        );
      }
      definitions.set(definition.typeId, definition);
    },

    get(typeId) {
      return definitions.get(typeId);
    },

    getOrThrow(typeId) {
      const def = definitions.get(typeId);
      if (!def) {
        throw new Error(
          `ComponentRegistry: typeId "${typeId}" is not registered.`,
        );
      }
      return def;
    },

    listAll() {
      return [...definitions.values()];
    },
  };
}
