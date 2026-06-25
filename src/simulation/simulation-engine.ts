/**
 * Zentro Digital Twin — Simulation Engine (Stage 14)
 *
 * Generic deterministic telemetry simulator for demo/dev use.
 * Writes LiveSample values to LiveStore on a fixed interval.
 *
 * This is NOT a React construct. It is an external service started outside
 * the render tree. React never calls liveStore.set() — the engine does.
 * useEffect in the demo entry point is responsible for lifecycle only (start/stop).
 *
 * ValueProvenance.Inferred is used because values are computed, not measured
 * from a real sensor.
 */

import { SensorState, ValueProvenance } from '../domain/types.js';
import type { LiveStore } from '../telemetry/live-store.js';

// ---------------------------------------------------------------------------
// SimulationBinding — configuration for a single binding's waveform
// ---------------------------------------------------------------------------

export interface SimulationBinding {
  bindingId:   string;
  min:         number;
  max:         number;
  periodMs:    number;
  phaseOffset: number;  // 0..1 fraction of period
}

// ---------------------------------------------------------------------------
// generateSampleValue — pure, deterministic sine wave
//
// Returns a value in [min, max] based on a sine wave over periodMs.
// phaseOffset shifts the starting phase so bindings cycle out of sync.
// ---------------------------------------------------------------------------

export function generateSampleValue(
  nowMs:       number,
  min:         number,
  max:         number,
  periodMs:    number,
  phaseOffset: number,
): number {
  const t = ((nowMs % periodMs) / periodMs + phaseOffset) % 1;
  return min + (max - min) * (0.5 + 0.5 * Math.sin(2 * Math.PI * t));
}

// ---------------------------------------------------------------------------
// SimulationEngine — lifecycle handle returned by createSimulationEngine
// ---------------------------------------------------------------------------

export interface SimulationEngine {
  start():     void;
  stop():      void;
  isRunning(): boolean;
}

// ---------------------------------------------------------------------------
// createSimulationEngine — factory
//
// On each tick: generates a sample for every binding and writes it to
// liveStore. Writes happen in the setInterval callback — outside React.
// ---------------------------------------------------------------------------

export function createSimulationEngine(
  bindings:   readonly SimulationBinding[],
  liveStore:  LiveStore,
  intervalMs: number,
): SimulationEngine {
  let handle: ReturnType<typeof setInterval> | null = null;

  function tick(): void {
    const nowMs = Date.now();
    const ts    = new Date(nowMs).toISOString();
    for (const b of bindings) {
      const value = generateSampleValue(nowMs, b.min, b.max, b.periodMs, b.phaseOffset);
      liveStore.set(b.bindingId, {
        bindingId:  b.bindingId,
        value,
        ts,
        state:      SensorState.Live,
        provenance: ValueProvenance.Inferred,
      });
    }
  }

  return {
    start() {
      if (handle !== null) return;
      tick();  // write immediately so first render has data
      handle = setInterval(tick, intervalMs);
    },
    stop() {
      if (handle === null) return;
      clearInterval(handle);
      handle = null;
    },
    isRunning() {
      return handle !== null;
    },
  };
}
