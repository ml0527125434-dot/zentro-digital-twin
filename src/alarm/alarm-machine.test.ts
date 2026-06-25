import { describe, it, expect, beforeEach } from 'vitest';
import {
  raiseAlarm,
  activateAlarm,
  acknowledgeAlarm,
  clearAlarm,
  dismissAlarm,
  hasDebounceElapsed,
  isAlarmSuppressed,
} from './alarm-machine.js';
import type { AlarmRule } from '../domain/types.js';
import { NodeStatus } from '../domain/types.js';

const NOW     = '2024-01-01T12:00:00.000Z';
const NOW_MS  = new Date(NOW).getTime();
const LATER   = '2024-01-01T12:00:30.000Z'; // 30s after NOW

const RULE: AlarmRule = {
  id:              'rule_temp_risk',
  componentId:     'cmp_tank',
  triggerStatus:   [NodeStatus.Risk],
  debounceSeconds: 20,
  severity:        'warning',
  message:         'Tank temperature below threshold',
};

describe('raiseAlarm', () => {
  it('returns an alarm in pending state', () => {
    const a = raiseAlarm(RULE, NOW);
    expect(a.state).toBe('pending');
  });

  it('sets ruleId and componentId from the rule', () => {
    const a = raiseAlarm(RULE, NOW);
    expect(a.ruleId).toBe(RULE.id);
    expect(a.componentId).toBe(RULE.componentId);
  });

  it('sets raisedAt to the provided timestamp', () => {
    const a = raiseAlarm(RULE, NOW);
    expect(a.raisedAt).toBe(NOW);
  });

  it('returns a frozen (immutable) object', () => {
    const a = raiseAlarm(RULE, NOW);
    expect(Object.isFrozen(a)).toBe(true);
  });

  it('generates unique ids on successive calls', () => {
    const a1 = raiseAlarm(RULE, NOW);
    const a2 = raiseAlarm(RULE, NOW);
    expect(a1.id).not.toBe(a2.id);
  });
});

describe('activateAlarm', () => {
  it('transitions pending → active', () => {
    const pending = raiseAlarm(RULE, NOW);
    const active  = activateAlarm(pending, LATER);
    expect(active.state).toBe('active');
  });

  it('throws when alarm is not pending', () => {
    const pending = raiseAlarm(RULE, NOW);
    const active  = activateAlarm(pending, LATER);
    expect(() => activateAlarm(active, LATER)).toThrow(/pending/);
  });

  it('returned alarm is frozen', () => {
    const a = activateAlarm(raiseAlarm(RULE, NOW), LATER);
    expect(Object.isFrozen(a)).toBe(true);
  });
});

describe('acknowledgeAlarm', () => {
  it('transitions active → acknowledged', () => {
    const active = activateAlarm(raiseAlarm(RULE, NOW), NOW);
    const acked  = acknowledgeAlarm(active, 'operator_1', LATER);
    expect(acked.state).toBe('acknowledged');
    expect(acked.ackBy).toBe('operator_1');
    expect(acked.ackAt).toBe(LATER);
  });

  it('throws when alarm is not active', () => {
    const pending = raiseAlarm(RULE, NOW);
    expect(() => acknowledgeAlarm(pending, 'op', LATER)).toThrow(/active/);
  });
});

describe('clearAlarm', () => {
  it('transitions acknowledged → cleared', () => {
    const active = activateAlarm(raiseAlarm(RULE, NOW), NOW);
    const acked  = acknowledgeAlarm(active, 'op', NOW);
    const cleared = clearAlarm(acked, LATER);
    expect(cleared.state).toBe('cleared');
    expect(cleared.clearedAt).toBe(LATER);
  });

  it('throws when alarm is not acknowledged', () => {
    const active = activateAlarm(raiseAlarm(RULE, NOW), NOW);
    expect(() => clearAlarm(active, LATER)).toThrow(/acknowledged/);
  });
});

describe('dismissAlarm', () => {
  it('transitions pending → dismissed', () => {
    const pending   = raiseAlarm(RULE, NOW);
    const dismissed = dismissAlarm(pending, LATER);
    expect(dismissed.state).toBe('dismissed');
    expect(dismissed.clearedAt).toBe(LATER);
  });

  it('throws when alarm is not pending', () => {
    const active = activateAlarm(raiseAlarm(RULE, NOW), NOW);
    expect(() => dismissAlarm(active, LATER)).toThrow(/pending/);
  });
});

describe('hasDebounceElapsed', () => {
  it('returns false when age < debounceSeconds', () => {
    const alarm = raiseAlarm(RULE, NOW); // raisedAt = NOW_MS
    const fiveSecondsLater = NOW_MS + 5_000;
    expect(hasDebounceElapsed(alarm, RULE.debounceSeconds, fiveSecondsLater)).toBe(false);
  });

  it('returns true when age === debounceSeconds', () => {
    const alarm = raiseAlarm(RULE, NOW);
    const exactMs = NOW_MS + RULE.debounceSeconds * 1000;
    expect(hasDebounceElapsed(alarm, RULE.debounceSeconds, exactMs)).toBe(true);
  });

  it('returns true when age > debounceSeconds', () => {
    const alarm = raiseAlarm(RULE, NOW);
    const laterMs = NOW_MS + (RULE.debounceSeconds + 10) * 1000;
    expect(hasDebounceElapsed(alarm, RULE.debounceSeconds, laterMs)).toBe(true);
  });
});

describe('isAlarmSuppressed', () => {
  let alarm: ReturnType<typeof raiseAlarm>;
  beforeEach(() => { alarm = raiseAlarm(RULE, NOW); });

  it('suppressed when mode === maintenance', () => {
    expect(isAlarmSuppressed(alarm, 'maintenance')).toBe(true);
  });

  it('suppressed when mode === commissioning', () => {
    expect(isAlarmSuppressed(alarm, 'commissioning')).toBe(true);
  });

  it('not suppressed when mode === normal', () => {
    expect(isAlarmSuppressed(alarm, 'normal')).toBe(false);
  });

  it('not suppressed when mode is undefined', () => {
    expect(isAlarmSuppressed(alarm, undefined)).toBe(false);
  });
});
