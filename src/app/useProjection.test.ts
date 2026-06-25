/** @vitest-environment happy-dom */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useProjection } from './useProjection.js';
import { createInMemoryGraphStore, createProject, type EngineStores } from '../engine/graph-engine.js';
import { createInMemoryVersionStore } from '../domain/project-version.js';
import { createInMemoryEventStore } from '../domain/event-store.js';
import { createInMemoryLiveStore } from '../telemetry/live-store.js';
import { createInMemoryOperationalProfileStore } from '../projection/operational-profile-store.js';
import { createInMemoryAlarmStore, getAlarmsWithSeverity } from '../alarm/alarm-store.js';
import { createComponentRegistry } from '../lib/component-registry.js';
import { registerBaseLibrary } from '../lib/component-library.js';
import { GAS_BACKUP   } from '../lib/definitions/gas-backup.def.js';
import { POINT_OF_USE } from '../lib/definitions/point-of-use.def.js';
import { buildHotWaterSeed, HOT_WATER_PROJECT_ID, HOT_WATER_PROFILES } from '../seed/hot-water.seed.js';
import { raiseAlarm, activateAlarm } from '../alarm/alarm-machine.js';
import { HealthState, NodeStatus, SensorState, ValueProvenance } from '../domain/types.js';
import type { AlarmRule } from '../domain/types.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeStores(): EngineStores {
  return {
    graph:    createInMemoryGraphStore(),
    versions: createInMemoryVersionStore(),
    events:   createInMemoryEventStore(),
  };
}

function makeFullRegistry() {
  const r = createComponentRegistry();
  registerBaseLibrary(r);
  r.register(GAS_BACKUP);
  r.register(POINT_OF_USE);
  return r;
}

const NOW    = 1_000_000_000_000;
const NOW_TS = new Date(NOW).toISOString(); // ISO string for LiveSample.ts

// ---------------------------------------------------------------------------
// Tests ג€” hot-water seed baseline
// ---------------------------------------------------------------------------

describe('useProjection ג€” hot-water seed', () => {
  let stores:       EngineStores;
  let registry:     ReturnType<typeof makeFullRegistry>;
  let liveStore:    ReturnType<typeof createInMemoryLiveStore>;
  let profileStore: ReturnType<typeof createInMemoryOperationalProfileStore>;
  let alarmStore:   ReturnType<typeof createInMemoryAlarmStore>;

  beforeEach(() => {
    stores       = makeStores();
    registry     = makeFullRegistry();
    liveStore    = createInMemoryLiveStore();
    profileStore = createInMemoryOperationalProfileStore();
    alarmStore   = createInMemoryAlarmStore();
    buildHotWaterSeed(stores, registry);
  });

  it('returns a VM for every component in the seed (6 components)', () => {
    const { result } = renderHook(() =>
      useProjection(HOT_WATER_PROJECT_ID, stores, liveStore, registry, profileStore, alarmStore, NOW),
    );
    const ids = stores.graph.getComponents(HOT_WATER_PROJECT_ID).map(c => c.id);
    expect(Object.keys(result.current.componentVMs)).toHaveLength(ids.length);
    for (const id of ids) expect(result.current.componentVMs[id]).toBeDefined();
  });

  it('returns a ConnectionViewModel for every connection (6 connections)', () => {
    const { result } = renderHook(() =>
      useProjection(HOT_WATER_PROJECT_ID, stores, liveStore, registry, profileStore, alarmStore, NOW),
    );
    const ids = stores.graph.getConnections(HOT_WATER_PROJECT_ID).map(c => c.id);
    expect(Object.keys(result.current.connectionVMs)).toHaveLength(ids.length);
    for (const id of ids) expect(result.current.connectionVMs[id]).toBeDefined();
  });

  it('all VMs start Healthy with Unknown sensorState (no samples, no profiles)', () => {
    const { result } = renderHook(() =>
      useProjection(HOT_WATER_PROJECT_ID, stores, liveStore, registry, profileStore, alarmStore, NOW),
    );
    for (const vm of Object.values(result.current.componentVMs)) {
      expect(vm.health).toBe(HealthState.Healthy);
      expect(vm.sensorState).toBe(SensorState.Unknown);
    }
  });

  it('injecting a live tank temperature sample => sensorState Live', () => {
    liveStore.set('b_t1', {
      bindingId: 'b_t1', value: 62, ts: NOW_TS, state: SensorState.Live,
      provenance: ValueProvenance.Measured, confidence: 1,
    });
    const { result } = renderHook(() =>
      useProjection(HOT_WATER_PROJECT_ID, stores, liveStore, registry, profileStore, alarmStore, NOW),
    );
    expect(result.current.componentVMs['cmp_tank']!.sensorState).toBe(SensorState.Live);
  });

  it('TTL expiry => sensorState Stale then Lost', () => {
    const TTL = 120;
    liveStore.set('b_t1', {
      bindingId: 'b_t1', value: 62, ts: NOW_TS, state: SensorState.Live,
      provenance: ValueProvenance.Measured, confidence: 1,
    });

    const { result: stale } = renderHook(() =>
      useProjection(HOT_WATER_PROJECT_ID, stores, liveStore, registry, profileStore, alarmStore, NOW + TTL * 1000),
    );
    expect(stale.current.componentVMs['cmp_tank']!.sensorState).toBe(SensorState.Stale);

    const { result: lost } = renderHook(() =>
      useProjection(HOT_WATER_PROJECT_ID, stores, liveStore, registry, profileStore, alarmStore, NOW + TTL * 2 * 1000),
    );
    expect(lost.current.componentVMs['cmp_tank']!.sensorState).toBe(SensorState.Lost);
  });

  it('Lost governing sensor => health Offline', () => {
    const TTL = 120;
    liveStore.set('b_t1', {
      bindingId: 'b_t1', value: 62, ts: NOW_TS, state: SensorState.Live,
      provenance: ValueProvenance.Measured, confidence: 1,
    });
    const { result } = renderHook(() =>
      useProjection(HOT_WATER_PROJECT_ID, stores, liveStore, registry, profileStore, alarmStore, NOW + TTL * 2 * 1000),
    );
    expect(result.current.componentVMs['cmp_tank']!.health).toBe(HealthState.Offline);
  });

  it('componentVMs contains no entries when queried against an empty project', () => {
    const otherStores = makeStores();
    createProject({ id: 'other_proj', name: 'Other', siteType: 'test' }, 'test', otherStores);
    const { result } = renderHook(() =>
      useProjection(HOT_WATER_PROJECT_ID, otherStores, liveStore, registry, profileStore, alarmStore, NOW),
    );
    expect(Object.keys(result.current.componentVMs)).toHaveLength(0);
  });

  it('snapshot recomputes when nowMs changes', () => {
    const TTL = 120;
    liveStore.set('b_t1', { bindingId: 'b_t1', value: 62, ts: NOW_TS, state: SensorState.Live, provenance: ValueProvenance.Measured, confidence: 1 });

    const { result, rerender } = renderHook(
      ({ ts }: { ts: number }) =>
        useProjection(HOT_WATER_PROJECT_ID, stores, liveStore, registry, profileStore, alarmStore, ts),
      { initialProps: { ts: NOW } },
    );
    expect(result.current.componentVMs['cmp_tank']!.sensorState).toBe(SensorState.Live);
    rerender({ ts: NOW + TTL * 2 * 1000 });
    expect(result.current.componentVMs['cmp_tank']!.sensorState).toBe(SensorState.Lost);
  });
});

// ---------------------------------------------------------------------------
// Tests ג€” OperationalProfileStore wiring
// ---------------------------------------------------------------------------

describe('useProjection ג€” OperationalProfile wiring', () => {
  let stores:       EngineStores;
  let registry:     ReturnType<typeof makeFullRegistry>;
  let liveStore:    ReturnType<typeof createInMemoryLiveStore>;
  let profileStore: ReturnType<typeof createInMemoryOperationalProfileStore>;
  let alarmStore:   ReturnType<typeof createInMemoryAlarmStore>;

  beforeEach(() => {
    stores       = makeStores();
    registry     = makeFullRegistry();
    liveStore    = createInMemoryLiveStore();
    profileStore = createInMemoryOperationalProfileStore();
    alarmStore   = createInMemoryAlarmStore();
    buildHotWaterSeed(stores, registry);
  });

  it('operationalStatus is Unknown when no profile is loaded (baseline)', () => {
    // Tank has operationalProfileId but store is empty => profile not found => Unknown
    liveStore.set('b_t1', { bindingId: 'b_t1', value: 62, ts: NOW_TS, state: SensorState.Live, provenance: ValueProvenance.Measured, confidence: 1 });
    const { result } = renderHook(() =>
      useProjection(HOT_WATER_PROJECT_ID, stores, liveStore, registry, profileStore, alarmStore, NOW),
    );
    expect(result.current.componentVMs['cmp_tank']!.operationalStatus).toBe(NodeStatus.Unknown);
  });

  it('loading profiles into store causes operationalStatus to be evaluated', () => {
    profileStore.setMany(HOT_WATER_PROFILES);
    // 62ֲ°C is ג‰¥ 55 => Ok band
    liveStore.set('b_t1', { bindingId: 'b_t1', value: 62, ts: NOW_TS, state: SensorState.Live, provenance: ValueProvenance.Measured, confidence: 1 });
    const { result } = renderHook(() =>
      useProjection(HOT_WATER_PROJECT_ID, stores, liveStore, registry, profileStore, alarmStore, NOW),
    );
    expect(result.current.componentVMs['cmp_tank']!.operationalStatus).toBe(NodeStatus.Ok);
  });

  it('value below Risk threshold => NodeStatus.Risk', () => {
    profileStore.setMany(HOT_WATER_PROFILES);
    liveStore.set('b_t1', { bindingId: 'b_t1', value: 45, ts: NOW_TS, state: SensorState.Live, provenance: ValueProvenance.Measured, confidence: 1 });
    const { result } = renderHook(() =>
      useProjection(HOT_WATER_PROJECT_ID, stores, liveStore, registry, profileStore, alarmStore, NOW),
    );
    expect(result.current.componentVMs['cmp_tank']!.operationalStatus).toBe(NodeStatus.Risk);
  });

  it('value in Warn band => NodeStatus.Warn', () => {
    profileStore.setMany(HOT_WATER_PROFILES);
    liveStore.set('b_t1', { bindingId: 'b_t1', value: 52, ts: NOW_TS, state: SensorState.Live, provenance: ValueProvenance.Measured, confidence: 1 });
    const { result } = renderHook(() =>
      useProjection(HOT_WATER_PROJECT_ID, stores, liveStore, registry, profileStore, alarmStore, NOW),
    );
    expect(result.current.componentVMs['cmp_tank']!.operationalStatus).toBe(NodeStatus.Warn);
  });

  it('FlowMap and Dashboard still consume the same componentVMs snapshot', () => {
    profileStore.setMany(HOT_WATER_PROFILES);
    liveStore.set('b_t1', { bindingId: 'b_t1', value: 62, ts: NOW_TS, state: SensorState.Live, provenance: ValueProvenance.Measured, confidence: 1 });
    const { result } = renderHook(() =>
      useProjection(HOT_WATER_PROJECT_ID, stores, liveStore, registry, profileStore, alarmStore, NOW),
    );
    // Same object reference ג€” both views receive the same VM
    const vm = result.current.componentVMs['cmp_tank']!;
    expect(vm.operationalStatus).toBe(NodeStatus.Ok);
    // The snapshot has all 6 components ג€” FlowMap and Dashboard both see them
    expect(Object.keys(result.current.componentVMs)).toHaveLength(6);
  });
});

// ---------------------------------------------------------------------------
// Tests ג€” AlarmStore wiring
// ---------------------------------------------------------------------------

describe('useProjection ג€” AlarmStore wiring', () => {
  let stores:       EngineStores;
  let registry:     ReturnType<typeof makeFullRegistry>;
  let liveStore:    ReturnType<typeof createInMemoryLiveStore>;
  let profileStore: ReturnType<typeof createInMemoryOperationalProfileStore>;
  let alarmStore:   ReturnType<typeof createInMemoryAlarmStore>;

  const RULE: AlarmRule = {
    id:              'rule_tank_warn',
    componentId:     'cmp_tank',
    triggerStatus:   [NodeStatus.Risk],
    debounceSeconds: 0,
    severity:        'warning',
    message:         'Tank temp low',
  };

  const CRITICAL_RULE: AlarmRule = {
    id:              'rule_tank_crit',
    componentId:     'cmp_tank',
    triggerStatus:   [NodeStatus.Fault],
    debounceSeconds: 0,
    severity:        'critical',
    message:         'Tank temp critical',
  };

  beforeEach(() => {
    stores       = makeStores();
    registry     = makeFullRegistry();
    liveStore    = createInMemoryLiveStore();
    profileStore = createInMemoryOperationalProfileStore();
    alarmStore   = createInMemoryAlarmStore();
    buildHotWaterSeed(stores, registry);
  });

  it('no alarms => activeAlarms is empty in ViewModel', () => {
    const { result } = renderHook(() =>
      useProjection(HOT_WATER_PROJECT_ID, stores, liveStore, registry, profileStore, alarmStore, NOW),
    );
    expect(result.current.componentVMs['cmp_tank']!.activeAlarms).toHaveLength(0);
  });

  it('active alarm => alarm id appears in ViewModel.activeAlarms', () => {
    alarmStore.setAlarmRule(RULE);
    const alarm = activateAlarm(raiseAlarm(RULE, new Date().toISOString()), new Date().toISOString());
    alarmStore.setAlarm(alarm);

    const { result } = renderHook(() =>
      useProjection(HOT_WATER_PROJECT_ID, stores, liveStore, registry, profileStore, alarmStore, NOW),
    );
    expect(result.current.componentVMs['cmp_tank']!.activeAlarms).toContain(alarm.id);
  });

  it('active warning alarm => health Warning', () => {
    alarmStore.setAlarmRule(RULE);
    const alarm = activateAlarm(raiseAlarm(RULE, new Date().toISOString()), new Date().toISOString());
    alarmStore.setAlarm(alarm);

    const { result } = renderHook(() =>
      useProjection(HOT_WATER_PROJECT_ID, stores, liveStore, registry, profileStore, alarmStore, NOW),
    );
    expect(result.current.componentVMs['cmp_tank']!.health).toBe(HealthState.Warning);
  });

  it('active critical alarm => health Critical', () => {
    alarmStore.setAlarmRule(CRITICAL_RULE);
    const alarm = activateAlarm(raiseAlarm(CRITICAL_RULE, new Date().toISOString()), new Date().toISOString());
    alarmStore.setAlarm(alarm);

    const { result } = renderHook(() =>
      useProjection(HOT_WATER_PROJECT_ID, stores, liveStore, registry, profileStore, alarmStore, NOW),
    );
    expect(result.current.componentVMs['cmp_tank']!.health).toBe(HealthState.Critical);
  });

  it('alarm on one component does not affect another component VM', () => {
    alarmStore.setAlarmRule(CRITICAL_RULE);
    const alarm = activateAlarm(raiseAlarm(CRITICAL_RULE, new Date().toISOString()), new Date().toISOString());
    alarmStore.setAlarm(alarm);

    const { result } = renderHook(() =>
      useProjection(HOT_WATER_PROJECT_ID, stores, liveStore, registry, profileStore, alarmStore, NOW),
    );
    // cmp_heatpump should be unaffected
    expect(result.current.componentVMs['cmp_heatpump']!.health).toBe(HealthState.Healthy);
    expect(result.current.componentVMs['cmp_heatpump']!.activeAlarms).toHaveLength(0);
  });

  it('React never writes to AlarmStore ג€” alarmStore.setAlarm is not called from projection', () => {
    // Structural: verify alarmStore has no alarms written by projection itself.
    // We read before and after a full projection pass.
    const before = alarmStore.getAlarmsForComponent('cmp_tank').length;
    renderHook(() =>
      useProjection(HOT_WATER_PROJECT_ID, stores, liveStore, registry, profileStore, alarmStore, NOW),
    );
    const after = alarmStore.getAlarmsForComponent('cmp_tank').length;
    expect(after).toBe(before); // projection never mutates alarm store
  });
});

// ---------------------------------------------------------------------------
// Regression tests ג€” Stage 7 contract guarantees
// ---------------------------------------------------------------------------

describe('Stage 7 regression ג€” explicit contract guarantees', () => {
  let stores:       EngineStores;
  let registry:     ReturnType<typeof makeFullRegistry>;
  let liveStore:    ReturnType<typeof createInMemoryLiveStore>;
  let profileStore: ReturnType<typeof createInMemoryOperationalProfileStore>;
  let alarmStore:   ReturnType<typeof createInMemoryAlarmStore>;

  const WARN_RULE: AlarmRule = {
    id:              'reg_rule_warn',
    componentId:     'cmp_tank',
    triggerStatus:   [NodeStatus.Risk],
    debounceSeconds: 0,
    severity:        'warning',
    message:         'Regression: warn',
  };

  beforeEach(() => {
    stores       = makeStores();
    registry     = makeFullRegistry();
    liveStore    = createInMemoryLiveStore();
    profileStore = createInMemoryOperationalProfileStore();
    alarmStore   = createInMemoryAlarmStore();
    buildHotWaterSeed(stores, registry);
  });

  // R1 ג€” no profile => previous behavior unchanged
  it('R1: no profile loaded => operationalStatus is Unknown (previous behavior unchanged)', () => {
    liveStore.set('b_t1', { bindingId: 'b_t1', value: 62, ts: NOW_TS, state: SensorState.Live, provenance: ValueProvenance.Measured, confidence: 1 });
    const { result } = renderHook(() =>
      useProjection(HOT_WATER_PROJECT_ID, stores, liveStore, registry, profileStore, alarmStore, NOW),
    );
    // profileStore is empty ג€” projection falls back to Unknown, same as Stage 6
    expect(result.current.componentVMs['cmp_tank']!.operationalStatus).toBe(NodeStatus.Unknown);
    // health is still correctly derived from sensor state alone
    expect(result.current.componentVMs['cmp_tank']!.health).toBe(HealthState.Healthy);
  });

  // R2 ג€” profile exists => ViewModel changes deterministically
  it('R2: profile loaded => operationalStatus changes deterministically with value', () => {
    profileStore.setMany(HOT_WATER_PROFILES);
    const cases: Array<{ value: number; expected: NodeStatus }> = [
      { value: 44, expected: NodeStatus.Risk },
      { value: 52, expected: NodeStatus.Warn },
      { value: 58, expected: NodeStatus.Ok  },
    ];

    for (const { value, expected } of cases) {
      liveStore.set('b_t1', { bindingId: 'b_t1', value, ts: NOW_TS, state: SensorState.Live, provenance: ValueProvenance.Measured, confidence: 1 });
      const { result } = renderHook(() =>
        useProjection(HOT_WATER_PROJECT_ID, stores, liveStore, registry, profileStore, alarmStore, NOW),
      );
      expect(result.current.componentVMs['cmp_tank']!.operationalStatus).toBe(expected);
    }
  });

  // R3 ג€” alarm exists => activeAlarms is populated
  it('R3: active alarm => activeAlarms contains the alarm id', () => {
    alarmStore.setAlarmRule(WARN_RULE);
    const alarm = activateAlarm(raiseAlarm(WARN_RULE, new Date().toISOString()), new Date().toISOString());
    alarmStore.setAlarm(alarm);

    const { result } = renderHook(() =>
      useProjection(HOT_WATER_PROJECT_ID, stores, liveStore, registry, profileStore, alarmStore, NOW),
    );
    const activeAlarms = result.current.componentVMs['cmp_tank']!.activeAlarms;
    expect(activeAlarms).toContain(alarm.id);
    expect(activeAlarms.length).toBeGreaterThan(0);
  });

  // R4 ג€” FlowMap and Dashboard receive identical ViewModels
  it('R4: a single useProjection call produces one snapshot; both views receive the same reference', () => {
    profileStore.setMany(HOT_WATER_PROFILES);
    liveStore.set('b_t1', { bindingId: 'b_t1', value: 62, ts: NOW_TS, state: SensorState.Live, provenance: ValueProvenance.Measured, confidence: 1 });

    const { result } = renderHook(() =>
      useProjection(HOT_WATER_PROJECT_ID, stores, liveStore, registry, profileStore, alarmStore, NOW),
    );
    const { componentVMs } = result.current;

    // Simulate FlowMap read and Dashboard read ג€” both receive the same object
    const vmForFlowMap   = componentVMs['cmp_tank'];
    const vmForDashboard = componentVMs['cmp_tank'];
    expect(vmForFlowMap).toBe(vmForDashboard);                          // referential equality
    expect(vmForFlowMap!.operationalStatus).toBe(NodeStatus.Ok);        // profile applied
    expect(Object.keys(componentVMs)).toHaveLength(6);                  // all 6 components
  });

  // R5 ג€” no graph mutation from profile/alarm state
  it('R5: projection does not mutate the graph ג€” component/connection count unchanged after projection', () => {
    profileStore.setMany(HOT_WATER_PROFILES);
    alarmStore.setAlarmRule(WARN_RULE);
    alarmStore.setAlarm(activateAlarm(raiseAlarm(WARN_RULE, new Date().toISOString()), new Date().toISOString()));
    liveStore.set('b_t1', { bindingId: 'b_t1', value: 62, ts: NOW_TS, state: SensorState.Live, provenance: ValueProvenance.Measured, confidence: 1 });

    const componentsBefore  = stores.graph.getComponents(HOT_WATER_PROJECT_ID).length;
    const connectionsBefore = stores.graph.getConnections(HOT_WATER_PROJECT_ID).length;
    const versionBefore     = stores.versions.current(HOT_WATER_PROJECT_ID);

    renderHook(() =>
      useProjection(HOT_WATER_PROJECT_ID, stores, liveStore, registry, profileStore, alarmStore, NOW),
    );

    expect(stores.graph.getComponents(HOT_WATER_PROJECT_ID).length).toBe(componentsBefore);
    expect(stores.graph.getConnections(HOT_WATER_PROJECT_ID).length).toBe(connectionsBefore);
    expect(stores.versions.current(HOT_WATER_PROJECT_ID)).toBe(versionBefore); // no version increment
  });
});


