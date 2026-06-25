import {
  FlowState, NodeStatus, SensorState, ValueProvenance,
} from '../domain/types.js';
import type { Connection, ConnectionViewModel } from '../domain/types.js';
import type { LiveStore } from '../telemetry/live-store.js';
import { evaluateSensorState } from '../telemetry/sensor-state.js';

/**
 * Projects a Connection into a ConnectionViewModel.
 *
 * Flow derivation reads ONLY flow and sensorState — per Constitution and Stage 3 constraint:
 *   Flowing  — sensorState === Live && value > 0
 *   NoFlow   — sensorState === Live && value === 0
 *   Reverse  — sensorState === Live && value < 0  (bidirectional connections)
 *   Unknown  — no valueBindingId, no sample, or sensorState !== Live
 *
 * ConnectionViewModel.status is always NodeStatus.Unknown in Stage 4.
 * Connection-level OperationalProfile evaluation is deferred.
 */
export function projectConnection(
  connection: Connection,
  liveStore:  LiveStore,
  nowMs:      number,
): ConnectionViewModel {
  const { valueBindingId, bindings } = connection;

  if (!valueBindingId || !bindings?.length) {
    return {
      connectionId: connection.id,
      flow:         FlowState.Unknown,
      value:        null,
      status:       NodeStatus.Unknown,
      sensorState:  SensorState.Unknown,
      provenance:   ValueProvenance.Unknown,
    };
  }

  const binding = bindings.find(b => b.id === valueBindingId);
  if (!binding) {
    return {
      connectionId: connection.id,
      flow:         FlowState.Unknown,
      value:        null,
      status:       NodeStatus.Unknown,
      sensorState:  SensorState.Unknown,
      provenance:   ValueProvenance.Unknown,
    };
  }

  const sample      = liveStore.get(valueBindingId);
  const sensorState = evaluateSensorState(sample, binding.ttlSeconds, nowMs);

  let flow:  FlowState = FlowState.Unknown;
  let value: number | null = null;

  if (sensorState === SensorState.Live && sample !== null && sample !== undefined) {
    const raw = sample.value;
    if (typeof raw === 'number') {
      value = raw;
      if (raw > 0)  flow = FlowState.Flowing;
      else if (raw === 0) flow = FlowState.NoFlow;
      else          flow = FlowState.Reverse;
    }
  }

  return {
    connectionId: connection.id,
    flow,
    value,
    ...(binding.unit !== undefined ? { unit: binding.unit } : {}),
    status:      NodeStatus.Unknown,
    sensorState,
    provenance:  sample?.provenance ?? ValueProvenance.Unknown,
  };
}
