import { describe, it, expect, vi, afterEach } from 'vitest';
import { createEvaluationRunner } from './evaluation-runner.js';
import { createInMemoryGraphStore, type EngineStores } from '../engine/graph-engine.js';
import { createInMemoryVersionStore } from '../domain/project-version.js';
import { createInMemoryEventStore } from '../domain/event-store.js';
import { createInMemoryLiveStore } from '../telemetry/live-store.js';
import { createInMemoryOperationalProfileStore } from '../projection/operational-profile-store.js';
import { createInMemoryAlarmStore } from '../alarm/alarm-store.js';
import { createComponentRegistry } from '../lib/component-registry.js';
import { registerBaseLibrary } from '../lib/component-library.js';
import { GAS_BACKUP }   from '../lib/definitions/gas-backup.def.js';
import { POINT_OF_USE } from '../lib/definitions/point-of-use.def.js';
import { bootstrapApp } from '../app/bootstrap.js';
import { buildHotWaterPayload } from '../ingestion/fixture-adapter.js';
import { NodeStatus, SensorState, ValueProvenance } from '../domain/types.js';
import type { LiveSample } from '../domain/types.js';

afterEach(() => vi.useRealTimers());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRegistry() {
  const r = createComponentRegistry();
  registerBaseLibrary(r);
  return r;
}

function makeStores(): EngineStores {
  return {
    graph:    createInMemoryGraphStore(),
    versions: createInMemoryVersionStore(),
    events:   createInMemoryEventStore(),
  };
}

function makeSample(bindingId: string, value: number): LiveSample {
  return {
    bindingId, value,
    ts:         new Date().toISOString(),
    state:      SensorState.Live,
    provenance: ValueProvenance.Inferred,
  };
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

describe('createEvaluationRunner — lifecycle', () => {
  it('isRunning() is false before start', () => {
    const stores      = makeStores();
    const liveStore   = createInMemoryLiveStore();
    const profileStore = createInMemoryOperationalProfileStore();
    const alarmStore  = createInMemoryAlarmStore();
    const registry    = makeRegistry();

    const runner = createEvaluationRunner(
      'proj_test', stores, liveStore, registry, profileStore, alarmStore, 500,
    );
    expect(runner.isRunning()).toBe(false);
  });

  it('isRunning() true after start, false after stop', () => {
    vi.useFakeTimers();
    const stores      = makeStores();
    const liveStore   = createInMemoryLiveStore();
    const profileStore = createInMemoryOperationalProfileStore();
    const alarmStore  = createInMemoryAlarmStore();
    const registry    = makeRegistry();

    const runner = createEvaluationRunner(
      'proj_test', stores, liveStore, registry, profileStore, alarmStore, 500,
    );
    runner.start();
    expect(runner.isRunning()).toBe(true);
    runner.stop();
    expect(runner.isRunning()).toBe(false);
  });

  it('start() is idempotent — calling twice does not create a second interval', () => {
    vi.useFakeTimers();
    const stores      = makeStores();
    const liveStore   = createInMemoryLiveStore();
    const profileStore = createInMemoryOperationalProfileStore();
    const alarmStore  = createInMemoryAlarmStore();
    const registry    = makeRegistry();

    const runner = createEvaluationRunner(
      'proj_test', stores, liveStore, registry, profileStore, alarmStore, 500,
    );
    runner.start();
    runner.start();
    runner.stop();
    expect(runner.isRunning()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Alarm evaluation — integration with hot-water payload
// ---------------------------------------------------------------------------

describe('createEvaluationRunner — alarm evaluation', () => {
  function makeHotWaterCtx() {
    const r = createComponentRegistry();
    registerBaseLibrary(r);
    r.register(GAS_BACKUP);
    r.register(POINT_OF_USE);
    const payload = buildHotWaterPayload(r);
    return bootstrapApp(payload, r);
  }

  it('raises a critical alarm when tank temperature is in Risk zone', () => {
    vi.useFakeTimers();
    const ctx = makeHotWaterCtx();

    // b_t1: tank temp, Risk = <50°C
    ctx.liveStore.set('b_t1', makeSample('b_t1', 45));

    const runner = createEvaluationRunner(
      ctx.projectId, ctx.stores, ctx.liveStore,
      ctx.registry, ctx.profileStore, ctx.alarmStore, 1_000,
    );
    runner.start();

    // Advance past debounce (rule_tank_risk has 5s debounce)
    vi.advanceTimersByTime(6_000);

    const alarms = ctx.alarmStore.getAlarmsForComponent('cmp_tank');
    const active = alarms.filter(a => a.state === 'active' && a.ruleId === 'rule_tank_risk');
    expect(active.length).toBeGreaterThan(0);

    runner.stop();
  });

  it('raises a critical scald alarm when shower temperature is above 50°C', () => {
    vi.useFakeTimers();
    const ctx = makeHotWaterCtx();

    // b_t3: shower temp, Scald = ≥50°C — rule has 0s debounce
    ctx.liveStore.set('b_t3', makeSample('b_t3', 51));

    const runner = createEvaluationRunner(
      ctx.projectId, ctx.stores, ctx.liveStore,
      ctx.registry, ctx.profileStore, ctx.alarmStore, 1_000,
    );
    runner.start();
    vi.advanceTimersByTime(1_100);  // past one interval; first tick raises pending, second activates (0s debounce)

    const alarms = ctx.alarmStore.getAlarmsForComponent('cmp_shower');
    const active = alarms.filter(a => a.state === 'active' && a.ruleId === 'rule_shower_scald');
    expect(active.length).toBeGreaterThan(0);

    runner.stop();
  });

  it('clears alarm when temperature recovers into Ok zone', () => {
    vi.useFakeTimers();
    const ctx = makeHotWaterCtx();

    // Trigger alarm
    ctx.liveStore.set('b_t1', makeSample('b_t1', 45));  // Risk
    const runner = createEvaluationRunner(
      ctx.projectId, ctx.stores, ctx.liveStore,
      ctx.registry, ctx.profileStore, ctx.alarmStore, 1_000,
    );
    runner.start();
    vi.advanceTimersByTime(6_000);  // past debounce — alarm becomes active

    // Recover
    ctx.liveStore.set('b_t1', makeSample('b_t1', 60));  // Ok
    vi.advanceTimersByTime(1_000);

    const alarms = ctx.alarmStore.getAlarmsForComponent('cmp_tank');
    const stillActive = alarms.filter(a => a.state === 'active' && a.ruleId === 'rule_tank_risk');
    expect(stillActive).toHaveLength(0);

    runner.stop();
  });

  it('does not evaluate components without alarm rules', () => {
    vi.useFakeTimers();
    const ctx = makeHotWaterCtx();

    const runner = createEvaluationRunner(
      ctx.projectId, ctx.stores, ctx.liveStore,
      ctx.registry, ctx.profileStore, ctx.alarmStore, 1_000,
    );
    runner.start();
    vi.advanceTimersByTime(2_000);

    // cmp_heatpump has no alarm rules — no alarms raised
    const alarms = ctx.alarmStore.getAlarmsForComponent('cmp_heatpump');
    expect(alarms).toHaveLength(0);

    runner.stop();
  });

  it('stops evaluating after stop() — no new alarms raised', () => {
    vi.useFakeTimers();
    const ctx = makeHotWaterCtx();

    // Normal temp — no alarms
    ctx.liveStore.set('b_t1', makeSample('b_t1', 60));
    const runner = createEvaluationRunner(
      ctx.projectId, ctx.stores, ctx.liveStore,
      ctx.registry, ctx.profileStore, ctx.alarmStore, 1_000,
    );
    runner.start();
    runner.stop();

    // Now set Risk temp — but runner is stopped
    ctx.liveStore.set('b_t1', makeSample('b_t1', 45));
    vi.advanceTimersByTime(10_000);

    const alarms = ctx.alarmStore.getAlarmsForComponent('cmp_tank');
    const raised = alarms.filter(a => a.ruleId === 'rule_tank_risk');
    expect(raised).toHaveLength(0);
  });
});
