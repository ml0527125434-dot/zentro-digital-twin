import { describe, it, expect } from 'vitest';
import { evaluateProfile } from './profile-evaluator.js';
import { NodeStatus } from '../domain/types.js';
import type { MetricBands } from '../domain/types.js';

const TEMP_BANDS: MetricBands = {
  metric: 'temperature',
  unit:   '°C',
  bands: [
    { status: NodeStatus.Risk, max: 50 },          // (-∞, 50)
    { status: NodeStatus.Warn, min: 50, max: 55 }, // [50, 55)
    { status: NodeStatus.Ok,   min: 55 },          // [55, +∞)
  ],
};

const SCALD_BANDS: MetricBands = {
  metric: 'temperature',
  bands: [
    { status: NodeStatus.Scald, min: 50 },
    { status: NodeStatus.Warn,  min: 45, max: 50 },
    { status: NodeStatus.Ok,    min: 38, max: 45 },
    { status: NodeStatus.Warn,  min: 30, max: 38 },
    { status: NodeStatus.Cold,  max: 30 },
  ],
};

describe('evaluateProfile', () => {
  it('returns Unknown when value is null', () => {
    expect(evaluateProfile(null, TEMP_BANDS)).toBe(NodeStatus.Unknown);
  });

  it('returns Unknown when no band matches', () => {
    const bands: MetricBands = { metric: 'temperature', bands: [] };
    expect(evaluateProfile(55, bands)).toBe(NodeStatus.Unknown);
  });

  // TEMP_BANDS
  it('matches Risk band (value below min threshold)', () => {
    expect(evaluateProfile(40, TEMP_BANDS)).toBe(NodeStatus.Risk);
    expect(evaluateProfile(49.9, TEMP_BANDS)).toBe(NodeStatus.Risk);
  });

  it('matches Warn band at lower boundary (min inclusive)', () => {
    expect(evaluateProfile(50, TEMP_BANDS)).toBe(NodeStatus.Warn);
    expect(evaluateProfile(54.9, TEMP_BANDS)).toBe(NodeStatus.Warn);
  });

  it('matches Ok band (value >= 55)', () => {
    expect(evaluateProfile(55, TEMP_BANDS)).toBe(NodeStatus.Ok);
    expect(evaluateProfile(75, TEMP_BANDS)).toBe(NodeStatus.Ok);
  });

  it('max is exclusive — value === max uses next band', () => {
    // 55 is not in the Warn band [50, 55) — it falls to Ok [55, ∞)
    expect(evaluateProfile(55, TEMP_BANDS)).toBe(NodeStatus.Ok);
  });

  it('first-match wins (order matters)', () => {
    // Both first and second bands could theoretically match 50 without ordering
    expect(evaluateProfile(50, TEMP_BANDS)).toBe(NodeStatus.Warn); // not Risk
  });

  // SCALD_BANDS
  it('Scald band at value 60', () => {
    expect(evaluateProfile(60, SCALD_BANDS)).toBe(NodeStatus.Scald);
  });

  it('Cold band below 30', () => {
    expect(evaluateProfile(20, SCALD_BANDS)).toBe(NodeStatus.Cold);
  });

  it('Ok band in [38, 45)', () => {
    expect(evaluateProfile(38, SCALD_BANDS)).toBe(NodeStatus.Ok);
    expect(evaluateProfile(44, SCALD_BANDS)).toBe(NodeStatus.Ok);
  });

  it('Warn band in [30, 38)', () => {
    expect(evaluateProfile(30, SCALD_BANDS)).toBe(NodeStatus.Warn);
    expect(evaluateProfile(37, SCALD_BANDS)).toBe(NodeStatus.Warn);
  });

  it('handles negative values in Risk-only band', () => {
    const bands: MetricBands = {
      metric: 'temperature',
      bands:  [{ status: NodeStatus.Fault, max: 0 }],
    };
    expect(evaluateProfile(-5, bands)).toBe(NodeStatus.Fault);
    expect(evaluateProfile(0, bands)).toBe(NodeStatus.Unknown); // 0 is not < 0
  });
});
