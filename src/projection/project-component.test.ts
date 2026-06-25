import { describe, it, expect, beforeEach } from 'vitest';
import { projectComponent } from './project-component.js';
import { createInMemoryLiveStore } from '../telemetry/live-store.js';
import {
  CommandState, HealthState, NodeStatus, SensorState, ValueProvenance,
} from '../domain/types.js';
import type { Component, LiveSample, OperationalProfile } from '../domain/types.js';
import type { ComponentDefinition } from '../lib/component-registry.js';
import type { AlarmWithSeverity } from './health-derivation.js';

const NOW_MS = 1_000_000_000_000;

function isoAt(ageSeconds: number): string {
  return new Date(NOW_MS - ageSeconds * 1000).toISOString();
}

function liveSample(bindingId: string, value: number, ageSeconds = 0): LiveSample {
  return {
    bindingId,
    value,
    ts:         isoAt(ageSeconds),
    state:      SensorState.Live,
    provenance: ValueProvenance.Measured,
  };
}

// Minimal ComponentDefinition (tank-like)
const TANK_DEF: ComponentDefinition = {
  typeId:   'storage_tank',
  label:    'Storage Tank',
  category: 'storage',
  ports: [
    { id: 'hot_out', label: 'Hot Out', medium: 'hot_water', role: 'outlet', anchor: 'top' },
    { id: 'heat_in_1', label: 'Heat In', medium: 'hot_water', role: 'inlet', anchor: 'left' },
  ],
  sensorSlots: [
    { id: 'temp', label: 'Temp', metric: 'temperature', required: true, defaultTtlSeconds: 120 },
  ],
  commands:   [],
  properties: [],
  visual: {
    shape:               'tank',
    primaryStatusMetric: 'temperature',
    portAnchors:         { hot_out: 'top', heat_in_1: 'left' },
    dashboardCard:       { fields: ['temp'] },
    propertyPanel:       { sections: ['live'] },
  },
};

// Component instance
const TANK: Component = {
  id:        'cmp_tank',
  type:      'storage_tank',
  name:      'Main Tank',
  projectId: 'proj_1',
  bindings: [
    { id: 'b_temp', source: 'mqtt', address: 'site/hw/tank/temp', metric: 'temperature', unit: '°C', ttlSeconds: 120 },
  ],
};

const TEMP_PROFILE: OperationalProfile = {
  id:            'op_tank',
  appliesToType: 'storage_tank',
  scope:         'type_default',
  metrics: [
    {
      metric: 'temperature',
      unit:   '°C',
      bands: [
        { status: NodeStatus.Risk, max: 50 },
        { status: NodeStatus.Warn, min: 50, max: 55 },
        { status: NodeStatus.Ok,   min: 55 },
      ],
    },
  ],
};

describe('projectComponent — shape', () => {
  it('returns a ComponentViewModel with matching componentId', () => {
    const store = createInMemoryLiveStore();
    const vm = projectComponent(TANK, TANK_DEF, store, [], [], undefined, NOW_MS);
    expect(vm.componentId).toBe('cmp_tank');
  });

  it('activeCommands passes through unchanged', () => {
    const store = createInMemoryLiveStore();
    const cmds = [{ actionId: 'enable', state: CommandState.Executing, requestId: 'req_1' }];
    const vm = projectComponent(TANK, TANK_DEF, store, [], cmds, undefined, NOW_MS);
    expect(vm.activeCommands).toBe(cmds);
  });

  it('activeAlarms contains ids of passed-in alarms', () => {
    const store = createInMemoryLiveStore();
    const alarm: AlarmWithSeverity = {
      id: 'alarm_1', ruleId: 'r1', componentId: 'cmp_tank',
      raisedAt: new Date().toISOString(), state: 'active', severity: 'warning',
    };
    const vm = projectComponent(TANK, TANK_DEF, store, [alarm], [], undefined, NOW_MS);
    expect(vm.activeAlarms).toContain('alarm_1');
  });
});

describe('projectComponent — SensorState', () => {
  it('Unknown when no bindings in store', () => {
    const store = createInMemoryLiveStore();
    const vm = projectComponent(TANK, TANK_DEF, store, [], [], undefined, NOW_MS);
    expect(vm.sensorState).toBe(SensorState.Unknown);
  });

  it('Live when binding is fresh', () => {
    const store = createInMemoryLiveStore();
    store.set('b_temp', liveSample('b_temp', 62, 0));
    const vm = projectComponent(TANK, TANK_DEF, store, [], [], undefined, NOW_MS);
    expect(vm.sensorState).toBe(SensorState.Live);
  });

  it('Stale when binding is stale', () => {
    const store = createInMemoryLiveStore();
    store.set('b_temp', liveSample('b_temp', 62, 121)); // age > ttl
    const vm = projectComponent(TANK, TANK_DEF, store, [], [], undefined, NOW_MS);
    expect(vm.sensorState).toBe(SensorState.Stale);
  });

  it('Lost when binding is very old', () => {
    const store = createInMemoryLiveStore();
    store.set('b_temp', liveSample('b_temp', 62, 241)); // age > 2*ttl
    const vm = projectComponent(TANK, TANK_DEF, store, [], [], undefined, NOW_MS);
    expect(vm.sensorState).toBe(SensorState.Lost);
  });
});

describe('projectComponent — HealthState', () => {
  it('Offline when all governing sensors are Lost', () => {
    const store = createInMemoryLiveStore();
    store.set('b_temp', liveSample('b_temp', 62, 241));
    const vm = projectComponent(TANK, TANK_DEF, store, [], [], undefined, NOW_MS);
    expect(vm.health).toBe(HealthState.Offline);
  });

  it('Healthy with live sensor and no alarms', () => {
    const store = createInMemoryLiveStore();
    store.set('b_temp', liveSample('b_temp', 62, 0));
    const vm = projectComponent(TANK, TANK_DEF, store, [], [], undefined, NOW_MS);
    expect(vm.health).toBe(HealthState.Healthy);
  });

  it('Critical with active critical alarm', () => {
    const store = createInMemoryLiveStore();
    store.set('b_temp', liveSample('b_temp', 62, 0));
    const alarm: AlarmWithSeverity = {
      id: 'a1', ruleId: 'r1', componentId: 'cmp_tank',
      raisedAt: new Date().toISOString(), state: 'active', severity: 'critical',
    };
    const vm = projectComponent(TANK, TANK_DEF, store, [alarm], [], undefined, NOW_MS);
    expect(vm.health).toBe(HealthState.Critical);
  });

  it('Commissioning when mode === commissioning', () => {
    const store = createInMemoryLiveStore();
    const comp = { ...TANK, mode: 'commissioning' as const };
    const vm = projectComponent(comp, TANK_DEF, store, [], [], undefined, NOW_MS);
    expect(vm.health).toBe(HealthState.Commissioning);
  });
});

describe('projectComponent — OperationalStatus', () => {
  it('Unknown when no profile provided', () => {
    const store = createInMemoryLiveStore();
    store.set('b_temp', liveSample('b_temp', 62, 0));
    const vm = projectComponent(TANK, TANK_DEF, store, [], [], undefined, NOW_MS);
    expect(vm.operationalStatus).toBe(NodeStatus.Unknown);
  });

  it('evaluates Ok band when temp >= 55', () => {
    const store = createInMemoryLiveStore();
    store.set('b_temp', liveSample('b_temp', 60, 0));
    const vm = projectComponent(TANK, TANK_DEF, store, [], [], TEMP_PROFILE, NOW_MS);
    expect(vm.operationalStatus).toBe(NodeStatus.Ok);
  });

  it('evaluates Risk band when temp < 50', () => {
    const store = createInMemoryLiveStore();
    store.set('b_temp', liveSample('b_temp', 45, 0));
    const vm = projectComponent(TANK, TANK_DEF, store, [], [], TEMP_PROFILE, NOW_MS);
    expect(vm.operationalStatus).toBe(NodeStatus.Risk);
  });

  it('Unknown operationalStatus when sensor is Stale', () => {
    const store = createInMemoryLiveStore();
    store.set('b_temp', liveSample('b_temp', 60, 121)); // Stale
    const vm = projectComponent(TANK, TANK_DEF, store, [], [], TEMP_PROFILE, NOW_MS);
    expect(vm.operationalStatus).toBe(NodeStatus.Unknown);
  });
});

describe('projectComponent — liveValues', () => {
  it('liveValues[temp] is populated when sensor is Live', () => {
    const store = createInMemoryLiveStore();
    store.set('b_temp', liveSample('b_temp', 63, 0));
    const vm = projectComponent(TANK, TANK_DEF, store, [], [], undefined, NOW_MS);
    expect(vm.liveValues['temp']).toBe(63);
  });

  it('liveValues[temp] is null when sensor is Stale', () => {
    const store = createInMemoryLiveStore();
    store.set('b_temp', liveSample('b_temp', 63, 121));
    const vm = projectComponent(TANK, TANK_DEF, store, [], [], undefined, NOW_MS);
    expect(vm.liveValues['temp']).toBeNull();
  });

  it('liveValues[temp] is null when no binding sample', () => {
    const store = createInMemoryLiveStore();
    const vm = projectComponent(TANK, TANK_DEF, store, [], [], undefined, NOW_MS);
    expect(vm.liveValues['temp']).toBeNull();
  });

  it('liveValues has an entry for each SensorSlot', () => {
    const store = createInMemoryLiveStore();
    const vm = projectComponent(TANK, TANK_DEF, store, [], [], undefined, NOW_MS);
    expect('temp' in vm.liveValues).toBe(true);
  });
});

describe('projectComponent — provenance', () => {
  it('provenance is Measured when sample is Live and Measured', () => {
    const store = createInMemoryLiveStore();
    store.set('b_temp', liveSample('b_temp', 62, 0));
    const vm = projectComponent(TANK, TANK_DEF, store, [], [], TEMP_PROFILE, NOW_MS);
    expect(vm.provenance).toBe(ValueProvenance.Measured);
  });

  it('provenance is Unknown when no sample', () => {
    const store = createInMemoryLiveStore();
    const vm = projectComponent(TANK, TANK_DEF, store, [], [], undefined, NOW_MS);
    expect(vm.provenance).toBe(ValueProvenance.Unknown);
  });
});
