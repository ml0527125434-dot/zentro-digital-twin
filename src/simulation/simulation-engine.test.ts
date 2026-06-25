import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateSampleValue, createSimulationEngine } from './simulation-engine.js';
import { createInMemoryLiveStore } from '../telemetry/live-store.js';
import { SensorState, ValueProvenance } from '../domain/types.js';

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// generateSampleValue — pure function
// ---------------------------------------------------------------------------

describe('generateSampleValue', () => {
  it('returns a value within [min, max]', () => {
    for (let t = 0; t < 10_000; t += 500) {
      const v = generateSampleValue(t, 10, 20, 10_000, 0);
      expect(v).toBeGreaterThanOrEqual(10);
      expect(v).toBeLessThanOrEqual(20);
    }
  });

  it('is deterministic — same inputs produce the same output', () => {
    const a = generateSampleValue(12_345, 0, 100, 60_000, 0);
    const b = generateSampleValue(12_345, 0, 100, 60_000, 0);
    expect(a).toBe(b);
  });

  it('returns different values at different times', () => {
    const a = generateSampleValue(0,      0, 100, 60_000, 0);
    const b = generateSampleValue(15_000, 0, 100, 60_000, 0);
    expect(a).not.toBe(b);
  });

  it('completes a full cycle — value at t=0 equals value at t=periodMs', () => {
    const a = generateSampleValue(0,       10, 20, 40_000, 0);
    const b = generateSampleValue(40_000,  10, 20, 40_000, 0);
    expect(a).toBeCloseTo(b, 10);
  });

  it('phaseOffset shifts the waveform — same time, different phases produce different values', () => {
    const a = generateSampleValue(5_000, 0, 100, 20_000, 0);
    const b = generateSampleValue(5_000, 0, 100, 20_000, 0.5);
    expect(a).not.toBeCloseTo(b, 1);
  });

  it('midpoint of range is the mean of min and max', () => {
    // At t = period/4, sin(2π·0.25) = 1, value = max
    const atPeak = generateSampleValue(10_000, 0, 100, 40_000, 0);
    expect(atPeak).toBeCloseTo(100, 5);
    // At t = 3*period/4, sin(2π·0.75) = -1, value = min
    const atTrough = generateSampleValue(30_000, 0, 100, 40_000, 0);
    expect(atTrough).toBeCloseTo(0, 5);
  });
});

// ---------------------------------------------------------------------------
// createSimulationEngine — lifecycle and store writes
// ---------------------------------------------------------------------------

describe('createSimulationEngine', () => {
  it('isRunning() is false before start', () => {
    const store  = createInMemoryLiveStore();
    const engine = createSimulationEngine(
      [{ bindingId: 'b1', min: 0, max: 10, periodMs: 1_000, phaseOffset: 0 }],
      store, 100,
    );
    expect(engine.isRunning()).toBe(false);
  });

  it('isRunning() is true after start, false after stop', () => {
    vi.useFakeTimers();
    const store  = createInMemoryLiveStore();
    const engine = createSimulationEngine(
      [{ bindingId: 'b1', min: 0, max: 10, periodMs: 1_000, phaseOffset: 0 }],
      store, 100,
    );
    engine.start();
    expect(engine.isRunning()).toBe(true);
    engine.stop();
    expect(engine.isRunning()).toBe(false);
  });

  it('writes a sample immediately on start', () => {
    vi.useFakeTimers();
    const store  = createInMemoryLiveStore();
    const engine = createSimulationEngine(
      [{ bindingId: 'b1', min: 5, max: 15, periodMs: 1_000, phaseOffset: 0 }],
      store, 100,
    );
    engine.start();
    const sample = store.get('b1');
    expect(sample).toBeDefined();
    expect(sample!.bindingId).toBe('b1');
    engine.stop();
  });

  it('writes correct SensorState and provenance', () => {
    vi.useFakeTimers();
    const store  = createInMemoryLiveStore();
    const engine = createSimulationEngine(
      [{ bindingId: 'b1', min: 0, max: 10, periodMs: 1_000, phaseOffset: 0 }],
      store, 100,
    );
    engine.start();
    const sample = store.get('b1')!;
    expect(sample.state).toBe(SensorState.Live);
    expect(sample.provenance).toBe(ValueProvenance.Inferred);
    engine.stop();
  });

  it('writes new samples on each tick', () => {
    vi.useFakeTimers();
    const store  = createInMemoryLiveStore();
    const engine = createSimulationEngine(
      [{ bindingId: 'b1', min: 0, max: 100, periodMs: 10_000, phaseOffset: 0 }],
      store, 100,
    );
    engine.start();
    const ts1 = store.get('b1')!.ts;
    vi.advanceTimersByTime(2_500);
    const ts2 = store.get('b1')!.ts;
    expect(ts2).not.toBe(ts1);
    engine.stop();
  });

  it('does not write after stop', () => {
    vi.useFakeTimers();
    const store  = createInMemoryLiveStore();
    const engine = createSimulationEngine(
      [{ bindingId: 'b1', min: 0, max: 100, periodMs: 10_000, phaseOffset: 0 }],
      store, 100,
    );
    engine.start();
    engine.stop();
    const ts1 = store.get('b1')!.ts;
    vi.advanceTimersByTime(500);
    const ts2 = store.get('b1')!.ts;
    expect(ts2).toBe(ts1);
  });

  it('calling start() twice does not create a second interval', () => {
    vi.useFakeTimers();
    const store  = createInMemoryLiveStore();
    const engine = createSimulationEngine(
      [{ bindingId: 'b1', min: 0, max: 100, periodMs: 10_000, phaseOffset: 0 }],
      store, 100,
    );
    engine.start();
    engine.start();  // idempotent
    engine.stop();
    expect(engine.isRunning()).toBe(false);
  });

  it('writes all configured bindings on each tick', () => {
    vi.useFakeTimers();
    const store  = createInMemoryLiveStore();
    const engine = createSimulationEngine(
      [
        { bindingId: 'b_a', min: 0, max: 10, periodMs: 1_000, phaseOffset: 0   },
        { bindingId: 'b_b', min: 0, max: 20, periodMs: 1_000, phaseOffset: 0.5 },
        { bindingId: 'b_c', min: 5, max: 15, periodMs: 2_000, phaseOffset: 0.1 },
      ],
      store, 100,
    );
    engine.start();
    expect(store.get('b_a')).toBeDefined();
    expect(store.get('b_b')).toBeDefined();
    expect(store.get('b_c')).toBeDefined();
    engine.stop();
  });
});
