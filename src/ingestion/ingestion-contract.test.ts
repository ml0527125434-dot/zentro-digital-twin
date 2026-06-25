/** @vitest-environment happy-dom */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import { createIngestor } from './ingestion-contract.js';
import type { GraphSnapshot, ProfileSnapshot, AlarmRuleSnapshot } from './ingestion-contract.js';

import { createInMemoryGraphStore, type EngineStores, type GraphStore } from '../engine/graph-engine.js';
import { createInMemoryVersionStore } from '../domain/project-version.js';
import { createInMemoryEventStore } from '../domain/event-store.js';
import { createInMemoryLiveStore } from '../telemetry/live-store.js';
import { createInMemoryOperationalProfileStore } from '../projection/operational-profile-store.js';
import { createInMemoryAlarmStore } from '../alarm/alarm-store.js';
import { createComponentRegistry } from '../lib/component-registry.js';
import { registerBaseLibrary } from '../lib/component-library.js';

import { useProjection } from '../app/useProjection.js';
import { SensorState, ValueProvenance, HealthState, NodeStatus } from '../domain/types.js';
import type { Project, Component, Connection, OperationalProfile, AlarmRule, LiveSample } from '../domain/types.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PROJECT: Project = { id: 'proj_test', name: 'Test Project', siteType: 'test' };
const NOW_MS  = 1_000_000_000_000;
const NOW_ISO = new Date(NOW_MS).toISOString();

const COMP_A: Component = {
  id: 'cmp_a', type: 'storage_tank', name: 'Tank A',
  projectId: PROJECT.id, bindings: [],
};
const COMP_B: Component = {
  id: 'cmp_b', type: 'heat_pump', name: 'Heat Pump B',
  projectId: PROJECT.id, bindings: [],
};
const CONN_AB: Connection = {
  id: 'conn_ab', projectId: PROJECT.id,
  fromComponentId: 'cmp_a', fromPortId: 'out_hw',
  toComponentId:   'cmp_b', toPortId:   'in_hw',
  medium: 'hot_water', topologicalDirection: 'forward',
  bindings: [],
};

const PROFILE: OperationalProfile = {
  id: 'op_test', appliesToType: 'storage_tank', scope: 'type_default',
  metrics: [],
};

const RULE: AlarmRule = {
  id: 'rule_test', componentId: 'cmp_a',
  triggerStatus: [NodeStatus.Risk], debounceSeconds: 0,
  severity: 'warning', message: 'Test alarm',
};

const SAMPLE: LiveSample = {
  bindingId: 'b_test', value: 62, ts: NOW_ISO,
  state: SensorState.Live, provenance: ValueProvenance.Measured,
};

function makeStores(): EngineStores {
  return {
    graph:    createInMemoryGraphStore(),
    versions: createInMemoryVersionStore(),
    events:   createInMemoryEventStore(),
  };
}

// ---------------------------------------------------------------------------
// ingestGraph
// ---------------------------------------------------------------------------

describe('ingestGraph', () => {
  it('populates an empty graph with project, components, and connections', () => {
    const ingestor = createIngestor();
    const stores   = makeStores();
    const snapshot: GraphSnapshot = { project: PROJECT, components: [COMP_A, COMP_B], connections: [CONN_AB] };

    ingestor.ingestGraph(snapshot, stores);

    expect(stores.graph.getProject(PROJECT.id)).toEqual(PROJECT);
    expect(stores.graph.getComponents(PROJECT.id)).toHaveLength(2);
    expect(stores.graph.getConnections(PROJECT.id)).toHaveLength(1);
    expect(stores.graph.getComponent(PROJECT.id, 'cmp_a')).toEqual(COMP_A);
    expect(stores.graph.getConnection(PROJECT.id, 'conn_ab')).toEqual(CONN_AB);
  });

  it('re-ingesting the same snapshot is idempotent', () => {
    const ingestor = createIngestor();
    const stores   = makeStores();
    const snapshot: GraphSnapshot = { project: PROJECT, components: [COMP_A, COMP_B], connections: [CONN_AB] };

    ingestor.ingestGraph(snapshot, stores);
    ingestor.ingestGraph(snapshot, stores);

    expect(stores.graph.getComponents(PROJECT.id)).toHaveLength(2);
    expect(stores.graph.getConnections(PROJECT.id)).toHaveLength(1);
    expect(stores.graph.getComponent(PROJECT.id, 'cmp_a')).toEqual(COMP_A);
  });

  it('re-ingesting with a modified component updates that component', () => {
    const ingestor  = createIngestor();
    const stores    = makeStores();
    const snapshot1: GraphSnapshot = { project: PROJECT, components: [COMP_A], connections: [] };
    const updated   = { ...COMP_A, name: 'Tank A (updated)' };
    const snapshot2: GraphSnapshot = { project: PROJECT, components: [updated], connections: [] };

    ingestor.ingestGraph(snapshot1, stores);
    ingestor.ingestGraph(snapshot2, stores);

    expect(stores.graph.getComponent(PROJECT.id, 'cmp_a')!.name).toBe('Tank A (updated)');
  });

  it('component absent from new snapshot is deleted', () => {
    const ingestor  = createIngestor();
    const stores    = makeStores();
    const snapshot1: GraphSnapshot = { project: PROJECT, components: [COMP_A, COMP_B], connections: [] };
    const snapshot2: GraphSnapshot = { project: PROJECT, components: [COMP_A], connections: [] };

    ingestor.ingestGraph(snapshot1, stores);
    expect(stores.graph.getComponent(PROJECT.id, 'cmp_b')).toBeDefined();

    ingestor.ingestGraph(snapshot2, stores);
    expect(stores.graph.getComponent(PROJECT.id, 'cmp_b')).toBeUndefined();
    expect(stores.graph.getComponent(PROJECT.id, 'cmp_a')).toBeDefined();
  });

  it('connection absent from new snapshot is deleted', () => {
    const ingestor  = createIngestor();
    const stores    = makeStores();
    const snapshot1: GraphSnapshot = { project: PROJECT, components: [COMP_A, COMP_B], connections: [CONN_AB] };
    const snapshot2: GraphSnapshot = { project: PROJECT, components: [COMP_A, COMP_B], connections: [] };

    ingestor.ingestGraph(snapshot1, stores);
    expect(stores.graph.getConnection(PROJECT.id, 'conn_ab')).toBeDefined();

    ingestor.ingestGraph(snapshot2, stores);
    expect(stores.graph.getConnection(PROJECT.id, 'conn_ab')).toBeUndefined();
  });

  it('connections are deleted before components (verified via spy)', () => {
    const ingestor  = createIngestor();
    const realStore = createInMemoryGraphStore();
    const calls: string[] = [];

    const spyStore: GraphStore = {
      ...realStore,
      deleteConnection(pid, id) { calls.push(`connection:${id}`); realStore.deleteConnection(pid, id); },
      deleteComponent(pid, id)  { calls.push(`component:${id}`);  realStore.deleteComponent(pid, id); },
    };

    const stores: EngineStores = { graph: spyStore, versions: createInMemoryVersionStore(), events: createInMemoryEventStore() };

    // Seed: one component + one connection so both will be deleted on re-ingest
    const seed: GraphSnapshot = { project: PROJECT, components: [COMP_A, COMP_B], connections: [CONN_AB] };
    ingestor.ingestGraph(seed, stores);

    // Re-ingest empty snapshot: both component and connection must be deleted
    const empty: GraphSnapshot = { project: PROJECT, components: [], connections: [] };
    ingestor.ingestGraph(empty, stores);

    // All connection deletions must precede all component deletions
    const lastConnectionDelete = Math.max(...calls.map((c, i) => c.startsWith('connection:') ? i : -1));
    const firstComponentDelete = Math.min(...calls.map((c, i) => c.startsWith('component:')  ? i : Infinity));
    expect(calls.some(c => c.startsWith('connection:'))).toBe(true);
    expect(calls.some(c => c.startsWith('component:'))).toBe(true);
    expect(lastConnectionDelete).toBeLessThan(firstComponentDelete);
  });

  it('throws when a component projectId mismatches the snapshot project', () => {
    const ingestor = createIngestor();
    const stores   = makeStores();
    const wrongComp = { ...COMP_A, projectId: 'proj_other' };
    const snapshot: GraphSnapshot = { project: PROJECT, components: [wrongComp], connections: [] };

    expect(() => ingestor.ingestGraph(snapshot, stores)).toThrow(/projectId/);
  });

  it('throws when a connection references a component not in the snapshot', () => {
    const ingestor = createIngestor();
    const stores   = makeStores();
    // CONN_AB references cmp_b, but snapshot only has cmp_a
    const snapshot: GraphSnapshot = { project: PROJECT, components: [COMP_A], connections: [CONN_AB] };

    expect(() => ingestor.ingestGraph(snapshot, stores)).toThrow(/unknown.*ComponentId|ComponentId.*unknown/i);
  });

  it('does not write to VersionStore or EventStore', () => {
    const ingestor  = createIngestor();
    const stores    = makeStores();
    const snapshot: GraphSnapshot = { project: PROJECT, components: [COMP_A], connections: [] };

    ingestor.ingestGraph(snapshot, stores);

    expect(stores.versions.current(PROJECT.id)).toBe(0);    // no increments
    expect(stores.events.query(PROJECT.id)).toHaveLength(0); // no events appended
  });
});

// ---------------------------------------------------------------------------
// ingestProfiles
// ---------------------------------------------------------------------------

describe('ingestProfiles', () => {
  it('populates OperationalProfileStore; does not touch graph or alarm stores', () => {
    const ingestor    = createIngestor();
    const stores      = makeStores();
    const profileStore = createInMemoryOperationalProfileStore();
    const alarmStore  = createInMemoryAlarmStore();
    const snapshot: ProfileSnapshot = { profiles: [PROFILE] };

    ingestor.ingestProfiles(snapshot, profileStore);

    expect(profileStore.get(PROFILE.id)).toEqual(PROFILE);
    // Graph and alarm stores are untouched
    expect(stores.graph.getComponents(PROJECT.id)).toHaveLength(0);
    expect(alarmStore.getAlarmRulesForComponent(RULE.componentId)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// ingestAlarmRules
// ---------------------------------------------------------------------------

describe('ingestAlarmRules', () => {
  it('registers rules in AlarmStore; does not touch graph or profile stores', () => {
    const ingestor    = createIngestor();
    const stores      = makeStores();
    const profileStore = createInMemoryOperationalProfileStore();
    const alarmStore  = createInMemoryAlarmStore();
    const snapshot: AlarmRuleSnapshot = { rules: [RULE] };

    ingestor.ingestAlarmRules(snapshot, alarmStore);

    expect(alarmStore.getAlarmRule(RULE.id)).toEqual(RULE);
    // Graph and profile stores are untouched
    expect(stores.graph.getComponents(PROJECT.id)).toHaveLength(0);
    expect(profileStore.get(PROFILE.id)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// ingestSample
// ---------------------------------------------------------------------------

describe('ingestSample', () => {
  it('writes sample to LiveStore; does not touch other stores', () => {
    const ingestor    = createIngestor();
    const stores      = makeStores();
    const liveStore   = createInMemoryLiveStore();
    const profileStore = createInMemoryOperationalProfileStore();

    ingestor.ingestSample(SAMPLE, liveStore);

    expect(liveStore.get(SAMPLE.bindingId)).toEqual(SAMPLE);
    expect(stores.graph.getComponents(PROJECT.id)).toHaveLength(0);
    expect(profileStore.listAll()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Projection integration
// ---------------------------------------------------------------------------

describe('projection integration after ingestion', () => {
  it('projection produces expected ViewModels after full ingestion', () => {
    const ingestor    = createIngestor();
    const stores      = makeStores();
    const liveStore   = createInMemoryLiveStore();
    const profileStore = createInMemoryOperationalProfileStore();
    const alarmStore  = createInMemoryAlarmStore();
    const registry    = createComponentRegistry();
    registerBaseLibrary(registry);

    // Ingest graph, profiles, alarm rules, and one live sample
    ingestor.ingestGraph({ project: PROJECT, components: [COMP_A], connections: [] }, stores);
    ingestor.ingestProfiles({ profiles: [PROFILE] }, profileStore);
    ingestor.ingestAlarmRules({ rules: [RULE] }, alarmStore);

    const sampleForA: LiveSample = {
      bindingId: COMP_A.bindings[0]?.id ?? 'b_none',
      value: 62, ts: NOW_ISO, state: SensorState.Live, provenance: ValueProvenance.Measured,
    };
    ingestor.ingestSample(sampleForA, liveStore);

    const { result } = renderHook(() =>
      useProjection(PROJECT.id, stores, liveStore, registry, profileStore, alarmStore, NOW_MS),
    );

    expect(result.current.componentVMs['cmp_a']).toBeDefined();
    expect(result.current.componentVMs['cmp_a']!.health).toBe(HealthState.Healthy);
  });

  it('projection reflects component removal after re-ingestion with smaller snapshot', () => {
    const ingestor    = createIngestor();
    const stores      = makeStores();
    const liveStore   = createInMemoryLiveStore();
    const profileStore = createInMemoryOperationalProfileStore();
    const alarmStore  = createInMemoryAlarmStore();
    const registry    = createComponentRegistry();
    registerBaseLibrary(registry);

    // First ingestion: two components
    ingestor.ingestGraph({ project: PROJECT, components: [COMP_A, COMP_B], connections: [] }, stores);

    const { result, rerender } = renderHook(() =>
      useProjection(PROJECT.id, stores, liveStore, registry, profileStore, alarmStore, NOW_MS),
    );
    expect(Object.keys(result.current.componentVMs)).toHaveLength(2);

    // Re-ingest with only one component
    ingestor.ingestGraph({ project: PROJECT, components: [COMP_A], connections: [] }, stores);
    rerender();

    expect(Object.keys(result.current.componentVMs)).toHaveLength(1);
    expect(result.current.componentVMs['cmp_a']).toBeDefined();
    expect(result.current.componentVMs['cmp_b']).toBeUndefined();
  });
});
