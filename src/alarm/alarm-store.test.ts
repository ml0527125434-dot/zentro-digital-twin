import { describe, it, expect } from 'vitest';
import { createInMemoryAlarmStore, getAlarmsWithSeverity } from './alarm-store.js';
import { raiseAlarm, activateAlarm } from './alarm-machine.js';
import type { AlarmRule } from '../domain/types.js';
import { NodeStatus } from '../domain/types.js';

const RULE: AlarmRule = {
  id:              'rule_temp_low',
  componentId:     'cmp_tank',
  triggerStatus:   [NodeStatus.Risk],
  debounceSeconds: 30,
  severity:        'warning',
  message:         'Tank temperature below threshold',
};

const CRITICAL_RULE: AlarmRule = {
  id:              'rule_temp_critical',
  componentId:     'cmp_tank',
  triggerStatus:   [NodeStatus.Fault],
  debounceSeconds: 0,
  severity:        'critical',
  message:         'Tank temperature critical',
};

describe('createInMemoryAlarmStore', () => {
  it('getAlarmsForComponent returns empty array when no alarms exist', () => {
    const store = createInMemoryAlarmStore();
    expect(store.getAlarmsForComponent('cmp_tank')).toHaveLength(0);
  });

  it('setAlarm stores and getAlarmsForComponent retrieves by componentId', () => {
    const store = createInMemoryAlarmStore();
    const alarm = raiseAlarm(RULE, new Date().toISOString());
    store.setAlarm(alarm);
    expect(store.getAlarmsForComponent('cmp_tank')).toHaveLength(1);
    expect(store.getAlarmsForComponent('cmp_tank')[0]!.id).toBe(alarm.id);
  });

  it('setAlarm upserts — same id overwrites', () => {
    const store   = createInMemoryAlarmStore();
    const pending = raiseAlarm(RULE, new Date().toISOString());
    const active  = activateAlarm(pending, new Date().toISOString());
    store.setAlarm(pending);
    store.setAlarm(active);
    const alarms = store.getAlarmsForComponent('cmp_tank');
    expect(alarms).toHaveLength(1);
    expect(alarms[0]!.state).toBe('active');
  });

  it('getAlarmsForComponent does not return alarms for other components', () => {
    const store = createInMemoryAlarmStore();
    const other: AlarmRule = { ...RULE, id: 'rule_pump', componentId: 'cmp_pump' };
    store.setAlarm(raiseAlarm(other, new Date().toISOString()));
    expect(store.getAlarmsForComponent('cmp_tank')).toHaveLength(0);
  });

  it('setAlarmRule stores a rule retrievable by getAlarmRule', () => {
    const store = createInMemoryAlarmStore();
    store.setAlarmRule(RULE);
    expect(store.getAlarmRule(RULE.id)).toEqual(RULE);
  });

  it('getAlarmRule returns undefined for unknown ruleId', () => {
    const store = createInMemoryAlarmStore();
    expect(store.getAlarmRule('no_such_rule')).toBeUndefined();
  });
});

describe('getAlarmsWithSeverity', () => {
  it('returns empty array when no alarms exist', () => {
    const store = createInMemoryAlarmStore();
    expect(getAlarmsWithSeverity(store, 'cmp_tank')).toHaveLength(0);
  });

  it('merges alarm with rule severity', () => {
    const store = createInMemoryAlarmStore();
    store.setAlarmRule(RULE);
    const alarm = raiseAlarm(RULE, new Date().toISOString());
    store.setAlarm(alarm);

    const result = getAlarmsWithSeverity(store, 'cmp_tank');
    expect(result).toHaveLength(1);
    expect(result[0]!.severity).toBe('warning');
    expect(result[0]!.id).toBe(alarm.id);
  });

  it('excludes alarms whose rule is not found', () => {
    const store = createInMemoryAlarmStore();
    // alarm exists but rule was never registered
    const alarm = raiseAlarm(RULE, new Date().toISOString());
    store.setAlarm(alarm);

    const result = getAlarmsWithSeverity(store, 'cmp_tank');
    expect(result).toHaveLength(0);
  });

  it('returns correct severity for critical rule', () => {
    const store = createInMemoryAlarmStore();
    store.setAlarmRule(CRITICAL_RULE);
    const alarm = raiseAlarm(CRITICAL_RULE, new Date().toISOString());
    store.setAlarm(alarm);

    const result = getAlarmsWithSeverity(store, 'cmp_tank');
    expect(result[0]!.severity).toBe('critical');
  });

  it('multiple alarms with different severities all returned', () => {
    const store = createInMemoryAlarmStore();
    store.setAlarmRule(RULE);
    store.setAlarmRule(CRITICAL_RULE);
    store.setAlarm(raiseAlarm(RULE, new Date().toISOString()));
    store.setAlarm(raiseAlarm(CRITICAL_RULE, new Date().toISOString()));

    const result = getAlarmsWithSeverity(store, 'cmp_tank');
    expect(result).toHaveLength(2);
    expect(result.map(a => a.severity).sort()).toEqual(['critical', 'warning']);
  });
});
