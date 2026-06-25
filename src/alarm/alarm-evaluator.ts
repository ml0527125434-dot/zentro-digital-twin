/**
 * Zentro Digital Twin — AlarmEvaluator (Stage 8)
 *
 * Pure evaluation of alarm state transitions for a single component.
 * No store writes, no side effects. All state transitions delegate to
 * alarm-machine primitives.
 *
 * applyAlarmEvaluation() is the single write point: it reads from AlarmStore,
 * calls evaluateAlarms(), and persists the result. Must be called outside React.
 */

import type { Alarm, AlarmRule, NodeStatus } from '../domain/types.js';
import type { AlarmStore } from './alarm-store.js';
import {
  raiseAlarm,
  activateAlarm,
  dismissAlarm,
  hasDebounceElapsed,
} from './alarm-machine.js';

/**
 * Pure function. Given the component's current NodeStatus and the full set of
 * alarm rules + existing alarms for that component, returns the next alarm list.
 *
 * Transition rules applied in order:
 *  - For each rule whose triggerStatus includes currentStatus:
 *      • If no existing alarm for this rule → raise a new pending alarm.
 *      • If existing alarm is pending and debounce elapsed → activate it.
 *      • If existing alarm is pending and debounce not elapsed → keep as-is.
 *      • If existing alarm is active/acknowledged → keep as-is (condition still bad).
 *  - For each rule whose triggerStatus does NOT include currentStatus:
 *      • If existing alarm is pending → dismiss it (condition cleared before activation).
 *      • If existing alarm is active or acknowledged → clear it (set clearedAt, state = cleared).
 *      • If existing alarm is cleared/dismissed → keep as-is (already terminal).
 *
 * Input arrays are never mutated.
 */
export function evaluateAlarms(
  componentId:    string,
  currentStatus:  NodeStatus,
  nowMs:          number,
  rules:          readonly AlarmRule[],
  existingAlarms: readonly Alarm[],
): Alarm[] {
  const nowIso = new Date(nowMs).toISOString();

  // Index existing alarms by ruleId for O(1) lookup.
  const byRule = new Map<string, Alarm>();
  for (const alarm of existingAlarms) {
    if (alarm.componentId === componentId) {
      byRule.set(alarm.ruleId, alarm);
    }
  }

  const next: Alarm[] = [];

  for (const rule of rules) {
    if (rule.componentId !== componentId) continue;

    const existing   = byRule.get(rule.id);
    const triggered  = rule.triggerStatus.includes(currentStatus);

    if (triggered) {
      if (!existing) {
        next.push(raiseAlarm(rule, nowIso));
      } else if (existing.state === 'pending') {
        if (hasDebounceElapsed(existing, rule.debounceSeconds, nowMs)) {
          next.push(activateAlarm(existing, nowIso));
        } else {
          next.push(existing);
        }
      } else {
        // active, acknowledged, cleared, dismissed — keep as-is while condition holds
        next.push(existing);
      }
    } else {
      // Condition no longer met
      if (!existing) {
        // Never raised — nothing to do
      } else if (existing.state === 'pending') {
        next.push(dismissAlarm(existing, nowIso));
      } else if (existing.state === 'active' || existing.state === 'acknowledged') {
        // Clear without requiring explicit acknowledgement at this layer.
        // Acknowledgement UI is out of scope for Stage 8.
        next.push(Object.freeze({ ...existing, state: 'cleared' as const, clearedAt: nowIso }));
      } else {
        // Already cleared or dismissed — preserve terminal state
        next.push(existing);
      }
    }
  }

  return next;
}

/**
 * Reads rules and existing alarms for componentId from store, evaluates the
 * next alarm state, and writes the results back. This is the sole write path.
 * Must be called outside React — never from a hook or component.
 */
export function applyAlarmEvaluation(
  componentId:   string,
  currentStatus: NodeStatus,
  nowMs:         number,
  store:         AlarmStore,
): void {
  const rules          = store.getAlarmRulesForComponent(componentId);
  const existingAlarms = store.getAlarmsForComponent(componentId);
  const next           = evaluateAlarms(componentId, currentStatus, nowMs, rules, existingAlarms);

  for (const alarm of next) {
    store.setAlarm(alarm);
  }
}
