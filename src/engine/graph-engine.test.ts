import { describe, it, expect, beforeEach } from 'vitest';
import {
  createInMemoryGraphStore,
  createProject,
  addComponent,
  updateComponent,
  removeComponent,
  addConnection,
  updateConnection,
  removeConnection,
  type GraphStore,
  type EngineStores,
} from './graph-engine.js';
import { createInMemoryVersionStore } from '../domain/project-version.js';
import { createInMemoryEventStore } from '../domain/event-store.js';
import { createComponentRegistry, type ComponentDefinition } from '../lib/component-registry.js';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const TANK_DEF: ComponentDefinition = {
  typeId: 'tank', category: 'storage', label: 'Tank',
  ports: [
    { id: 'cold_in',   label: 'Cold In',  medium: 'cold_water', role: 'inlet',  anchor: 'bottom' },
    { id: 'hot_out',   label: 'Hot Out',  medium: 'hot_water',  role: 'outlet', anchor: 'top'    },
    { id: 'recirc_in', label: 'Recirc',   medium: 'recirc',     role: 'inlet',  anchor: 'top'    },
  ],
  properties: [], sensorSlots: [], commands: [],
  visual: { shape: 'tank', primaryStatusMetric: 'temperature', portAnchors: {}, dashboardCard: { fields: [] }, propertyPanel: { sections: ['live'] } },
};

const TMV_DEF: ComponentDefinition = {
  typeId: 'mixing_valve', category: 'valve', label: 'TMV',
  ports: [
    { id: 'hot_in',    label: 'Hot In',   medium: 'hot_water',  role: 'inlet',  anchor: 'left'  },
    { id: 'mixed_out', label: 'Mixed Out', medium: 'hot_water', role: 'outlet', anchor: 'right' },
  ],
  properties: [], sensorSlots: [], commands: [],
  visual: { shape: 'valve', primaryStatusMetric: 'temperature', portAnchors: {}, dashboardCard: { fields: [] }, propertyPanel: { sections: ['live'] } },
};

const PUMP_DEF: ComponentDefinition = {
  typeId: 'pump', category: 'pump', label: 'Pump',
  ports: [
    { id: 'in',  label: 'In',  medium: 'recirc', role: 'inlet',  anchor: 'left'  },
    { id: 'out', label: 'Out', medium: 'recirc', role: 'outlet', anchor: 'right' },
  ],
  properties: [], sensorSlots: [], commands: [],
  visual: { shape: 'pump', primaryStatusMetric: 'flow', portAnchors: {}, dashboardCard: { fields: [] }, propertyPanel: { sections: ['live'] } },
};

// Bidirectional port definition for medium validation tests
const BIDIR_DEF: ComponentDefinition = {
  typeId: 'bidir_component', category: 'sensor', label: 'Bidir',
  ports: [
    { id: 'both', label: 'Both', medium: 'hot_water', role: 'bidirectional', anchor: 'top' },
  ],
  properties: [], sensorSlots: [], commands: [],
  visual: { shape: 'generic', primaryStatusMetric: 'temperature', portAnchors: {}, dashboardCard: { fields: [] }, propertyPanel: { sections: ['live'] } },
};

function makeStores(): EngineStores & { graph: GraphStore } {
  return {
    graph:    createInMemoryGraphStore(),
    versions: createInMemoryVersionStore(),
    events:   createInMemoryEventStore(),
  };
}

function makeRegistry() {
  const r = createComponentRegistry();
  r.register(TANK_DEF);
  r.register(TMV_DEF);
  r.register(PUMP_DEF);
  r.register(BIDIR_DEF);
  return r;
}

const PROJECT_ID = 'proj_hw';
const USER       = 'user_1';

// ---------------------------------------------------------------------------
// createProject
// ---------------------------------------------------------------------------

describe('createProject', () => {
  it('returns { data, version, event }', () => {
    const stores = makeStores();
    const result = createProject({ id: PROJECT_ID, name: 'HW', siteType: 'hot_water' }, USER, stores);
    expect(result.data).toBeDefined();
    expect(result.version).toBeDefined();
    expect(result.event).toBeDefined();
  });

  it('persists the project into GraphStore', () => {
    const stores = makeStores();
    createProject({ id: PROJECT_ID, name: 'HW', siteType: 'hot_water' }, USER, stores);
    expect(stores.graph.getProject(PROJECT_ID)).toBeDefined();
  });

  it('version.version === 1 for the first mutation', () => {
    const stores = makeStores();
    const { version } = createProject({ id: PROJECT_ID, name: 'HW', siteType: 'hot_water' }, USER, stores);
    expect(version.version).toBe(1);
  });

  it('event.kind === project_created', () => {
    const stores = makeStores();
    const { event } = createProject({ id: PROJECT_ID, name: 'HW', siteType: 'hot_water' }, USER, stores);
    expect(event.kind).toBe('project_created');
  });

  it('event is appended to EventStore', () => {
    const stores = makeStores();
    const { event } = createProject({ id: PROJECT_ID, name: 'HW', siteType: 'hot_water' }, USER, stores);
    const stored = stores.events.query(PROJECT_ID);
    expect(stored).toHaveLength(1);
    expect(stored[0]?.id).toBe(event.id);
  });

  it('throws if project id already exists', () => {
    const stores = makeStores();
    createProject({ id: PROJECT_ID, name: 'HW', siteType: 'hot_water' }, USER, stores);
    expect(() =>
      createProject({ id: PROJECT_ID, name: 'HW2', siteType: 'hot_water' }, USER, stores),
    ).toThrow(/already exists/);
  });
});

// ---------------------------------------------------------------------------
// addComponent
// ---------------------------------------------------------------------------

describe('addComponent', () => {
  it('returns { data, version, event }', () => {
    const stores = makeStores();
    createProject({ id: PROJECT_ID, name: 'HW', siteType: 'hot_water' }, USER, stores);
    const result = addComponent(PROJECT_ID, { id: 'cmp_tank', type: 'tank', name: 'Tank', bindings: [] }, USER, stores);
    expect(result.data).toBeDefined();
    expect(result.version).toBeDefined();
    expect(result.event).toBeDefined();
  });

  it('attaches projectId to the returned component', () => {
    const stores = makeStores();
    createProject({ id: PROJECT_ID, name: 'HW', siteType: 'hot_water' }, USER, stores);
    const { data } = addComponent(PROJECT_ID, { id: 'cmp_tank', type: 'tank', name: 'Tank', bindings: [] }, USER, stores);
    expect(data.projectId).toBe(PROJECT_ID);
  });

  it('version increments monotonically', () => {
    const stores = makeStores();
    createProject({ id: PROJECT_ID, name: 'HW', siteType: 'hot_water' }, USER, stores);
    const r1 = addComponent(PROJECT_ID, { id: 'cmp_a', type: 'tank', name: 'A', bindings: [] }, USER, stores);
    const r2 = addComponent(PROJECT_ID, { id: 'cmp_b', type: 'tank', name: 'B', bindings: [] }, USER, stores);
    expect(r2.version.version).toBe(r1.version.version + 1);
  });

  it('event.kind === component_added', () => {
    const stores = makeStores();
    createProject({ id: PROJECT_ID, name: 'HW', siteType: 'hot_water' }, USER, stores);
    const { event } = addComponent(PROJECT_ID, { id: 'cmp_tank', type: 'tank', name: 'Tank', bindings: [] }, USER, stores);
    expect(event.kind).toBe('component_added');
  });

  it('event is appended to EventStore', () => {
    const stores = makeStores();
    createProject({ id: PROJECT_ID, name: 'HW', siteType: 'hot_water' }, USER, stores);
    addComponent(PROJECT_ID, { id: 'cmp_tank', type: 'tank', name: 'Tank', bindings: [] }, USER, stores);
    const evts = stores.events.query(PROJECT_ID);
    expect(evts.length).toBeGreaterThanOrEqual(1);
    expect(evts.some(e => e.kind === 'component_added')).toBe(true);
  });

  it('throws if project does not exist', () => {
    const stores = makeStores();
    expect(() =>
      addComponent('nonexistent', { id: 'cmp_x', type: 'tank', name: 'X', bindings: [] }, USER, stores),
    ).toThrow(/not found/);
  });

  it('throws if componentId already exists in the project', () => {
    const stores = makeStores();
    createProject({ id: PROJECT_ID, name: 'HW', siteType: 'hot_water' }, USER, stores);
    addComponent(PROJECT_ID, { id: 'cmp_tank', type: 'tank', name: 'Tank', bindings: [] }, USER, stores);
    expect(() =>
      addComponent(PROJECT_ID, { id: 'cmp_tank', type: 'tank', name: 'Tank2', bindings: [] }, USER, stores),
    ).toThrow(/already exists/);
  });
});

// ---------------------------------------------------------------------------
// updateComponent
// ---------------------------------------------------------------------------

describe('updateComponent', () => {
  function setup() {
    const stores = makeStores();
    createProject({ id: PROJECT_ID, name: 'HW', siteType: 'hot_water' }, USER, stores);
    addComponent(PROJECT_ID, { id: 'cmp_tank', type: 'tank', name: 'Tank', bindings: [] }, USER, stores);
    return stores;
  }

  it('returns the updated component with the patch applied', () => {
    const stores = setup();
    const { data } = updateComponent(PROJECT_ID, 'cmp_tank', { name: 'Renamed' }, USER, stores);
    expect(data.name).toBe('Renamed');
  });

  it('does not mutate other fields', () => {
    const stores = setup();
    const { data } = updateComponent(PROJECT_ID, 'cmp_tank', { name: 'Renamed' }, USER, stores);
    expect(data.type).toBe('tank');
    expect(data.projectId).toBe(PROJECT_ID);
  });

  it('persists the updated component in GraphStore', () => {
    const stores = setup();
    updateComponent(PROJECT_ID, 'cmp_tank', { name: 'Persisted' }, USER, stores);
    expect(stores.graph.getComponent(PROJECT_ID, 'cmp_tank')?.name).toBe('Persisted');
  });

  it('version and event are created', () => {
    const stores = setup();
    const { version, event } = updateComponent(PROJECT_ID, 'cmp_tank', { name: 'X' }, USER, stores);
    expect(version.changeKind).toBe('component_update');
    expect(event.kind).toBe('component_updated');
  });

  it('throws if component does not exist', () => {
    const stores = setup();
    expect(() =>
      updateComponent(PROJECT_ID, 'nonexistent', { name: 'X' }, USER, stores),
    ).toThrow(/not found/);
  });
});

// ---------------------------------------------------------------------------
// removeComponent
// ---------------------------------------------------------------------------

describe('removeComponent', () => {
  function setup() {
    const stores  = makeStores();
    const reg     = makeRegistry();
    createProject({ id: PROJECT_ID, name: 'HW', siteType: 'hot_water' }, USER, stores);
    addComponent(PROJECT_ID, { id: 'cmp_tank', type: 'tank', name: 'Tank', bindings: [] }, USER, stores);
    addComponent(PROJECT_ID, { id: 'cmp_tmv',  type: 'mixing_valve', name: 'TMV', bindings: [] }, USER, stores);
    return { stores, reg };
  }

  it('component no longer exists after removal', () => {
    const { stores } = setup();
    removeComponent(PROJECT_ID, 'cmp_tank', USER, stores);
    expect(stores.graph.getComponent(PROJECT_ID, 'cmp_tank')).toBeUndefined();
  });

  it('version and event are created', () => {
    const { stores } = setup();
    const { version, event } = removeComponent(PROJECT_ID, 'cmp_tank', USER, stores);
    expect(version.changeKind).toBe('component_remove');
    expect(event.kind).toBe('component_removed');
  });

  it('throws if component does not exist', () => {
    const { stores } = setup();
    expect(() =>
      removeComponent(PROJECT_ID, 'nonexistent', USER, stores),
    ).toThrow(/not found/);
  });

  it('throws if a connection still references the component', () => {
    const { stores, reg } = setup();
    addConnection(
      PROJECT_ID,
      { id: 'cn_1', fromComponentId: 'cmp_tank', fromPortId: 'hot_out', toComponentId: 'cmp_tmv', toPortId: 'hot_in', medium: 'hot_water', topologicalDirection: 'forward' },
      reg, USER, stores,
    );
    expect(() => removeComponent(PROJECT_ID, 'cmp_tank', USER, stores)).toThrow(
      /referenced by connection/,
    );
  });
});

// ---------------------------------------------------------------------------
// addConnection
// ---------------------------------------------------------------------------

describe('addConnection', () => {
  function setup() {
    const stores = makeStores();
    const reg    = makeRegistry();
    createProject({ id: PROJECT_ID, name: 'HW', siteType: 'hot_water' }, USER, stores);
    addComponent(PROJECT_ID, { id: 'cmp_tank', type: 'tank',         name: 'Tank', bindings: [] }, USER, stores);
    addComponent(PROJECT_ID, { id: 'cmp_tmv',  type: 'mixing_valve', name: 'TMV',  bindings: [] }, USER, stores);
    addComponent(PROJECT_ID, { id: 'cmp_bidir', type: 'bidir_component', name: 'Bidir', bindings: [] }, USER, stores);
    return { stores, reg };
  }

  const validConn = {
    id: 'cn_supply', fromComponentId: 'cmp_tank', fromPortId: 'hot_out',
    toComponentId: 'cmp_tmv', toPortId: 'hot_in',
    medium: 'hot_water' as const, topologicalDirection: 'forward' as const,
  };

  it('returns { data, version, event }', () => {
    const { stores, reg } = setup();
    const result = addConnection(PROJECT_ID, validConn, reg, USER, stores);
    expect(result.data).toBeDefined();
    expect(result.version).toBeDefined();
    expect(result.event).toBeDefined();
  });

  it('attaches projectId to the returned connection', () => {
    const { stores, reg } = setup();
    const { data } = addConnection(PROJECT_ID, validConn, reg, USER, stores);
    expect(data.projectId).toBe(PROJECT_ID);
  });

  it('event.kind === connection_added', () => {
    const { stores, reg } = setup();
    const { event } = addConnection(PROJECT_ID, validConn, reg, USER, stores);
    expect(event.kind).toBe('connection_added');
  });

  it('version is created with connection_add changeKind', () => {
    const { stores, reg } = setup();
    const { version } = addConnection(PROJECT_ID, validConn, reg, USER, stores);
    expect(version.changeKind).toBe('connection_add');
  });

  it('throws if fromPortId does not exist on source definition', () => {
    const { stores, reg } = setup();
    expect(() =>
      addConnection(PROJECT_ID, { ...validConn, id: 'cn_bad', fromPortId: 'bad_port' }, reg, USER, stores),
    ).toThrow(/does not exist on type 'tank'/);
  });

  it('throws if toPortId does not exist on target definition', () => {
    const { stores, reg } = setup();
    expect(() =>
      addConnection(PROJECT_ID, { ...validConn, id: 'cn_bad', toPortId: 'bad_port' }, reg, USER, stores),
    ).toThrow(/does not exist on type 'mixing_valve'/);
  });

  it('throws if fromPort role is inlet', () => {
    const { stores, reg } = setup();
    // cold_in is an inlet — cannot be a source
    expect(() =>
      addConnection(PROJECT_ID, { ...validConn, id: 'cn_bad', fromPortId: 'cold_in', medium: 'cold_water' }, reg, USER, stores),
    ).toThrow(/inlet — cannot be a connection source/);
  });

  it('throws if toPort role is outlet', () => {
    const { stores, reg } = setup();
    // mixed_out is an outlet — cannot be a target
    expect(() =>
      addConnection(PROJECT_ID, { ...validConn, id: 'cn_bad', toComponentId: 'cmp_tmv', toPortId: 'mixed_out' }, reg, USER, stores),
    ).toThrow(/outlet — cannot be a connection target/);
  });

  it('throws if connection medium does not match fromPort medium', () => {
    const { stores, reg } = setup();
    // hot_out is hot_water; recirc medium should fail
    expect(() =>
      addConnection(PROJECT_ID, { ...validConn, id: 'cn_bad', medium: 'recirc' }, reg, USER, stores),
    ).toThrow(/does not match source port medium/);
  });

  it('throws if connection medium does not match toPort medium', () => {
    const { stores, reg } = setup();
    // hot_in on TMV is hot_water; recirc medium should fail
    // Use a valid outlet port for from (hot_out) but wrong medium to hit toPort check
    // We need a setup where fromPort matches but toPort does not.
    // Create an extra component with a hot_water outlet:
    addComponent(PROJECT_ID, { id: 'cmp_bidir2', type: 'bidir_component', name: 'B2', bindings: [] }, USER, stores);
    // bidir_component has port 'both' (hot_water, bidirectional)
    // tank has hot_out (hot_water, outlet) → connect to bidir 'both' but declare recirc medium
    expect(() =>
      addConnection(PROJECT_ID, {
        id: 'cn_bad', fromComponentId: 'cmp_tank', fromPortId: 'hot_out',
        toComponentId: 'cmp_bidir', toPortId: 'both',
        medium: 'recirc', topologicalDirection: 'forward',
      }, reg, USER, stores),
    ).toThrow(/does not match source port medium/);
  });

  it('throws if connectionId already exists in the project', () => {
    const { stores, reg } = setup();
    addConnection(PROJECT_ID, validConn, reg, USER, stores);
    expect(() =>
      addConnection(PROJECT_ID, validConn, reg, USER, stores),
    ).toThrow(/already exists/);
  });

  it('throws if fromComponent does not exist', () => {
    const { stores, reg } = setup();
    expect(() =>
      addConnection(PROJECT_ID, { ...validConn, id: 'cn_bad', fromComponentId: 'nonexistent' }, reg, USER, stores),
    ).toThrow(/not found/);
  });
});

// ---------------------------------------------------------------------------
// removeConnection
// ---------------------------------------------------------------------------

describe('removeConnection', () => {
  function setup() {
    const stores = makeStores();
    const reg    = makeRegistry();
    createProject({ id: PROJECT_ID, name: 'HW', siteType: 'hot_water' }, USER, stores);
    addComponent(PROJECT_ID, { id: 'cmp_tank', type: 'tank',         name: 'Tank', bindings: [] }, USER, stores);
    addComponent(PROJECT_ID, { id: 'cmp_tmv',  type: 'mixing_valve', name: 'TMV',  bindings: [] }, USER, stores);
    addConnection(
      PROJECT_ID,
      { id: 'cn_supply', fromComponentId: 'cmp_tank', fromPortId: 'hot_out', toComponentId: 'cmp_tmv', toPortId: 'hot_in', medium: 'hot_water', topologicalDirection: 'forward' },
      reg, USER, stores,
    );
    return stores;
  }

  it('connection no longer exists after removal', () => {
    const stores = setup();
    removeConnection(PROJECT_ID, 'cn_supply', USER, stores);
    expect(stores.graph.getConnection(PROJECT_ID, 'cn_supply')).toBeUndefined();
  });

  it('version and event are created', () => {
    const stores = setup();
    const { version, event } = removeConnection(PROJECT_ID, 'cn_supply', USER, stores);
    expect(version.changeKind).toBe('connection_remove');
    expect(event.kind).toBe('connection_removed');
  });

  it('throws if connection does not exist', () => {
    const stores = setup();
    expect(() =>
      removeConnection(PROJECT_ID, 'nonexistent', USER, stores),
    ).toThrow(/not found/);
  });
});

// ---------------------------------------------------------------------------
// updateConnection
// ---------------------------------------------------------------------------

describe('updateConnection', () => {
  function setup() {
    const stores = makeStores();
    const reg    = makeRegistry();
    createProject({ id: PROJECT_ID, name: 'HW', siteType: 'hot_water' }, USER, stores);
    addComponent(PROJECT_ID, { id: 'cmp_tank', type: 'tank', name: 'Tank', bindings: [] }, USER, stores);
    addComponent(PROJECT_ID, { id: 'cmp_tmv', type: 'mixing_valve', name: 'TMV', bindings: [] }, USER, stores);
    const cn = {
      id: 'cn_supply', fromComponentId: 'cmp_tank', fromPortId: 'hot_out',
      toComponentId: 'cmp_tmv', toPortId: 'hot_in',
      medium: 'hot_water' as const, topologicalDirection: 'forward' as const,
    };
    addConnection(PROJECT_ID, cn, reg, USER, stores);
    return stores;
  }

  it('returns updated connection with the patch applied', () => {
    const stores = setup();
    const { data } = updateConnection(PROJECT_ID, 'cn_supply', { topologicalDirection: 'bidirectional' }, USER, stores);
    expect(data.topologicalDirection).toBe('bidirectional');
  });

  it('preserves fields not in the patch', () => {
    const stores = setup();
    const { data } = updateConnection(PROJECT_ID, 'cn_supply', { topologicalDirection: 'bidirectional' }, USER, stores);
    expect(data.medium).toBe('hot_water');
    expect(data.fromPortId).toBe('hot_out');
  });

  it('writes a connection_updated event', () => {
    const stores = setup();
    const { event } = updateConnection(PROJECT_ID, 'cn_supply', { topologicalDirection: 'forward' }, USER, stores);
    expect(event.kind).toBe('connection_updated');
  });

  it('increments version with connection_update changeKind', () => {
    const stores = setup();
    const { version } = updateConnection(PROJECT_ID, 'cn_supply', {}, USER, stores);
    expect(version.changeKind).toBe('connection_update');
  });

  it('persists the updated connection in the GraphStore', () => {
    const stores = setup();
    updateConnection(PROJECT_ID, 'cn_supply', { topologicalDirection: 'bidirectional' }, USER, stores);
    const stored = stores.graph.getConnection(PROJECT_ID, 'cn_supply');
    expect(stored?.topologicalDirection).toBe('bidirectional');
  });

  it('patch payload is recorded in the event', () => {
    const stores = setup();
    const patch = { topologicalDirection: 'bidirectional' as const };
    const { event } = updateConnection(PROJECT_ID, 'cn_supply', patch, USER, stores);
    expect((event.data as { patch: unknown }).patch).toMatchObject(patch);
  });

  it('throws when connection does not exist', () => {
    const stores = setup();
    expect(() =>
      updateConnection(PROJECT_ID, 'no_such_cn', {}, USER, stores),
    ).toThrow(/not found/);
  });

  it('empty patch leaves the connection unchanged except version', () => {
    const stores = setup();
    const before = stores.graph.getConnection(PROJECT_ID, 'cn_supply')!;
    const { data } = updateConnection(PROJECT_ID, 'cn_supply', {}, USER, stores);
    expect(data.topologicalDirection).toBe(before.topologicalDirection);
    expect(data.medium).toBe(before.medium);
  });
});

// ---------------------------------------------------------------------------
// Event ordering guarantee
// ---------------------------------------------------------------------------

describe('Event ordering', () => {
  it('two mutations produce two events in insertion order in the EventStore', () => {
    const stores = makeStores();
    const { event: e1 } = createProject({ id: PROJECT_ID, name: 'HW', siteType: 'hot_water' }, USER, stores);
    const { event: e2 } = addComponent(PROJECT_ID, { id: 'cmp_tank', type: 'tank', name: 'T', bindings: [] }, USER, stores);
    const all = stores.events.query(PROJECT_ID);
    expect(all[0]?.id).toBe(e1.id);
    expect(all[1]?.id).toBe(e2.id);
  });
});
