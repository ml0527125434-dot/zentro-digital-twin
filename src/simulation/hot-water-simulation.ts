/**
 * Zentro Digital Twin — Hot-Water Simulation Config (Stage 14)
 *
 * Binding waveforms for the hot-water demo seed. Ranges are chosen so each
 * binding visibly cycles through multiple NodeStatus bands:
 *
 *   b_t1 (tank)        48–62 °C / 40 s  → Risk → Warn → Ok → Warn → Risk
 *   b_t2_supply (line) 49–63 °C / 44 s  → Risk → Warn → Ok  (offset ¼ phase)
 *   b_t3 (shower)      29–52 °C / 50 s  → Cold → Warn → Ok → Warn → Scald
 *   b_t4_return (loop) 43–56 °C / 36 s  → Risk → Warn → Ok  (offset ⅓ phase)
 */

import type { LiveStore } from '../telemetry/live-store.js';
import { createSimulationEngine, type SimulationBinding } from './simulation-engine.js';

export const HOT_WATER_SIMULATION_BINDINGS: readonly SimulationBinding[] = [
  // Temperature bindings — drive NodeStatus via OperationalProfiles
  { bindingId: 'b_t1',        min: 48, max: 62, periodMs: 40_000, phaseOffset: 0    },
  { bindingId: 'b_t2_supply', min: 49, max: 63, periodMs: 44_000, phaseOffset: 0.25 },
  { bindingId: 'b_t3',        min: 29, max: 52, periodMs: 50_000, phaseOffset: 0.5  },
  { bindingId: 'b_t4_return', min: 43, max: 56, periodMs: 36_000, phaseOffset: 0.33 },
  // Runtime / flow bindings — drive SensorState for heat pump, gas backup, recirc pump
  // Values oscillate 0–1; nodes threshold at 0.5 to show Running/Standby
  { bindingId: 'b_hp_state',  min: 0, max: 1, periodMs: 20_000, phaseOffset: 0    },
  { bindingId: 'b_gas_state', min: 0, max: 1, periodMs: 70_000, phaseOffset: 0.6  },
  { bindingId: 'b_pump_flow', min: 0, max: 12, periodMs: 25_000, phaseOffset: 0.1 },
];

export function createHotWaterSimulation(liveStore: LiveStore) {
  return createSimulationEngine(HOT_WATER_SIMULATION_BINDINGS, liveStore, 1_000);
}
