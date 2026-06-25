/**
 * Zentro Digital Twin — Base Component Library
 *
 * Registers the four generic base definitions.
 * Does NOT register conformance-specific definitions (gas_backup, point_of_use).
 * Those are registered explicitly by seeds or applications that require them.
 *
 * Base library: storage_tank · heat_pump · recirc_pump · mixing_valve
 */

import type { ComponentRegistry } from './component-registry.js';
import { STORAGE_TANK } from './definitions/storage-tank.def.js';
import { HEAT_PUMP    } from './definitions/heat-pump.def.js';
import { RECIRC_PUMP  } from './definitions/recirc-pump.def.js';
import { MIXING_VALVE } from './definitions/mixing-valve.def.js';

export const BASE_DEFINITIONS = [
  STORAGE_TANK,
  HEAT_PUMP,
  RECIRC_PUMP,
  MIXING_VALVE,
] as const;

export function registerBaseLibrary(registry: ComponentRegistry): void {
  for (const def of BASE_DEFINITIONS) {
    registry.register(def);
  }
}
