import { describe, it, expect, beforeEach } from 'vitest';
import {
  placeComponent, moveComponent, renameComponent,
  deleteComponent, connectPorts, disconnectPorts,
} from './builder-actions.js';
import { createInMemoryGraphStore, createProject, type EngineStores } from '../engine/graph-engine.js';
import { createInMemoryVersionStore } from '../domain/project-version.js';
import { createInMemoryEventStore } from '../domain/event-store.js';
import { createComponentRegistry } from '../lib/component-registry.js';
import { registerBaseLibrary } from '../lib/component-library.js';

const PID  = 'proj_1';
const USER = 'test_user';

function makeStores(): EngineStores {
  return {
    graph:    createInMemoryGraphStore(),
    versions: createInMemoryVersionStore(),
    events:   createInMemoryEventStore(),
  };
}

function makeRegistry() {
  const r = createComponentRegistry();
  registerBaseLibrary(r);
  return r;
}

let stores:   EngineStores;
let registry: ReturnType<typeof makeRegistry>;

beforeEach(() => {
  stores   = makeStores();
  registry = makeRegistry();
  createProject({ id: PID, name: 'Test Project', siteType: 'test' }, USER, stores);
});

// ---------------------------------------------------------------------------
// placeComponent
// ---------------------------------------------------------------------------

describe('placeComponent', () => {
  it('creates a component with the given type', () => {
    const { data } = placeComponent(PID, 'storage_tank', 'Tank A', { x: 100, y: 200 }, stores, registry, USER);
    expect(data.type).toBe('storage_tank');
    expect(data.name).toBe('Tank A');
  });

  it('stores position on the component', () => {
    const { data } = placeComponent(PID, 'heat_pump', 'HP', { x: 50, y: 75 }, stores, registry, USER);
    expect(data.position).toEqual({ x: 50, y: 75 });
  });

  it('increments version and writes an event', () => {
    const { version, event } = placeComponent(PID, 'recirc_pump', 'RP', { x: 0, y: 0 }, stores, registry, USER);
    expect(version.version).toBeGreaterThan(1); // project_created = 1
    expect(event.kind).toBe('component_added');
  });

  it('assigns projectId to the component', () => {
    const { data } = placeComponent(PID, 'mixing_valve', 'TMV', { x: 0, y: 0 }, stores, registry, USER);
    expect(data.projectId).toBe(PID);
  });

  it('throws when typeId is not registered', () => {
    expect(() =>
      placeComponent(PID, 'unknown_type', 'X', { x: 0, y: 0 }, stores, registry, USER),
    ).toThrow();
  });

  it('component appears in GraphStore', () => {
    const { data } = placeComponent(PID, 'storage_tank', 'Tank', { x: 0, y: 0 }, stores, registry, USER);
    expect(stores.graph.getComponent(PID, data.id)).toBeDefined();
  });

  it('two placed components get unique ids', () => {
    const a = placeComponent(PID, 'heat_pump', 'A', { x: 0, y: 0 }, stores, registry, USER);
    const b = placeComponent(PID, 'heat_pump', 'B', { x: 0, y: 0 }, stores, registry, USER);
    expect(a.data.id).not.toBe(b.data.id);
  });
});

// ---------------------------------------------------------------------------
// moveComponent
// ---------------------------------------------------------------------------

describe('moveComponent', () => {
  it('updates only the position', () => {
    const { data: placed } = placeComponent(PID, 'storage_tank', 'Tank', { x: 0, y: 0 }, stores, registry, USER);
    const { data } = moveComponent(PID, placed.id, { x: 300, y: 400 }, stores, USER);
    expect(data.position).toEqual({ x: 300, y: 400 });
    expect(data.name).toBe('Tank'); // unchanged
  });

  it('writes a component_updated event', () => {
    const { data: placed } = placeComponent(PID, 'storage_tank', 'T', { x: 0, y: 0 }, stores, registry, USER);
    const { event } = moveComponent(PID, placed.id, { x: 1, y: 1 }, stores, USER);
    expect(event.kind).toBe('component_updated');
  });
});

// ---------------------------------------------------------------------------
// renameComponent
// ---------------------------------------------------------------------------

describe('renameComponent', () => {
  it('updates only the name', () => {
    const { data: placed } = placeComponent(PID, 'heat_pump', 'Old Name', { x: 0, y: 0 }, stores, registry, USER);
    const { data } = renameComponent(PID, placed.id, 'New Name', stores, USER);
    expect(data.name).toBe('New Name');
    expect(data.type).toBe('heat_pump');
  });

  it('throws when name is empty', () => {
    const { data: placed } = placeComponent(PID, 'heat_pump', 'HP', { x: 0, y: 0 }, stores, registry, USER);
    expect(() => renameComponent(PID, placed.id, '   ', stores, USER)).toThrow(/empty/);
  });
});

// ---------------------------------------------------------------------------
// deleteComponent
// ---------------------------------------------------------------------------

describe('deleteComponent', () => {
  it('removes component from GraphStore', () => {
    const { data: placed } = placeComponent(PID, 'mixing_valve', 'TMV', { x: 0, y: 0 }, stores, registry, USER);
    deleteComponent(PID, placed.id, stores, USER);
    expect(stores.graph.getComponent(PID, placed.id)).toBeUndefined();
  });

  it('writes a component_removed event', () => {
    const { data: placed } = placeComponent(PID, 'mixing_valve', 'TMV', { x: 0, y: 0 }, stores, registry, USER);
    const { event } = deleteComponent(PID, placed.id, stores, USER);
    expect(event.kind).toBe('component_removed');
  });

  it('engine blocks deletion when connection still references component', () => {
    const { data: tank } = placeComponent(PID, 'storage_tank', 'Tank', { x: 0, y: 0 }, stores, registry, USER);
    const { data: valve } = placeComponent(PID, 'mixing_valve', 'TMV', { x: 200, y: 0 }, stores, registry, USER);
    connectPorts(PID,
      { componentId: tank.id,  portId: 'hot_out' },
      { componentId: valve.id, portId: 'hot_in' },
      'hot_water', 'forward', stores, registry, USER,
    );
    expect(() => deleteComponent(PID, tank.id, stores, USER)).toThrow(/connection/i);
  });
});

// ---------------------------------------------------------------------------
// connectPorts / disconnectPorts
// ---------------------------------------------------------------------------

describe('connectPorts', () => {
  it('creates a connection between two valid ports', () => {
    const { data: tank  } = placeComponent(PID, 'storage_tank', 'Tank',  { x: 0, y: 0 }, stores, registry, USER);
    const { data: valve } = placeComponent(PID, 'mixing_valve', 'Valve', { x: 200, y: 0 }, stores, registry, USER);
    const { data: cn } = connectPorts(
      PID,
      { componentId: tank.id,  portId: 'hot_out' },
      { componentId: valve.id, portId: 'hot_in' },
      'hot_water', 'forward', stores, registry, USER,
    );
    expect(cn.fromComponentId).toBe(tank.id);
    expect(cn.toComponentId).toBe(valve.id);
    expect(cn.medium).toBe('hot_water');
  });

  it('writes a connection_added event', () => {
    const { data: tank  } = placeComponent(PID, 'storage_tank', 'T', { x: 0, y: 0 }, stores, registry, USER);
    const { data: valve } = placeComponent(PID, 'mixing_valve', 'V', { x: 200, y: 0 }, stores, registry, USER);
    const { event } = connectPorts(PID,
      { componentId: tank.id,  portId: 'hot_out' },
      { componentId: valve.id, portId: 'hot_in' },
      'hot_water', 'forward', stores, registry, USER,
    );
    expect(event.kind).toBe('connection_added');
  });

  it('engine rejects medium mismatch', () => {
    const { data: tank  } = placeComponent(PID, 'storage_tank', 'T', { x: 0, y: 0 }, stores, registry, USER);
    const { data: pump  } = placeComponent(PID, 'recirc_pump',  'P', { x: 200, y: 0 }, stores, registry, USER);
    expect(() =>
      connectPorts(PID,
        { componentId: tank.id, portId: 'hot_out' },
        { componentId: pump.id, portId: 'in' },
        'hot_water', 'forward', stores, registry, USER,  // pump 'in' is recirc, not hot_water
      ),
    ).toThrow();
  });
});

describe('disconnectPorts', () => {
  it('removes the connection from GraphStore', () => {
    const { data: tank  } = placeComponent(PID, 'storage_tank', 'T', { x: 0, y: 0 }, stores, registry, USER);
    const { data: valve } = placeComponent(PID, 'mixing_valve', 'V', { x: 200, y: 0 }, stores, registry, USER);
    const { data: cn } = connectPorts(PID,
      { componentId: tank.id,  portId: 'hot_out' },
      { componentId: valve.id, portId: 'hot_in' },
      'hot_water', 'forward', stores, registry, USER,
    );
    disconnectPorts(PID, cn.id, stores, USER);
    expect(stores.graph.getConnection(PID, cn.id)).toBeUndefined();
  });

  it('writes a connection_removed event', () => {
    const { data: tank  } = placeComponent(PID, 'storage_tank', 'T', { x: 0, y: 0 }, stores, registry, USER);
    const { data: valve } = placeComponent(PID, 'mixing_valve', 'V', { x: 200, y: 0 }, stores, registry, USER);
    const { data: cn } = connectPorts(PID,
      { componentId: tank.id,  portId: 'hot_out' },
      { componentId: valve.id, portId: 'hot_in' },
      'hot_water', 'forward', stores, registry, USER,
    );
    const { event } = disconnectPorts(PID, cn.id, stores, USER);
    expect(event.kind).toBe('connection_removed');
  });
});
