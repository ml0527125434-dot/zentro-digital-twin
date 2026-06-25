import { SensorState } from '../domain/types.js';
import type { LiveSample } from '../domain/types.js';

/**
 * Derives SensorState from a live sample and its TTL window.
 *
 * Unknown  — no sample ever received
 * Live     — age < ttlSeconds
 * Stale    — ttlSeconds ≤ age < 2 * ttlSeconds
 * Lost     — age ≥ 2 * ttlSeconds
 *
 * Future-dated samples (sampleMs > nowMs) are treated as Live.
 *
 * @param sample      The most recent LiveSample for the binding, or undefined.
 * @param ttlSeconds  Freshness window declared on the Binding or SensorSlot.
 * @param nowMs       Current time as Unix milliseconds (Date.now()).
 */
export function evaluateSensorState(
  sample:      LiveSample | undefined,
  ttlSeconds:  number,
  nowMs:       number,
): SensorState {
  if (sample === undefined) return SensorState.Unknown;

  const sampleMs = new Date(sample.ts).getTime();
  const ageSeconds = (nowMs - sampleMs) / 1000;

  if (ageSeconds < ttlSeconds)            return SensorState.Live;
  if (ageSeconds < ttlSeconds * 2)        return SensorState.Stale;
  return SensorState.Lost;
}
