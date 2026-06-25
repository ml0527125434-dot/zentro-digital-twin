/**
 * Zentro Digital Twin — AlarmStore (Stage 7)
 *
 * Read model for alarm state. Holds Alarm instances and their AlarmRules.
 * Owned and populated by the application bootstrap layer — outside React.
 * Projection reads alarm state as a readonly input; React never writes to it.
 * No component graph mutations. No telemetry mutations.
 */

import type { Alarm, AlarmRule } from '../domain/types.js';
import type { AlarmWithSeverity } from '../projection/health-derivation.js';

export interface AlarmStore {
  /** Upsert an alarm (keyed by alarm.id). */
  setAlarm(alarm: Alarm): void;
  /** Returns all alarms for the given componentId. */
  getAlarmsForComponent(componentId: string): Alarm[];
  /** Upsert an AlarmRule (keyed by rule.id). */
  setAlarmRule(rule: AlarmRule): void;
  /** Returns the rule or undefined. */
  getAlarmRule(ruleId: string): AlarmRule | undefined;
}

export function createInMemoryAlarmStore(): AlarmStore {
  const alarms = new Map<string, Alarm>();
  const rules  = new Map<string, AlarmRule>();

  return {
    setAlarm(alarm) {
      alarms.set(alarm.id, alarm);
    },
    getAlarmsForComponent(componentId) {
      return [...alarms.values()].filter(a => a.componentId === componentId);
    },
    setAlarmRule(rule) {
      rules.set(rule.id, rule);
    },
    getAlarmRule(ruleId) {
      return rules.get(ruleId);
    },
  };
}

/**
 * Returns AlarmWithSeverity[] for a component, merging each alarm with its rule's severity.
 * Alarms whose rule cannot be found are excluded (defensive — avoids silent incorrect health).
 */
export function getAlarmsWithSeverity(
  store:       AlarmStore,
  componentId: string,
): AlarmWithSeverity[] {
  const alarms = store.getAlarmsForComponent(componentId);
  const result: AlarmWithSeverity[] = [];

  for (const alarm of alarms) {
    const rule = store.getAlarmRule(alarm.ruleId);
    if (!rule) continue;
    result.push({ ...alarm, severity: rule.severity });
  }

  return result;
}
