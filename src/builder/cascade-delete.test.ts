import { describe, it, expect } from 'vitest';
import { deleteComponentWithConnections, placeComponent, connectPorts } from './builder-actions.js';
import { createInMemoryGraphStore, createProject, type EngineStores } from '../engine/graph-engine.js';
import { createInMemoryVersionStore } from '../domain/project-version.js';
import { createInMemoryEventStore } from '../domain/event-store.js';
import { createComponentRegistry } from '../lib/component-registry.js';
import { registerBaseLibrary } from '../lib/component-library.js';

const PID = 'p1';
function setup() {
  const stores: EngineStores = {
    graph: createInMemoryGraphStore(),
    versions: createInMemoryVersionStore(),
    events: createInMemoryEventStore(),
  };
  createProject({ id: PID, name: 't', siteType: 'r' }, 'u', stores);
  const registry = createComponentRegistry();
  registerBaseLibrary(registry);
  return { stores, registry };
}

describe('deleteComponentWithConnections', () => {
  it('removes a connected component together with its pipes', () => {
    const { stores, registry } = setup();
    // heat_pump (hot_out) -> storage_tank (heat_in_1) is a valid hot_water link
    const pump = placeComponent(PID, 'heat_pump', 'HP', { x: 0, y: 0 }, stores, registry, 'u').data;
    const tank = placeComponent(PID, 'storage_tank', 'T', { x: 200, y: 0 }, stores, registry, 'u').data;
    connectPorts(PID, { componentId: pump.id, portId: 'out' }, { componentId: tank.id, portId: 'heat_in_1' },
      'hot_water', 'forward', stores, registry, 'u');

    expect(stores.graph.getConnections(PID)).toHaveLength(1);

    const res = deleteComponentWithConnections(PID, tank.id, stores, 'u');
    expect(res.removedConnectionIds).toHaveLength(1);
    expect(stores.graph.getComponents(PID).map(c => c.id)).toEqual([pump.id]);
    expect(stores.graph.getConnections(PID)).toHaveLength(0);
  });

  it('works for a component with no connections', () => {
    const { stores, registry } = setup();
    const t = placeComponent(PID, 'storage_tank', 'T', { x: 0, y: 0 }, stores, registry, 'u').data;
    const res = deleteComponentWithConnections(PID, t.id, stores, 'u');
    expect(res.removedConnectionIds).toHaveLength(0);
    expect(stores.graph.getComponents(PID)).toHaveLength(0);
  });
});
