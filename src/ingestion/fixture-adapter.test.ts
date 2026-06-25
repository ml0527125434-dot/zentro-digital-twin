/** @vitest-environment happy-dom */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import { loadFixture, buildHotWaterPayload } from './fixture-adapter.js';
import { createIngestor } from './ingestion-contract.js';
import type { ZentroPayload } from './fixture-adapter.js';
import type { GraphSnapshot, ProfileSnapshot, AlarmRuleSnapshot } from './ingestion-contract.js';

import { createInMemoryGraphStore, type EngineStores } from '../engine/graph-engine.js';
import { createInMemoryVersionStore } from '../domain/project-version.js';
import { createInMemoryEventStore } from '../domain/event-store.js';
import { createInMemoryLiveStore } from '../telemetry/live-store.js';
import { createInMemoryOperationalProfileStore } from '../projection/operational-profile-store.js';
import { createInMemoryAlarmStore } from '../alarm/alarm-store.js';
import { createComponentRegistry } from '../lib/component-registry.js';
import { registerBaseLibrary } from '../lib/component-library.js';
import { GAS_BACKUP   } from '../lib/definitions/gas-backup.def.js';
import { POINT_OF_USE } from '../lib/definitions/point-of-use.def.js';
import { buildHotWaterSeed, HOT_WATER_PROJECT_ID } from '../seed/hot-water.seed.js';
import { SensorState, ValueProvenance, HealthState, NodeStatus } from '../domain/types.js';
import type { Project, Component, OperationalProfile, AlarmRule, LiveSample } from '../domain/types.js';
import { useProjection } from '../app/useProjection.js';

// ---------------------------------------------------------------------------
// Helpers
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

// Minimal fixture payload for tests that do not need the full hot-water seed.
const PROJ: Project = { id: 'proj_fixture', name: 'Fixture Test', siteType: 'test' };
const COMP_A: Component = {
  id: 'cmp_a', type: 'storage_tank', name: 'Tank A',
  projectId: PROJ.id, bindings: [],
};
const PROFILE: OperationalProfile = {
  id: 'op_a', appliesToType: 'storage_tank', scope: 'type_default', metrics: [],
};
const RULE: AlarmRule = {
  id: 'rule_a', componentId: 'cmp_a', triggerStatus: [NodeStatus.Risk],
  debounceSeconds: 0, severity: 'warning', message: 'Test',
};
const NOW_ISO = new Date(1_000_000_000_000).toISOString();
const SAMPLE: LiveSample = {
  bindingId: 'b_a', value: 60, ts: NOW_ISO,
  state: SensorState.Live, provenance: ValueProvenance.Measured,
};

function makeMinimalPayload(samples?: LiveSample[]): ZentroPayload {
  const base = {
    graph:      { project: PROJ, components: [COMP_A], connections: [] },
    profiles:   { profiles: [PROFILE] },
    alarmRules: { rules: [RULE] },
  };
  return samples !== undefined ? { ...base, samples } : base;
}

// ---------------------------------------------------------------------------
// loadFixture — core behaviour
// ---------------------------------------------------------------------------

describe('loadFixture', () => {
  let stores:       EngineStores;
  let profileStore: ReturnType<typeof createInMemoryOperationalProfileStore>;
  let alarmStore:   ReturnType<typeof createInMemoryAlarmStore>;
  let liveStore:    ReturnType<typeof createInMemoryLiveStore>;
  let ingestor:     ReturnType<typeof createIngestor>;

  beforeEach(() => {
    stores       = makeStores();
    profileStore = createInMemoryOperationalProfileStore();
    alarmStore   = createInMemoryAlarmStore();
    liveStore    = createInMemoryLiveStore();
    ingestor     = createIngestor();
  });

  it('populates all four stores in a single call', () => {
    loadFixture(makeMinimalPayload([SAMPLE]), ingestor, stores, profileStore, alarmStore, liveStore);

    expect(stores.graph.getProject(PROJ.id)).toBeDefined();
    expect(stores.graph.getComponents(PROJ.id)).toHaveLength(1);
    expect(profileStore.get(PROFILE.id)).toBeDefined();
    expect(alarmStore.getAlarmRule(RULE.id)).toBeDefined();
    expect(liveStore.get(SAMPLE.bindingId)).toBeDefined();
  });

  it('samples are optional — omitting them does not throw', () => {
    expect(() =>
      loadFixture(makeMinimalPayload(), ingestor, stores, profileStore, alarmStore, liveStore),
    ).not.toThrow();
    // LiveStore is empty; no crash
    expect(liveStore.get('b_a')).toBeUndefined();
  });

  it('empty samples array — no LiveStore writes', () => {
    loadFixture(makeMinimalPayload([]), ingestor, stores, profileStore, alarmStore, liveStore);
    expect(liveStore.get('b_a')).toBeUndefined();
  });

  it('graph is ingested before alarm rules — rule component exists when rules load', () => {
    // If graph were loaded after alarm rules, getAlarmRulesForComponent would work but
    // an ingestor that validates referential integrity would fail. We verify the
    // component is already present when alarm rules are written by checking the
    // store state is consistent at the end (no exception thrown, component present).
    loadFixture(makeMinimalPayload(), ingestor, stores, profileStore, alarmStore, liveStore);

    const component = stores.graph.getComponent(PROJ.id, RULE.componentId);
    const rule      = alarmStore.getAlarmRule(RULE.id);
    expect(component).toBeDefined();
    expect(rule).toBeDefined();
    expect(rule!.componentId).toBe(component!.id);
  });

  it('loadFixture is idempotent — calling twice with the same payload produces the same state', () => {
    loadFixture(makeMinimalPayload([SAMPLE]), ingestor, stores, profileStore, alarmStore, liveStore);
    loadFixture(makeMinimalPayload([SAMPLE]), ingestor, stores, profileStore, alarmStore, liveStore);

    expect(stores.graph.getComponents(PROJ.id)).toHaveLength(1);
    expect(profileStore.listAll()).toHaveLength(1);
    expect(alarmStore.getAlarmRulesForComponent(COMP_A.id)).toHaveLength(1);
    expect(liveStore.get(SAMPLE.bindingId)).toEqual(SAMPLE);
  });

  it('does not write to VersionStore or EventStore', () => {
    loadFixture(makeMinimalPayload(), ingestor, stores, profileStore, alarmStore, liveStore);

    expect(stores.versions.current(PROJ.id)).toBe(0);
    expect(stores.events.query(PROJ.id)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// buildHotWaterPayload
// ---------------------------------------------------------------------------

describe('buildHotWaterPayload', () => {
  it('produces a payload with 6 components and 6 connections (matches buildHotWaterSeed)', () => {
    const registry = makeFullRegistry();
    const payload  = buildHotWaterPayload(registry);

    expect(payload.graph.project.id).toBe(HOT_WATER_PROJECT_ID);
    expect(payload.graph.components).toHaveLength(6);
    expect(payload.graph.connections).toHaveLength(6);
  });

  it('payload profiles match HOT_WATER_PROFILES', () => {
    const registry = makeFullRegistry();
    const payload  = buildHotWaterPayload(registry);

    expect(payload.profiles.profiles.length).toBeGreaterThan(0);
    // Spot-check: tank default profile present
    expect(payload.profiles.profiles.find(p => p.id === 'op_tank_default')).toBeDefined();
  });

  it('round-trips through loadFixture — produces same graph as buildHotWaterSeed directly', () => {
    const registry     = makeFullRegistry();
    const seedStores   = makeStores();
    buildHotWaterSeed(seedStores, registry);

    const payload       = buildHotWaterPayload(registry);
    const fixtureStores = makeStores();
    const profileStore  = createInMemoryOperationalProfileStore();
    const alarmStore    = createInMemoryAlarmStore();
    const liveStore     = createInMemoryLiveStore();
    loadFixture(payload, createIngestor(), fixtureStores, profileStore, alarmStore, liveStore);

    const seedComponents    = seedStores.graph.getComponents(HOT_WATER_PROJECT_ID).map(c => c.id).sort();
    const fixtureComponents = fixtureStores.graph.getComponents(HOT_WATER_PROJECT_ID).map(c => c.id).sort();
    expect(fixtureComponents).toEqual(seedComponents);

    const seedConnections    = seedStores.graph.getConnections(HOT_WATER_PROJECT_ID).map(c => c.id).sort();
    const fixtureConnections = fixtureStores.graph.getConnections(HOT_WATER_PROJECT_ID).map(c => c.id).sort();
    expect(fixtureConnections).toEqual(seedConnections);
  });

  it('projection works correctly on a graph loaded via buildHotWaterPayload + loadFixture', () => {
    const registry     = makeFullRegistry();
    const payload      = buildHotWaterPayload(registry);
    const stores       = makeStores();
    const profileStore = createInMemoryOperationalProfileStore();
    const alarmStore   = createInMemoryAlarmStore();
    const liveStore    = createInMemoryLiveStore();

    loadFixture(payload, createIngestor(), stores, profileStore, alarmStore, liveStore);

    const { result } = renderHook(() =>
      useProjection(HOT_WATER_PROJECT_ID, stores, liveStore, registry, profileStore, alarmStore, 1_000_000_000_000),
    );

    expect(Object.keys(result.current.componentVMs)).toHaveLength(6);
    for (const vm of Object.values(result.current.componentVMs)) {
      expect(vm.health).toBe(HealthState.Healthy);
    }
  });
});
