import { HealthState, SensorState } from '../domain/types.js';
import type { Alarm, Component } from '../domain/types.js';

/**
 * Alarm decorated with the severity from its AlarmRule.
 * projectComponent() merges alarm + rule before calling deriveHealthState().
 */
export interface AlarmWithSeverity extends Alarm {
  severity: 'info' | 'warning' | 'critical';
}

/**
 * Derives HealthState from mode, governing sensor states, and active alarms.
 *
 * Priority order (approved verbatim — first match wins):
 *   1. mode === commissioning → Commissioning
 *   2. mode === maintenance   → Maintenance
 *   3. ALL governing states === Lost (array non-empty) → Offline
 *   4. any non-terminal alarm with severity === critical → Critical
 *   5. any non-terminal alarm with severity === warning  → Warning
 *   6. otherwise → Healthy
 *
 * Non-terminal alarm states: 'active' | 'acknowledged'.
 *
 * @param mode                  Component.mode (undefined treated as 'normal')
 * @param governingSensorStates SensorState for each required binding on the component
 * @param activeAlarms          Alarms + severity for this component (any state)
 */
export function deriveHealthState(
  mode:                  Component['mode'],
  governingSensorStates: SensorState[],
  activeAlarms:          AlarmWithSeverity[],
): HealthState {
  if (mode === 'commissioning') return HealthState.Commissioning;
  if (mode === 'maintenance')   return HealthState.Maintenance;

  if (
    governingSensorStates.length > 0 &&
    governingSensorStates.every(s => s === SensorState.Lost)
  ) {
    return HealthState.Offline;
  }

  const nonTerminal = activeAlarms.filter(
    a => a.state === 'active' || a.state === 'acknowledged',
  );

  if (nonTerminal.some(a => a.severity === 'critical')) return HealthState.Critical;
  if (nonTerminal.some(a => a.severity === 'warning'))  return HealthState.Warning;

  return HealthState.Healthy;
}
