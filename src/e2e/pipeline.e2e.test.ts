/**
 * Stage 4.5 — End-to-End Conformance Test
 *
 * Proves the complete runtime pipeline:
 *
 *   ComponentDefinitions
 *   → ComponentRegistry
 *   → buildHotWaterSeed (Graph)
 *   → LiveStore updates
 *   → projectComponent() / projectConnection()
 *   → flow-transformers (componentToNode / connectionToEdge)
 *   → React Flow ViewModels
 *
 * No production UI. No mocks. Real implementations end-to-end.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ── Stage 1-2 ── Graph
import { createInMemoryGraphStore, createProject, type EngineStores } from '../engine/graph-engine.js';
import { createInMemoryVersionStore } from '../domain/project-version.js';
import { createInMemoryEventStore } from '../domain/event-store.js';
import { createComponentRegistry } from '../lib/component-registry.js';
import { registerBaseLibrary } from '../lib/component-library.js';
import { GAS_BACKUP   } from '../lib/definitions/gas-backup.def.js';
import { POINT_OF_USE } from '../lib/definitions/point-of-use.def.js';
import { buildHotWaterSeed, HOT_WATER_PROJECT_ID, HOT_WATER_PROFILES } from '../seed/hot-water.seed.js';

// ── Stage 4 ── Telemetry + Projection
import { createInMemoryLiveStore } from '../telemetry/live-store.js';
import { projectComponent } from '../projection/project-component.js';
import { projectConnection } from '../projection/project-connection.js';

// ── Stage 3 ── Renderer transformers
import { componentToNode, connectionToEdge } from '../renderer/flow-transformers.js';

// ── Domain types ──
import {
  HealthState, NodeStatus, SensorState, ValueProvenance,
  FlowState,
} from '../domain/types.js';
import type { LiveSample, Component, OperationalProfile } from '../domain/types.js';
import type { AlarmWithSeverity } from '../projection/health-derivation.js';

// ── Fixtures ──

const TANK_OP_PROFILE = HOT_WATER_PROFILES[0]!; // op_tank_default

/** Fixed reference for deterministic TTL testing */
const EPOCH = new Date('2024-06-01T12:00:00.000Z').getTime();
const TANK_TTL = 120; // from hot-water seed binding b_t1

function sampleAt(bindingId: string, value: number, ageSeconds: number): LiveSample {
  return {
    bindingId,
    value,
    ts:         new Date(EPOCH - ageSeconds * 1000).toISOString(),
    state:      SensorState.Live,
    provenance: ValueProvenance.Measured,
  };
}

function criticalAlarm(componentId: string): AlarmWithSeverity {
  return {
    id: 'alarm_test', ruleId: 'rule_test', componentId,
    raisedAt: new Date().toISOString(), state: 'active', severity: 'critical',
  };
}

function warningAlarm(componentId: string): AlarmWithSeverity {
  return {
    id: 'alarm_warn', ruleId: 'rule_warn', componentId,
    raisedAt: new Date().toISOString(), state: 'active', severity: 'warning',
  };
}

// ── Shared test setup ──

let stores: EngineStores;
let registry: ReturnType<typeof createComponentRegistry>;
let liveStore: ReturnType<typeof createInMemoryLiveStore>;
let tank: Component;
let supplyConn: ReturnType<typeof stores.graph.getConnection>;

function setup() {
  stores = {
    graph:    createInMemoryGraphStore(),
    versions: createInMemoryVersionStore(),
    events:   createInMemoryEventStore(),
  };
  registry = createComponentRegistry();
  registerBaseLibrary(registry);
  registry.register(GAS_BACKUP);
  registry.register(POINT_OF_USE);
  buildHotWaterSeed(stores, registry);
  liveStore = createInMemoryLiveStore();
  tank      = stores.graph.getComponent(HOT_WATER_PROJECT_ID, 'cmp_tank')!;
  supplyConn = stores.graph.getConnection(HOT_WATER_PROJECT_ID, 'cn_supply');
}

// ===========================================================================
// Scenario 1 — Live temperature update changes ComponentViewModel.status
// ===========================================================================

describe('Scenario 1 — Live temp update changes operationalStatus', () => {
  beforeEach(setup);

  it('temp 60°C (≥55) → operationalStatus Ok', () => {
    liveStore.set('b_t1', sampleAt('b_t1', 60, 0));
    const def = registry.getOrThrow('storage_tank');
    const vm  = projectComponent(tank, def, liveStore, [], [], TANK_OP_PROFILE, EPOCH);
    expect(vm.operationalStatus).toBe(NodeStatus.Ok);
  });

  it('temp 52°C ([50,55)) → operationalStatus Warn', () => {
    liveStore.set('b_t1', sampleAt('b_t1', 52, 0));
    const def = registry.getOrThrow('storage_tank');
    const vm  = projectComponent(tank, def, liveStore, [], [], TANK_OP_PROFILE, EPOCH);
    expect(vm.operationalStatus).toBe(NodeStatus.Warn);
  });

  it('temp 45°C (<50) → operationalStatus Risk', () => {
    liveStore.set('b_t1', sampleAt('b_t1', 45, 0));
    const def = registry.getOrThrow('storage_tank');
    const vm  = projectComponent(tank, def, liveStore, [], [], TANK_OP_PROFILE, EPOCH);
    expect(vm.operationalStatus).toBe(NodeStatus.Risk);
  });

  it('consecutive updates reflect the latest value', () => {
    const def = registry.getOrThrow('storage_tank');
    liveStore.set('b_t1', sampleAt('b_t1', 45, 0));
    expect(projectComponent(tank, def, liveStore, [], [], TANK_OP_PROFILE, EPOCH).operationalStatus)
      .toBe(NodeStatus.Risk);

    liveStore.set('b_t1', sampleAt('b_t1', 62, 0));
    expect(projectComponent(tank, def, liveStore, [], [], TANK_OP_PROFILE, EPOCH).operationalStatus)
      .toBe(NodeStatus.Ok);
  });

  it('liveValues[temp] reflects the raw value', () => {
    liveStore.set('b_t1', sampleAt('b_t1', 58.5, 0));
    const def = registry.getOrThrow('storage_tank');
    const vm  = projectComponent(tank, def, liveStore, [], [], TANK_OP_PROFILE, EPOCH);
    expect(vm.liveValues['temp']).toBe(58.5);
  });
});

// ===========================================================================
// Scenario 2 — TTL expiration changes SensorState
// ===========================================================================

describe('Scenario 2 — TTL expiration changes SensorState', () => {
  beforeEach(setup);

  it('age < TTL → sensorState Live', () => {
    liveStore.set('b_t1', sampleAt('b_t1', 62, TANK_TTL - 1));
    const def = registry.getOrThrow('storage_tank');
    const vm  = projectComponent(tank, def, liveStore, [], [], TANK_OP_PROFILE, EPOCH);
    expect(vm.sensorState).toBe(SensorState.Live);
  });

  it('age === TTL → sensorState Stale (boundary)', () => {
    liveStore.set('b_t1', sampleAt('b_t1', 62, TANK_TTL));
    const def = registry.getOrThrow('storage_tank');
    const vm  = projectComponent(tank, def, liveStore, [], [], TANK_OP_PROFILE, EPOCH);
    expect(vm.sensorState).toBe(SensorState.Stale);
  });

  it('age === 2*TTL → sensorState Lost (boundary)', () => {
    liveStore.set('b_t1', sampleAt('b_t1', 62, TANK_TTL * 2));
    const def = registry.getOrThrow('storage_tank');
    const vm  = projectComponent(tank, def, liveStore, [], [], TANK_OP_PROFILE, EPOCH);
    expect(vm.sensorState).toBe(SensorState.Lost);
  });

  it('no sample → sensorState Unknown', () => {
    const def = registry.getOrThrow('storage_tank');
    const vm  = projectComponent(tank, def, liveStore, [], [], TANK_OP_PROFILE, EPOCH);
    expect(vm.sensorState).toBe(SensorState.Unknown);
  });

  it('Stale sample → liveValues[temp] is null (stale value not exposed)', () => {
    liveStore.set('b_t1', sampleAt('b_t1', 62, TANK_TTL + 10));
    const def = registry.getOrThrow('storage_tank');
    const vm  = projectComponent(tank, def, liveStore, [], [], TANK_OP_PROFILE, EPOCH);
    expect(vm.liveValues['temp']).toBeNull();
  });

  it('Lost sample → operationalStatus Unknown (no value to evaluate)', () => {
    liveStore.set('b_t1', sampleAt('b_t1', 62, TANK_TTL * 2 + 1));
    const def = registry.getOrThrow('storage_tank');
    const vm  = projectComponent(tank, def, liveStore, [], [], TANK_OP_PROFILE, EPOCH);
    expect(vm.operationalStatus).toBe(NodeStatus.Unknown);
  });
});

// ===========================================================================
// Scenario 3 — HealthState transitions
// ===========================================================================

describe('Scenario 3 — HealthState transitions', () => {
  beforeEach(setup);

  it('Healthy: live sensor, normal mode, no alarms', () => {
    liveStore.set('b_t1', sampleAt('b_t1', 62, 0));
    const def = registry.getOrThrow('storage_tank');
    const vm  = projectComponent(tank, def, liveStore, [], [], TANK_OP_PROFILE, EPOCH);
    expect(vm.health).toBe(HealthState.Healthy);
  });

  it('Maintenance: mode === maintenance overrides everything', () => {
    // Even with a critical alarm and Lost sensor, maintenance wins
    liveStore.set('b_t1', sampleAt('b_t1', 62, TANK_TTL * 3));
    const maintTank: Component = { ...tank, mode: 'maintenance' };
    const def = registry.getOrThrow('storage_tank');
    const vm  = projectComponent(maintTank, def, liveStore, [criticalAlarm(tank.id)], [], TANK_OP_PROFILE, EPOCH);
    expect(vm.health).toBe(HealthState.Maintenance);
  });

  it('Commissioning: mode === commissioning overrides everything', () => {
    const commTank: Component = { ...tank, mode: 'commissioning' };
    const def = registry.getOrThrow('storage_tank');
    const vm  = projectComponent(commTank, def, liveStore, [criticalAlarm(tank.id)], [], TANK_OP_PROFILE, EPOCH);
    expect(vm.health).toBe(HealthState.Commissioning);
  });

  it('Offline: all governing sensors Lost', () => {
    liveStore.set('b_t1', sampleAt('b_t1', 62, TANK_TTL * 2));
    const def = registry.getOrThrow('storage_tank');
    const vm  = projectComponent(tank, def, liveStore, [], [], TANK_OP_PROFILE, EPOCH);
    expect(vm.health).toBe(HealthState.Offline);
  });

  it('Critical: active critical alarm with live sensor', () => {
    liveStore.set('b_t1', sampleAt('b_t1', 62, 0));
    const def = registry.getOrThrow('storage_tank');
    const vm  = projectComponent(tank, def, liveStore, [criticalAlarm(tank.id)], [], TANK_OP_PROFILE, EPOCH);
    expect(vm.health).toBe(HealthState.Critical);
  });

  it('Warning: active warning alarm with live sensor', () => {
    liveStore.set('b_t1', sampleAt('b_t1', 62, 0));
    const def = registry.getOrThrow('storage_tank');
    const vm  = projectComponent(tank, def, liveStore, [warningAlarm(tank.id)], [], TANK_OP_PROFILE, EPOCH);
    expect(vm.health).toBe(HealthState.Warning);
  });

  it('Offline takes priority over Critical alarm', () => {
    liveStore.set('b_t1', sampleAt('b_t1', 62, TANK_TTL * 2));
    const def = registry.getOrThrow('storage_tank');
    const vm  = projectComponent(tank, def, liveStore, [criticalAlarm(tank.id)], [], TANK_OP_PROFILE, EPOCH);
    expect(vm.health).toBe(HealthState.Offline);
  });
});

// ===========================================================================
// Scenario 4 — FlowEdge animation follows FlowState + SensorState only
// ===========================================================================

describe('Scenario 4 — FlowEdge animation', () => {
  beforeEach(setup);

  const SUPPLY_TTL = 120; // from cn_supply binding b_t2_supply

  it('animated === true only when flow === Flowing (Live + value > 0)', () => {
    liveStore.set('b_t2_supply', sampleAt('b_t2_supply', 10, 0));
    const vm  = projectConnection(supplyConn!, liveStore, EPOCH);
    const edge = connectionToEdge(supplyConn!, vm);
    expect(vm.flow).toBe(FlowState.Flowing);
    expect(edge.animated).toBe(true);
  });

  it('animated === false when flow === NoFlow (Live + value === 0)', () => {
    liveStore.set('b_t2_supply', sampleAt('b_t2_supply', 0, 0));
    const vm  = projectConnection(supplyConn!, liveStore, EPOCH);
    const edge = connectionToEdge(supplyConn!, vm);
    expect(vm.flow).toBe(FlowState.NoFlow);
    expect(edge.animated).toBe(false);
  });

  it('animated === false when sensorState is Stale (flow → Unknown)', () => {
    liveStore.set('b_t2_supply', sampleAt('b_t2_supply', 10, SUPPLY_TTL));
    const vm  = projectConnection(supplyConn!, liveStore, EPOCH);
    const edge = connectionToEdge(supplyConn!, vm);
    expect(vm.sensorState).toBe(SensorState.Stale);
    expect(vm.flow).toBe(FlowState.Unknown);
    expect(edge.animated).toBe(false);
  });

  it('animated === false when no sample (flow → Unknown)', () => {
    const vm  = projectConnection(supplyConn!, liveStore, EPOCH);
    const edge = connectionToEdge(supplyConn!, vm);
    expect(vm.flow).toBe(FlowState.Unknown);
    expect(edge.animated).toBe(false);
  });

  it('edge.animated reads only from the pre-computed ViewModel (no re-derivation)', () => {
    // The connectionToEdge transformer sets animated = vm.flow === FlowState.Flowing.
    // Verify that edge.data.viewModel is the exact same object passed in.
    liveStore.set('b_t2_supply', sampleAt('b_t2_supply', 5, 0));
    const vm  = projectConnection(supplyConn!, liveStore, EPOCH);
    const edge = connectionToEdge(supplyConn!, vm);
    expect(edge.data!.viewModel).toBe(vm); // identity — not a copy
    expect(edge.animated).toBe(edge.data!.animated);
  });
});

// ===========================================================================
// Scenario 5 — Renderer receives pre-computed ViewModels unchanged
// ===========================================================================

describe('Scenario 5 — Renderer wraps ViewModels without modification', () => {
  beforeEach(setup);

  it('componentToNode preserves the ViewModel as node.data.viewModel', () => {
    liveStore.set('b_t1', sampleAt('b_t1', 60, 0));
    const def = registry.getOrThrow('storage_tank');
    const vm  = projectComponent(tank, def, liveStore, [], [], TANK_OP_PROFILE, EPOCH);
    const node = componentToNode(tank, vm);
    expect(node.data.viewModel).toBe(vm);
  });

  it('node health/status come from ViewModel, not recomputed', () => {
    liveStore.set('b_t1', sampleAt('b_t1', 45, 0));
    const def = registry.getOrThrow('storage_tank');
    const vm  = projectComponent(tank, def, liveStore, [], [], TANK_OP_PROFILE, EPOCH);
    const node = componentToNode(tank, vm);
    // Node holds exactly what projection produced
    expect(node.data.viewModel.operationalStatus).toBe(NodeStatus.Risk);
    expect(node.data.viewModel.health).toBe(HealthState.Healthy);
  });

  it('connectionToEdge preserves the ConnectionViewModel as edge.data.viewModel', () => {
    liveStore.set('b_t2_supply', sampleAt('b_t2_supply', 5, 0));
    const vm   = projectConnection(supplyConn!, liveStore, EPOCH);
    const edge = connectionToEdge(supplyConn!, vm);
    expect(edge.data!.viewModel).toBe(vm);
  });

  it('full pipeline: all 6 components produce nodes with correct ids', () => {
    const def = registry.getOrThrow('storage_tank');
    const components = stores.graph.getComponents(HOT_WATER_PROJECT_ID);
    const nodes = components.map(c => {
      const d  = registry.getOrThrow(c.type);
      const vm = projectComponent(c, d, liveStore, [], [], undefined, EPOCH);
      return componentToNode(c, vm);
    });
    const ids = nodes.map(n => n.id).sort();
    expect(ids).toEqual([
      'cmp_gas_backup', 'cmp_heatpump', 'cmp_recirc_pump',
      'cmp_shower', 'cmp_tank', 'cmp_tmv',
    ]);
  });

  it('full pipeline: all 6 connections produce edges with correct ids', () => {
    const connections = stores.graph.getConnections(HOT_WATER_PROJECT_ID);
    const edges = connections.map(cn => {
      const vm = projectConnection(cn, liveStore, EPOCH);
      return connectionToEdge(cn, vm);
    });
    const ids = edges.map(e => e.id).sort();
    expect(ids).toEqual([
      'cn_gas_tank', 'cn_hp_tank', 'cn_return',
      'cn_return_to_tank', 'cn_supply', 'cn_tmv_use',
    ]);
  });
});

// ===========================================================================
// Scenario 6 — Constitution Art. 14: seed uses only public Engine API
// ===========================================================================

describe('Scenario 6 — Architecture invariants', () => {
  beforeEach(setup);

  it('all component types come from the registry (engine has no type knowledge)', () => {
    const components = stores.graph.getComponents(HOT_WATER_PROJECT_ID);
    const registeredTypes = new Set(registry.listAll().map(d => d.typeId));
    for (const c of components) {
      expect(registeredTypes.has(c.type)).toBe(true);
    }
  });

  it('projection is stateless: same inputs produce identical ViewModels', () => {
    liveStore.set('b_t1', sampleAt('b_t1', 62, 0));
    const def = registry.getOrThrow('storage_tank');
    const vm1 = projectComponent(tank, def, liveStore, [], [], TANK_OP_PROFILE, EPOCH);
    const vm2 = projectComponent(tank, def, liveStore, [], [], TANK_OP_PROFILE, EPOCH);
    expect(vm1).toEqual(vm2);
  });

  it('changing liveStore between projections changes the ViewModel', () => {
    const def = registry.getOrThrow('storage_tank');
    liveStore.set('b_t1', sampleAt('b_t1', 60, 0));
    const vm1 = projectComponent(tank, def, liveStore, [], [], TANK_OP_PROFILE, EPOCH);
    liveStore.set('b_t1', sampleAt('b_t1', 45, 0));
    const vm2 = projectComponent(tank, def, liveStore, [], [], TANK_OP_PROFILE, EPOCH);
    expect(vm1.operationalStatus).not.toBe(vm2.operationalStatus);
  });

  it('13 domain events were written during seed build (Art. 13 — append-only)', () => {
    const events = stores.events.query(HOT_WATER_PROJECT_ID);
    expect(events).toHaveLength(13);
  });
});
