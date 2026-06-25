import { describe, it, expect, beforeEach } from 'vitest';
import { buildHotWaterSeed, HOT_WATER_PROJECT_ID } from './hot-water.seed.js';
import { createInMemoryGraphStore, createProject, type EngineStores } from '../engine/graph-engine.js';
import { createInMemoryVersionStore } from '../domain/project-version.js';
import { createInMemoryEventStore } from '../domain/event-store.js';
import { createComponentRegistry } from '../lib/component-registry.js';
import { registerBaseLibrary } from '../lib/component-library.js';
import { GAS_BACKUP   } from '../lib/definitions/gas-backup.def.js';
import { POINT_OF_USE } from '../lib/definitions/point-of-use.def.js';

const EXPECTED_COMPONENTS  = ['cmp_tank', 'cmp_heatpump', 'cmp_gas_backup', 'cmp_recirc_pump', 'cmp_tmv', 'cmp_shower'];
const EXPECTED_CONNECTIONS = ['cn_supply', 'cn_tmv_use', 'cn_return', 'cn_return_to_tank', 'cn_hp_tank', 'cn_gas_tank'];

function makeStoresAndRegistry(): { stores: EngineStores; registry: ReturnType<typeof createComponentRegistry> } {
  const stores = {
    graph:    createInMemoryGraphStore(),
    versions: createInMemoryVersionStore(),
    events:   createInMemoryEventStore(),
  };
  const registry = createComponentRegistry();
  registerBaseLibrary(registry);
  registry.register(GAS_BACKUP);
  registry.register(POINT_OF_USE);
  return { stores, registry };
}

describe('Hot Water Conformance Seed', () => {
  let stores: EngineStores;
  let registry: ReturnType<typeof createComponentRegistry>;

  beforeEach(() => {
    ({ stores, registry } = makeStoresAndRegistry());
  });

  // -------------------------------------------------------------------------
  // Expressibility — the system can be built without errors
  // -------------------------------------------------------------------------

  it('buildHotWaterSeed() completes without throwing', () => {
    expect(() => buildHotWaterSeed(stores, registry)).not.toThrow();
  });

  it('returns the expected component and connection ids', () => {
    const result = buildHotWaterSeed(stores, registry);
    expect(result.componentIds.sort()).toEqual(EXPECTED_COMPONENTS.sort());
    expect(result.connectionIds.sort()).toEqual(EXPECTED_CONNECTIONS.sort());
  });

  // -------------------------------------------------------------------------
  // Graph completeness — all nodes and edges are in GraphStore
  // -------------------------------------------------------------------------

  it('all 6 components exist in GraphStore after build', () => {
    buildHotWaterSeed(stores, registry);
    const components = stores.graph.getComponents(HOT_WATER_PROJECT_ID);
    expect(components).toHaveLength(6);
    const ids = components.map(c => c.id).sort();
    expect(ids).toEqual(EXPECTED_COMPONENTS.sort());
  });

  it('all 6 connections exist in GraphStore after build', () => {
    buildHotWaterSeed(stores, registry);
    const connections = stores.graph.getConnections(HOT_WATER_PROJECT_ID);
    expect(connections).toHaveLength(6);
    const ids = connections.map(c => c.id).sort();
    expect(ids).toEqual(EXPECTED_CONNECTIONS.sort());
  });

  it('every component has projectId === HOT_WATER_PROJECT_ID', () => {
    buildHotWaterSeed(stores, registry);
    const components = stores.graph.getComponents(HOT_WATER_PROJECT_ID);
    expect(components.every(c => c.projectId === HOT_WATER_PROJECT_ID)).toBe(true);
  });

  it('every connection has projectId === HOT_WATER_PROJECT_ID', () => {
    buildHotWaterSeed(stores, registry);
    const connections = stores.graph.getConnections(HOT_WATER_PROJECT_ID);
    expect(connections.every(c => c.projectId === HOT_WATER_PROJECT_ID)).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Port + medium validation passed — proven by addConnection not throwing
  // -------------------------------------------------------------------------

  it('cn_supply uses hot_water medium with valid ports', () => {
    buildHotWaterSeed(stores, registry);
    const cn = stores.graph.getConnection(HOT_WATER_PROJECT_ID, 'cn_supply');
    expect(cn?.medium).toBe('hot_water');
    expect(cn?.fromPortId).toBe('hot_out');
    expect(cn?.toPortId).toBe('hot_in');
  });

  it('cn_return uses recirc medium with valid ports', () => {
    buildHotWaterSeed(stores, registry);
    const cn = stores.graph.getConnection(HOT_WATER_PROJECT_ID, 'cn_return');
    expect(cn?.medium).toBe('recirc');
    expect(cn?.fromPortId).toBe('drain_out');
    expect(cn?.toPortId).toBe('in');
  });

  it('cn_hp_tank connects to heat_in_1 (not a project-specific port name)', () => {
    buildHotWaterSeed(stores, registry);
    const cn = stores.graph.getConnection(HOT_WATER_PROJECT_ID, 'cn_hp_tank');
    expect(cn?.toPortId).toBe('heat_in_1');
  });

  it('cn_gas_tank connects to heat_in_2', () => {
    buildHotWaterSeed(stores, registry);
    const cn = stores.graph.getConnection(HOT_WATER_PROJECT_ID, 'cn_gas_tank');
    expect(cn?.toPortId).toBe('heat_in_2');
  });

  // -------------------------------------------------------------------------
  // Art. 13 — event capture
  // -------------------------------------------------------------------------

  it('EventStore contains an event for every mutation (1 project + 6 components + 6 connections)', () => {
    buildHotWaterSeed(stores, registry);
    const events = stores.events.query(HOT_WATER_PROJECT_ID);
    expect(events).toHaveLength(13); // 1 + 6 + 6
  });

  it('EventStore has 6 component_added events', () => {
    buildHotWaterSeed(stores, registry);
    const events = stores.events.queryByKind(HOT_WATER_PROJECT_ID, 'component_added');
    expect(events).toHaveLength(6);
  });

  it('EventStore has 6 connection_added events', () => {
    buildHotWaterSeed(stores, registry);
    const events = stores.events.queryByKind(HOT_WATER_PROJECT_ID, 'connection_added');
    expect(events).toHaveLength(6);
  });

  // -------------------------------------------------------------------------
  // M10 — versioning
  // -------------------------------------------------------------------------

  it('VersionStore.current equals total mutation count (13)', () => {
    const result = buildHotWaterSeed(stores, registry);
    expect(result.totalMutations).toBe(13);
    expect(stores.versions.current(HOT_WATER_PROJECT_ID)).toBe(13);
  });

  // -------------------------------------------------------------------------
  // Art. 14 — zero core changes needed to express the system
  // (Proven structurally: the seed uses only the Graph Engine API and
  // ComponentDefinitions. No engine file was modified to support this seed.)
  // -------------------------------------------------------------------------

  it('all component types are resolved from registry (no hard-coded engine knowledge)', () => {
    buildHotWaterSeed(stores, registry);
    const types = stores.graph
      .getComponents(HOT_WATER_PROJECT_ID)
      .map(c => c.type)
      .sort();
    const registeredTypes = registry.listAll().map(d => d.typeId).sort();
    // Every type in the graph must be registered — the engine never hard-codes types
    expect(types.every(t => registeredTypes.includes(t))).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Isolation — seed does not affect a separate project
  // -------------------------------------------------------------------------

  it('building the seed twice in separate stores produces identical graphs', () => {
    const { stores: stores2, registry: reg2 } = makeStoresAndRegistry();
    buildHotWaterSeed(stores, registry);
    buildHotWaterSeed(stores2, reg2);

    const ids1 = stores.graph.getComponents(HOT_WATER_PROJECT_ID).map(c => c.id).sort();
    const ids2 = stores2.graph.getComponents(HOT_WATER_PROJECT_ID).map(c => c.id).sort();
    expect(ids1).toEqual(ids2);
  });
});
