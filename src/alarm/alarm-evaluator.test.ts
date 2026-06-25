import { describe, it, expect } from 'vitest';
import { evaluateAlarms, applyAlarmEvaluation } from './alarm-evaluator.js';
import { createInMemoryAlarmStore } from './alarm-store.js';
import { raiseAlarm, activateAlarm } from './alarm-machine.js';
import { NodeStatus } from '../domain/types.js';
import type { AlarmRule, Alarm } from '../domain/types.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NOW_MS  = 1_000_000_000_000;
const NOW_ISO = new Date(NOW_MS).toISOString();

const WARN_RULE: AlarmRule = {
  id:              'rule_tank_warn',
  componentId:     'cmp_tank',
  triggerStatus:   [NodeStatus.Risk],
  debounceSeconds: 30,
  severity:        'warning',
  message:         'Tank temp low',
};

const CRIT_RULE: AlarmRule = {
  id:              'rule_tank_crit',
  componentId:     'cmp_tank',
  triggerStatus:   [NodeStatus.Fault],
  debounceSeconds: 0,
  severity:        'critical',
  message:         'Tank temp critical',
};

const PUMP_RULE: AlarmRule = {
  id:              'rule_pump_warn',
  componentId:     'cmp_pump',
  triggerStatus:   [NodeStatus.Fault],
  debounceSeconds: 0,
  severity:        'warning',
  message:         'Pump fault',
};

// ---------------------------------------------------------------------------
// evaluateAlarms — pure function tests
// ---------------------------------------------------------------------------

describe('evaluateAlarms', () => {
  it('raises a new pending alarm when condition is first met', () => {
    const result = evaluateAlarms('cmp_tank', NodeStatus.Risk, NOW_MS, [WARN_RULE], []);
    expect(result).toHaveLength(1);
    expect(result[0]!.state).toBe('pending');
    expect(result[0]!.ruleId).toBe(WARN_RULE.id);
    expect(result[0]!.componentId).toBe('cmp_tank');
  });

  it('keeps alarm pending when debounce has not elapsed', () => {
    const alarm = raiseAlarm(WARN_RULE, NOW_ISO);
    // debounceSeconds = 30; advance only 10 s
    const result = evaluateAlarms('cmp_tank', NodeStatus.Risk, NOW_MS + 10_000, [WARN_RULE], [alarm]);
    expect(result).toHaveLength(1);
    expect(result[0]!.state).toBe('pending');
    expect(result[0]!.id).toBe(alarm.id);
  });

  it('activates alarm once debounce has elapsed', () => {
    const alarm = raiseAlarm(WARN_RULE, NOW_ISO);
    // debounceSeconds = 30; advance exactly 30 s
    const result = evaluateAlarms('cmp_tank', NodeStatus.Risk, NOW_MS + 30_000, [WARN_RULE], [alarm]);
    expect(result).toHaveLength(1);
    expect(result[0]!.state).toBe('active');
    expect(result[0]!.id).toBe(alarm.id);
  });

  it('raises immediately when debounceSeconds is 0', () => {
    const alarm = raiseAlarm(CRIT_RULE, NOW_ISO);
    const result = evaluateAlarms('cmp_tank', NodeStatus.Fault, NOW_MS, [CRIT_RULE], [alarm]);
    expect(result[0]!.state).toBe('active');
  });

  it('preserves an active alarm while condition remains bad', () => {
    const alarm = activateAlarm(raiseAlarm(WARN_RULE, NOW_ISO), NOW_ISO);
    const result = evaluateAlarms('cmp_tank', NodeStatus.Risk, NOW_MS + 60_000, [WARN_RULE], [alarm]);
    expect(result).toHaveLength(1);
    expect(result[0]!.state).toBe('active');
    expect(result[0]!.id).toBe(alarm.id);
  });

  it('dismisses a pending alarm when condition clears before debounce', () => {
    const alarm = raiseAlarm(WARN_RULE, NOW_ISO);
    const result = evaluateAlarms('cmp_tank', NodeStatus.Ok, NOW_MS + 10_000, [WARN_RULE], [alarm]);
    expect(result).toHaveLength(1);
    expect(result[0]!.state).toBe('dismissed');
    expect(result[0]!.clearedAt).toBeDefined();
  });

  it('clears an active alarm when condition recovers', () => {
    const alarm = activateAlarm(raiseAlarm(WARN_RULE, NOW_ISO), NOW_ISO);
    const result = evaluateAlarms('cmp_tank', NodeStatus.Ok, NOW_MS + 60_000, [WARN_RULE], [alarm]);
    expect(result).toHaveLength(1);
    expect(result[0]!.state).toBe('cleared');
    expect(result[0]!.clearedAt).toBeDefined();
  });

  it('preserves cleared/dismissed alarms for terminal rules', () => {
    const dismissed = { ...raiseAlarm(WARN_RULE, NOW_ISO), state: 'dismissed' as const, clearedAt: NOW_ISO };
    const result = evaluateAlarms('cmp_tank', NodeStatus.Ok, NOW_MS + 60_000, [WARN_RULE], [dismissed]);
    expect(result[0]!.state).toBe('dismissed');
  });

  it('isolates alarms by componentId — rules for other components are ignored', () => {
    // PUMP_RULE targets cmp_pump; evaluating for cmp_tank must not produce it
    const result = evaluateAlarms('cmp_tank', NodeStatus.Fault, NOW_MS, [PUMP_RULE], []);
    expect(result).toHaveLength(0);
  });

  it('handles multiple rules independently', () => {
    const result = evaluateAlarms(
      'cmp_tank', NodeStatus.Risk, NOW_MS,
      [WARN_RULE, CRIT_RULE],
      [],
    );
    // WARN_RULE triggers on Risk; CRIT_RULE triggers on Fault — only WARN raised
    expect(result).toHaveLength(1);
    expect(result[0]!.ruleId).toBe(WARN_RULE.id);
  });

  it('does not mutate the input existingAlarms array', () => {
    const alarm    = raiseAlarm(WARN_RULE, NOW_ISO);
    const input    = [alarm];
    const snapshot = [...input];
    evaluateAlarms('cmp_tank', NodeStatus.Risk, NOW_MS + 30_000, [WARN_RULE], input);
    expect(input).toEqual(snapshot);
  });

  it('does not mutate the input rules array', () => {
    const rules    = [WARN_RULE];
    const snapshot = [...rules];
    evaluateAlarms('cmp_tank', NodeStatus.Risk, NOW_MS, rules, []);
    expect(rules).toEqual(snapshot);
  });

  it('returned alarms are frozen objects', () => {
    const result = evaluateAlarms('cmp_tank', NodeStatus.Risk, NOW_MS, [WARN_RULE], []);
    expect(() => {
      (result[0] as unknown as Record<string, unknown>)['state'] = 'active';
    }).toThrow();
  });
});

// ---------------------------------------------------------------------------
// applyAlarmEvaluation — store write path
// ---------------------------------------------------------------------------

describe('applyAlarmEvaluation', () => {
  it('raises a new alarm into AlarmStore when condition is first met', () => {
    const store = createInMemoryAlarmStore();
    store.setAlarmRule(WARN_RULE);

    applyAlarmEvaluation('cmp_tank', NodeStatus.Risk, NOW_MS, store);

    const alarms = store.getAlarmsForComponent('cmp_tank');
    expect(alarms).toHaveLength(1);
    expect(alarms[0]!.state).toBe('pending');
  });

  it('activates a pending alarm in AlarmStore after debounce elapses', () => {
    const store = createInMemoryAlarmStore();
    store.setAlarmRule(WARN_RULE);

    // First call: raise
    applyAlarmEvaluation('cmp_tank', NodeStatus.Risk, NOW_MS, store);
    expect(store.getAlarmsForComponent('cmp_tank')[0]!.state).toBe('pending');

    // Second call after 30 s: activate
    applyAlarmEvaluation('cmp_tank', NodeStatus.Risk, NOW_MS + 30_000, store);
    expect(store.getAlarmsForComponent('cmp_tank')[0]!.state).toBe('active');
  });

  it('clears an active alarm in AlarmStore when condition recovers', () => {
    const store = createInMemoryAlarmStore();
    store.setAlarmRule(WARN_RULE);

    applyAlarmEvaluation('cmp_tank', NodeStatus.Risk, NOW_MS, store);
    applyAlarmEvaluation('cmp_tank', NodeStatus.Risk, NOW_MS + 30_000, store);
    expect(store.getAlarmsForComponent('cmp_tank')[0]!.state).toBe('active');

    applyAlarmEvaluation('cmp_tank', NodeStatus.Ok, NOW_MS + 60_000, store);
    expect(store.getAlarmsForComponent('cmp_tank')[0]!.state).toBe('cleared');
  });

  it('writes only to AlarmStore — does not affect other components', () => {
    const store = createInMemoryAlarmStore();
    store.setAlarmRule(WARN_RULE);   // targets cmp_tank
    store.setAlarmRule(PUMP_RULE);   // targets cmp_pump

    applyAlarmEvaluation('cmp_tank', NodeStatus.Risk, NOW_MS, store);

    expect(store.getAlarmsForComponent('cmp_tank')).toHaveLength(1);
    expect(store.getAlarmsForComponent('cmp_pump')).toHaveLength(0);
  });

  it('is idempotent when condition is stable — repeated calls do not multiply alarms', () => {
    const store = createInMemoryAlarmStore();
    store.setAlarmRule(CRIT_RULE);   // debounce = 0

    applyAlarmEvaluation('cmp_tank', NodeStatus.Fault, NOW_MS, store);
    applyAlarmEvaluation('cmp_tank', NodeStatus.Fault, NOW_MS + 5_000, store);
    applyAlarmEvaluation('cmp_tank', NodeStatus.Fault, NOW_MS + 10_000, store);

    // Same alarm id upserted each time — still exactly one alarm
    expect(store.getAlarmsForComponent('cmp_tank')).toHaveLength(1);
    expect(store.getAlarmsForComponent('cmp_tank')[0]!.state).toBe('active');
  });
});
