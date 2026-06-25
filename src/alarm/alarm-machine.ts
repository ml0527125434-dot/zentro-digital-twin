import type { Alarm, AlarmRule, Component } from '../domain/types.js';

let _nextId = 1;
function newId(): string { return `alarm_${_nextId++}`; }

/**
 * Creates a new Alarm in state 'pending'.
 * Caller is responsible for running activateAlarm() once debounce elapses.
 */
export function raiseAlarm(rule: AlarmRule, now: string): Alarm {
  return Object.freeze({
    id:          newId(),
    ruleId:      rule.id,
    componentId: rule.componentId,
    raisedAt:    now,
    state:       'pending' as const,
  });
}

/**
 * Transitions a pending alarm to active once the debounce window has elapsed.
 * Throws if the alarm is not in 'pending' state.
 */
export function activateAlarm(alarm: Alarm, now: string): Alarm {
  if (alarm.state !== 'pending') {
    throw new Error(`activateAlarm: expected 'pending', got '${alarm.state}'`);
  }
  return Object.freeze({ ...alarm, state: 'active' as const });
}

/**
 * Acknowledges an active alarm.
 * Throws if the alarm is not in 'active' state.
 */
export function acknowledgeAlarm(alarm: Alarm, by: string, now: string): Alarm {
  if (alarm.state !== 'active') {
    throw new Error(`acknowledgeAlarm: expected 'active', got '${alarm.state}'`);
  }
  return Object.freeze({ ...alarm, state: 'acknowledged' as const, ackBy: by, ackAt: now });
}

/**
 * Clears an acknowledged alarm.
 * Throws if the alarm is not in 'acknowledged' state.
 */
export function clearAlarm(alarm: Alarm, now: string): Alarm {
  if (alarm.state !== 'acknowledged') {
    throw new Error(`clearAlarm: expected 'acknowledged', got '${alarm.state}'`);
  }
  return Object.freeze({ ...alarm, state: 'cleared' as const, clearedAt: now });
}

/**
 * Dismisses a pending alarm that cleared before its debounce elapsed.
 * Throws if the alarm is not in 'pending' state.
 */
export function dismissAlarm(alarm: Alarm, now: string): Alarm {
  if (alarm.state !== 'pending') {
    throw new Error(`dismissAlarm: expected 'pending', got '${alarm.state}'`);
  }
  return Object.freeze({ ...alarm, state: 'dismissed' as const, clearedAt: now });
}

/**
 * Returns true when the alarm's debounce window has elapsed.
 * Uses the rule's debounceSeconds and the alarm's raisedAt timestamp.
 */
export function hasDebounceElapsed(
  alarm:           Alarm,
  debounceSeconds: number,
  nowMs:           number,
): boolean {
  const raisedMs = new Date(alarm.raisedAt).getTime();
  return (nowMs - raisedMs) / 1000 >= debounceSeconds;
}

/**
 * Returns true when the alarm should be suppressed (not shown or escalated).
 * Alarms are suppressed when the component is in maintenance or commissioning mode.
 * Suppression is not a state change — the alarm retains its current state.
 */
export function isAlarmSuppressed(alarm: Alarm, mode: Component['mode']): boolean {
  void alarm; // suppression is based on component mode only, not alarm state
  return mode === 'maintenance' || mode === 'commissioning';
}
