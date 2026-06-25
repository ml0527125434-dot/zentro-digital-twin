import {
  NodeStatus, SensorState, ValueProvenance,
} from '../domain/types.js';
import type {
  Component, ComponentViewModel, ActiveCommand,
  OperationalProfile,
} from '../domain/types.js';
import type { ComponentDefinition } from '../lib/component-registry.js';
import type { LiveStore } from '../telemetry/live-store.js';
import { evaluateSensorState } from '../telemetry/sensor-state.js';
import { evaluateProfile } from './profile-evaluator.js';
import { deriveHealthState } from './health-derivation.js';
import type { AlarmWithSeverity } from './health-derivation.js';

/**
 * Projects a Component + its live data into a ComponentViewModel.
 *
 * Steps (in order):
 *   1. For each required SensorSlot, find its governing Binding by metric match.
 *   2. Evaluate SensorState for each governing binding via TTL.
 *   3. Derive HealthState from mode + governing states + active alarms.
 *   4. Find primary metric value → evaluate OperationalProfile → NodeStatus.
 *   5. Resolve ValueProvenance from the primary binding's sample.
 *   6. Build liveValues map (slotId → numeric/boolean/null).
 *   7. Return ComponentViewModel.
 *
 * @param component      CONFIG component instance
 * @param definition     ComponentDefinition (SDK blueprint)
 * @param liveStore      Current telemetry store
 * @param activeAlarms   Alarms + severity for this component (any state)
 * @param activeCommands In-flight commands for this component (caller-supplied)
 * @param profile        Effective OperationalProfile, or undefined
 * @param nowMs          Current time as Unix milliseconds
 */
export function projectComponent(
  component:      Component,
  definition:     ComponentDefinition,
  liveStore:      LiveStore,
  activeAlarms:   AlarmWithSeverity[],
  activeCommands: ActiveCommand[],
  profile:        OperationalProfile | undefined,
  nowMs:          number,
): ComponentViewModel {
  // -------------------------------------------------------------------------
  // Step 1-2: governing sensor states (required slots only)
  // -------------------------------------------------------------------------
  const governingSensorStates: SensorState[] = [];

  for (const slot of definition.sensorSlots) {
    if (!slot.required) continue;
    const binding = component.bindings.find(b => b.metric === slot.metric);
    if (!binding) {
      governingSensorStates.push(SensorState.Unknown);
      continue;
    }
    const sample = liveStore.get(binding.id);
    governingSensorStates.push(evaluateSensorState(sample, binding.ttlSeconds, nowMs));
  }

  // -------------------------------------------------------------------------
  // Step 3: HealthState
  // -------------------------------------------------------------------------
  const health = deriveHealthState(component.mode, governingSensorStates, activeAlarms);

  // -------------------------------------------------------------------------
  // Step 4: NodeStatus — primary metric via OperationalProfile
  // -------------------------------------------------------------------------
  let operationalStatus = NodeStatus.Unknown;
  let primaryProvenance = ValueProvenance.Unknown;
  let primaryConfidence: number | undefined;

  const primaryMetric = definition.visual?.primaryStatusMetric;

  if (primaryMetric && profile) {
    const metricBands = profile.metrics.find(m => m.metric === primaryMetric);
    const primaryBinding = component.bindings.find(b => b.metric === primaryMetric);

    if (metricBands && primaryBinding) {
      const sample = liveStore.get(primaryBinding.id);
      const ss     = evaluateSensorState(sample, primaryBinding.ttlSeconds, nowMs);

      if (ss === SensorState.Live && sample !== null && sample !== undefined) {
        const raw = sample.value;
        const numValue = typeof raw === 'number' ? raw : null;
        operationalStatus = evaluateProfile(numValue, metricBands);
        primaryProvenance = sample.provenance;
        primaryConfidence = sample.confidence;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Step 5: governing SensorState (pick worst: Lost > Stale > Unknown > Live)
  // -------------------------------------------------------------------------
  const overallSensorState = worstSensorState(governingSensorStates);

  // -------------------------------------------------------------------------
  // Step 6: liveValues — slotId → value
  // -------------------------------------------------------------------------
  const liveValues: Record<string, number | boolean | null> = {};

  for (const slot of definition.sensorSlots) {
    const binding = component.bindings.find(b => b.metric === slot.metric);
    if (!binding) { liveValues[slot.id] = null; continue; }
    const sample = liveStore.get(binding.id);
    if (!sample)  { liveValues[slot.id] = null; continue; }
    const ss = evaluateSensorState(sample, binding.ttlSeconds, nowMs);
    liveValues[slot.id] = ss === SensorState.Live ? sample.value : null;
  }

  // -------------------------------------------------------------------------
  // Step 7: assemble ViewModel
  // -------------------------------------------------------------------------
  return {
    componentId:       component.id,
    health,
    operationalStatus,
    sensorState:       overallSensorState,
    provenance:        primaryProvenance,
    ...(primaryConfidence !== undefined ? { confidence: primaryConfidence } : {}),
    liveValues,
    activeCommands,
    activeAlarms:      activeAlarms.map(a => a.id),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SENSOR_STATE_RANK: Record<SensorState, number> = {
  [SensorState.Lost]:    3,
  [SensorState.Stale]:   2,
  [SensorState.Unknown]: 1,
  [SensorState.Live]:    0,
};

function worstSensorState(states: SensorState[]): SensorState {
  if (states.length === 0) return SensorState.Unknown;
  return states.reduce((worst, s) =>
    SENSOR_STATE_RANK[s]! > SENSOR_STATE_RANK[worst]! ? s : worst,
    SensorState.Live,
  );
}
