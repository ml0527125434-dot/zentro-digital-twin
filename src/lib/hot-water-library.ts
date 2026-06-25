/**
 * Zentro Digital Twin — Hot Water Component Library
 *
 * Registers all component definitions for a complete hot-water domain.
 * Extends the base library with heat sources, sensors, valves, meters,
 * storage variants, and distribution components.
 *
 * Call registerHotWaterLibrary(registry) after registerBaseLibrary(registry).
 */

import type { ComponentRegistry } from './component-registry.js';
import { GAS_BACKUP }             from './definitions/gas-backup.def.js';
import { POINT_OF_USE }           from './definitions/point-of-use.def.js';
import { BUFFER_TANK }            from './definitions/buffer-tank.def.js';
import { ELECTRIC_HEATER }        from './definitions/electric-heater.def.js';
import { SOLAR_COLLECTOR }        from './definitions/solar-collector.def.js';
import { PLATE_HEAT_EXCHANGER }   from './definitions/plate-heat-exchanger.def.js';
import { CONTROL_VALVE }          from './definitions/control-valve.def.js';
import { ISOLATION_VALVE }        from './definitions/isolation-valve.def.js';
import { SAFETY_VALVE }           from './definitions/safety-valve.def.js';
import { TEMPERATURE_SENSOR }     from './definitions/temperature-sensor.def.js';
import { PRESSURE_SENSOR }        from './definitions/pressure-sensor.def.js';
import { FLOW_SENSOR }            from './definitions/flow-sensor.def.js';
import { ENERGY_METER }           from './definitions/energy-meter.def.js';
import { WATER_METER }            from './definitions/water-meter.def.js';
import { EXPANSION_VESSEL }       from './definitions/expansion-vessel.def.js';
import { FILTER }                 from './definitions/filter.def.js';
import { AIR_SEPARATOR }          from './definitions/air-separator.def.js';
import { VARIABLE_SPEED_PUMP }    from './definitions/variable-speed-pump.def.js';
import { DISTRIBUTION_MANIFOLD }  from './definitions/distribution-manifold.def.js';
import { TAP }                    from './definitions/tap.def.js';

export const HOT_WATER_DEFINITIONS = [
  // Conformance types
  GAS_BACKUP,
  POINT_OF_USE,
  // Storage variants
  BUFFER_TANK,
  EXPANSION_VESSEL,
  // Heat sources
  ELECTRIC_HEATER,
  SOLAR_COLLECTOR,
  PLATE_HEAT_EXCHANGER,
  // Pumps
  VARIABLE_SPEED_PUMP,
  // Valves
  CONTROL_VALVE,
  ISOLATION_VALVE,
  SAFETY_VALVE,
  // Sensors
  TEMPERATURE_SENSOR,
  PRESSURE_SENSOR,
  FLOW_SENSOR,
  // Meters
  ENERGY_METER,
  WATER_METER,
  // Auxiliary
  FILTER,
  AIR_SEPARATOR,
  // Distribution
  DISTRIBUTION_MANIFOLD,
  // Consumers
  TAP,
] as const;

export function registerHotWaterLibrary(registry: ComponentRegistry): void {
  for (const def of HOT_WATER_DEFINITIONS) {
    registry.register(def);
  }
}
