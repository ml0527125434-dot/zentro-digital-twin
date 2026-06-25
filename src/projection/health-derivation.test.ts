import { describe, it, expect } from 'vitest';
import { deriveHealthState } from './health-derivation.js';
import type { AlarmWithSeverity } from './health-derivation.js';
import { HealthState, SensorState } from '../domain/types.js';
import type { Alarm } from '../domain/types.js';

function alarm(severity: 'info' | 'warning' | 'critical', state: Alarm['state'] = 'active'): AlarmWithSeverity {
  return {
    id:          'alarm_1',
    ruleId:      'rule_1',
    componentId: 'cmp_1',
    raisedAt:    new Date().toISOString(),
    state,
    severity,
  };
}

const LIVE    = SensorState.Live;
const STALE   = SensorState.Stale;
const LOST    = SensorState.Lost;
const UNKNOWN = SensorState.Unknown;

describe('deriveHealthState — mode priority', () => {
  it('commissioning → Commissioning regardless of alarms', () => {
    expect(deriveHealthState('commissioning', [LOST], [alarm('critical')])).toBe(HealthState.Commissioning);
  });

  it('maintenance → Maintenance regardless of alarms', () => {
    expect(deriveHealthState('maintenance', [LOST], [alarm('critical')])).toBe(HealthState.Maintenance);
  });

  it('commissioning takes priority over maintenance (not a real scenario but tests ordering)', () => {
    expect(deriveHealthState('commissioning', [], [])).toBe(HealthState.Commissioning);
  });
});

describe('deriveHealthState — Offline rule', () => {
  it('all Lost + no mode → Offline', () => {
    expect(deriveHealthState(undefined, [LOST], [])).toBe(HealthState.Offline);
  });

  it('all Lost (multiple) → Offline', () => {
    expect(deriveHealthState(undefined, [LOST, LOST], [])).toBe(HealthState.Offline);
  });

  it('mixed states (not all Lost) → NOT Offline', () => {
    expect(deriveHealthState(undefined, [LOST, LIVE], [])).not.toBe(HealthState.Offline);
  });

  it('empty governing states → NOT Offline', () => {
    expect(deriveHealthState(undefined, [], [])).toBe(HealthState.Healthy);
  });

  it('Unknown state alone → NOT Offline', () => {
    expect(deriveHealthState(undefined, [UNKNOWN], [])).not.toBe(HealthState.Offline);
  });

  it('Stale state alone → NOT Offline', () => {
    expect(deriveHealthState(undefined, [STALE], [])).not.toBe(HealthState.Offline);
  });
});

describe('deriveHealthState — alarm priority', () => {
  it('active critical alarm → Critical', () => {
    expect(deriveHealthState(undefined, [LIVE], [alarm('critical', 'active')])).toBe(HealthState.Critical);
  });

  it('acknowledged critical alarm → Critical (still non-terminal)', () => {
    expect(deriveHealthState(undefined, [LIVE], [alarm('critical', 'acknowledged')])).toBe(HealthState.Critical);
  });

  it('cleared critical alarm → NOT Critical (terminal state)', () => {
    expect(deriveHealthState(undefined, [LIVE], [alarm('critical', 'cleared')])).toBe(HealthState.Healthy);
  });

  it('active warning alarm → Warning', () => {
    expect(deriveHealthState(undefined, [LIVE], [alarm('warning', 'active')])).toBe(HealthState.Warning);
  });

  it('info alarm → Healthy (info does not affect HealthState)', () => {
    expect(deriveHealthState(undefined, [LIVE], [alarm('info', 'active')])).toBe(HealthState.Healthy);
  });

  it('critical takes priority over warning', () => {
    const alarms = [alarm('warning', 'active'), alarm('critical', 'active')];
    expect(deriveHealthState(undefined, [LIVE], alarms)).toBe(HealthState.Critical);
  });

  it('Offline takes priority over Critical', () => {
    expect(deriveHealthState(undefined, [LOST], [alarm('critical', 'active')])).toBe(HealthState.Offline);
  });
});

describe('deriveHealthState — Healthy baseline', () => {
  it('normal mode, live sensors, no alarms → Healthy', () => {
    expect(deriveHealthState('normal', [LIVE], [])).toBe(HealthState.Healthy);
  });

  it('undefined mode, live sensors, no alarms → Healthy', () => {
    expect(deriveHealthState(undefined, [LIVE], [])).toBe(HealthState.Healthy);
  });

  it('no sensors, no alarms, no mode → Healthy', () => {
    expect(deriveHealthState(undefined, [], [])).toBe(HealthState.Healthy);
  });
});
