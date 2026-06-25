import { NodeStatus } from '../domain/types.js';
import type { MetricBands } from '../domain/types.js';

/**
 * Stateless band matching: MetricBands + value → NodeStatus.
 *
 * Bands are evaluated top-to-bottom; the first match wins.
 * A band matches when: (min ?? -Infinity) <= value < (max ?? +Infinity).
 * min is inclusive, max is exclusive.
 *
 * Returns NodeStatus.Unknown when value is null or no band matches.
 * Hysteresis is NOT evaluated here — it is a future server-side contract.
 */
export function evaluateProfile(
  value:  number | null,
  bands:  MetricBands,
): NodeStatus {
  if (value === null) return NodeStatus.Unknown;

  for (const band of bands.bands) {
    const min = band.min ?? -Infinity;
    const max = band.max ?? +Infinity;
    if (value >= min && value < max) return band.status;
  }

  return NodeStatus.Unknown;
}
