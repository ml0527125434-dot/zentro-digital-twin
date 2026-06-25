import { describe, it, expect } from 'vitest';
import { evaluateSensorState } from './sensor-state.js';
import { SensorState, ValueProvenance } from '../domain/types.js';
import type { LiveSample } from '../domain/types.js';

const TTL = 120; // seconds
const NOW_MS = 1_000_000_000_000; // fixed reference point

function makeSample(ageSeconds: number): LiveSample {
  return {
    bindingId:  'b_1',
    value:      62,
    ts:         new Date(NOW_MS - ageSeconds * 1000).toISOString(),
    state:      SensorState.Live,
    provenance: ValueProvenance.Measured,
  };
}

describe('evaluateSensorState', () => {
  it('returns Unknown when sample is undefined', () => {
    expect(evaluateSensorState(undefined, TTL, NOW_MS)).toBe(SensorState.Unknown);
  });

  it('returns Live when age === 0', () => {
    expect(evaluateSensorState(makeSample(0), TTL, NOW_MS)).toBe(SensorState.Live);
  });

  it('returns Live when age < ttl', () => {
    expect(evaluateSensorState(makeSample(TTL - 1), TTL, NOW_MS)).toBe(SensorState.Live);
  });

  it('returns Stale when age === ttl (boundary — not Live)', () => {
    expect(evaluateSensorState(makeSample(TTL), TTL, NOW_MS)).toBe(SensorState.Stale);
  });

  it('returns Stale when age is between ttl and 2*ttl', () => {
    expect(evaluateSensorState(makeSample(TTL + 1), TTL, NOW_MS)).toBe(SensorState.Stale);
    expect(evaluateSensorState(makeSample(TTL * 2 - 1), TTL, NOW_MS)).toBe(SensorState.Stale);
  });

  it('returns Lost when age === 2 * ttl (boundary)', () => {
    expect(evaluateSensorState(makeSample(TTL * 2), TTL, NOW_MS)).toBe(SensorState.Lost);
  });

  it('returns Lost when age > 2 * ttl', () => {
    expect(evaluateSensorState(makeSample(TTL * 3), TTL, NOW_MS)).toBe(SensorState.Lost);
  });

  it('treats future-dated sample (age < 0) as Live', () => {
    // Sample timestamped 10s in the future
    expect(evaluateSensorState(makeSample(-10), TTL, NOW_MS)).toBe(SensorState.Live);
  });

  it('works with ttl === 60 (common pump binding)', () => {
    expect(evaluateSensorState(makeSample(59), 60, NOW_MS)).toBe(SensorState.Live);
    expect(evaluateSensorState(makeSample(60), 60, NOW_MS)).toBe(SensorState.Stale);
    expect(evaluateSensorState(makeSample(120), 60, NOW_MS)).toBe(SensorState.Lost);
  });

  it('works with ttl === 1 (edge case)', () => {
    expect(evaluateSensorState(makeSample(0.5), 1, NOW_MS)).toBe(SensorState.Live);
    expect(evaluateSensorState(makeSample(1.5), 1, NOW_MS)).toBe(SensorState.Stale);
    expect(evaluateSensorState(makeSample(2),   1, NOW_MS)).toBe(SensorState.Lost);
  });
});
