import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateBindingDraft,
  assignComponentBinding,
  removeComponentBinding,
  assignConnectionBinding,
  removeConnectionBinding,
  type BindingDraft,
} from './binding-editor.js';
import { createInMemoryGraphStore, createProject, type EngineStores } from '../engine/graph-engine.js';
import { createInMemoryVersionStore } from '../domain/project-version.js';
import { createInMemoryEventStore } from '../domain/event-store.js';
import { createComponentRegistry } from '../lib/component-registry.js';
import { registerBaseLibrary } from '../lib/component-library.js';
import type { SensorSlot } from '../lib/component-registry.js';

const PID  = 'proj_1';
const USER = 'test_user';

const TEMP_SLOT: SensorSlot = {
  id:               'temp_slot',
  label:            'Temperature',
  metric:           'temperature',
  required:         true,
  defaultTtlSeconds: 60,
};

const FLOW_SLOT: SensorSlot = {
  id:               'flow_slot',
  label:            'Flow Rate',
  metric:           'flow',
  required:         false,
  defaultTtlSeconds: 60,
};

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

function makeDraft(overrides?: Partial<BindingDraft>): BindingDraft {
  return {
    slotId:     TEMP_SLOT.id,
    source:     'mqtt',
    address:    'sensors/tank/temp',
    ttlSeconds: 60,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// validateBindingDraft
// ---------------------------------------------------------------------------

describe('validateBindingDraft', () => {
  it('accepts a valid draft', () => {
    expect(validateBindingDraft(makeDraft(), TEMP_SLOT)).toEqual({ valid: true });
  });

  it('rejects when slotId does not match slot.id', () => {
    const result = validateBindingDraft(makeDraft({ slotId: 'wrong_slot' }), TEMP_SLOT);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects unknown source', () => {
    const result = validateBindingDraft(makeDraft({ source: 'opc_ua' as never }), TEMP_SLOT);
    expect(result.valid).toBe(false);
  });

  it('rejects empty address', () => {
    const result = validateBindingDraft(makeDraft({ address: '   ' }), TEMP_SLOT);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some(e => /address/i.test(e))).toBe(true);
  });

  it('rejects ttlSeconds <= 0', () => {
    const result = validateBindingDraft(makeDraft({ ttlSeconds: 0 }), TEMP_SLOT);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some(e => /ttl/i.test(e))).toBe(true);
  });

  it('reports all errors together', () => {
    const result = validateBindingDraft(
      makeDraft({ address: '', ttlSeconds: -1 }),
      TEMP_SLOT,
    );
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// assignComponentBinding / removeComponentBinding
// ---------------------------------------------------------------------------

describe('assignComponentBinding', () => {
  let stores:   EngineStores;
  let registry: ReturnType<typeof makeRegistry>;
  let componentId: string;

  beforeEach(() => {
    stores   = makeStores();
    registry = makeRegistry();
    createProject({ id: PID, name: 'Test', siteType: 'test' }, USER, stores);
    const def = registry.getOrThrow('storage_tank');
    const comp = {
      id: 'cmp_tank', projectId: PID, type: 'storage_tank', name: 'Tank',
      position: { x: 0, y: 0 }, mode: 'normal' as const,
      bindings: [],
      
    };
    stores.graph.setComponent(comp);
    componentId = 'cmp_tank';
  });

  it('adds a binding with metric derived from the slot', () => {
    const { data } = assignComponentBinding(PID, componentId, makeDraft(), TEMP_SLOT, stores, USER);
    expect(data.bindings).toHaveLength(1);
    expect(data.bindings[0]!.metric).toBe(TEMP_SLOT.metric);
  });

  it('binding address is trimmed', () => {
    const { data } = assignComponentBinding(
      PID, componentId, makeDraft({ address: '  sensors/tank/temp  ' }), TEMP_SLOT, stores, USER,
    );
    expect(data.bindings[0]!.address).toBe('sensors/tank/temp');
  });

  it('replaces an existing binding for the same metric', () => {
    assignComponentBinding(PID, componentId, makeDraft({ address: 'old/topic' }), TEMP_SLOT, stores, USER);
    const { data } = assignComponentBinding(PID, componentId, makeDraft({ address: 'new/topic' }), TEMP_SLOT, stores, USER);
    const tempBindings = data.bindings.filter(b => b.metric === 'temperature');
    expect(tempBindings).toHaveLength(1);
    expect(tempBindings[0]!.address).toBe('new/topic');
  });

  it('different metrics co-exist', () => {
    assignComponentBinding(PID, componentId, makeDraft(), TEMP_SLOT, stores, USER);
    const { data } = assignComponentBinding(
      PID, componentId,
      { slotId: FLOW_SLOT.id, source: 'modbus', address: 'reg/42', ttlSeconds: 30 },
      FLOW_SLOT, stores, USER,
    );
    expect(data.bindings).toHaveLength(2);
  });

  it('writes a component_updated event', () => {
    const { event } = assignComponentBinding(PID, componentId, makeDraft(), TEMP_SLOT, stores, USER);
    expect(event.kind).toBe('component_updated');
  });

  it('throws when component does not exist', () => {
    expect(() =>
      assignComponentBinding(PID, 'no_such_comp', makeDraft(), TEMP_SLOT, stores, USER),
    ).toThrow(/not found/);
  });
});

describe('removeComponentBinding', () => {
  let stores: EngineStores;
  let componentId: string;
  let bindingId:   string;

  beforeEach(() => {
    stores = makeStores();
    const registry = makeRegistry();
    createProject({ id: PID, name: 'Test', siteType: 'test' }, USER, stores);
    const def = registry.getOrThrow('storage_tank');
    const comp = {
      id: 'cmp_tank', projectId: PID, type: 'storage_tank', name: 'Tank',
      position: { x: 0, y: 0 }, mode: 'normal' as const,
      bindings: [],
      
    };
    stores.graph.setComponent(comp);
    componentId = 'cmp_tank';
    const { data } = assignComponentBinding(PID, componentId, makeDraft(), TEMP_SLOT, stores, USER);
    bindingId = data.bindings[0]!.id;
  });

  it('removes the binding', () => {
    const { data } = removeComponentBinding(PID, componentId, bindingId, stores, USER);
    expect(data.bindings).toHaveLength(0);
  });

  it('throws when binding id is not found', () => {
    expect(() =>
      removeComponentBinding(PID, componentId, 'no_such_binding', stores, USER),
    ).toThrow(/not found/);
  });
});

// ---------------------------------------------------------------------------
// assignConnectionBinding / removeConnectionBinding
// ---------------------------------------------------------------------------

describe('assignConnectionBinding + removeConnectionBinding', () => {
  let stores:       EngineStores;
  let connectionId: string;

  beforeEach(() => {
    stores = makeStores();
    const registry = makeRegistry();
    createProject({ id: PID, name: 'Test', siteType: 'test' }, USER, stores);

    const tank = {
      id: 'cmp_tank', projectId: PID, type: 'storage_tank', name: 'Tank',
      position: { x: 0, y: 0 }, mode: 'normal' as const,
      bindings: [],
      
    };
    const valve = {
      id: 'cmp_valve', projectId: PID, type: 'mixing_valve', name: 'Valve',
      position: { x: 200, y: 0 }, mode: 'normal' as const,
      bindings: [],
      
    };
    stores.graph.setComponent(tank);
    stores.graph.setComponent(valve);

    const cn = {
      id: 'cn_1', projectId: PID,
      fromComponentId: 'cmp_tank', fromPortId: 'hot_out',
      toComponentId: 'cmp_valve', toPortId: 'hot_in',
      medium: 'hot_water' as const,
      topologicalDirection: 'forward' as const,
      bindings: [],
    };
    stores.graph.setConnection(cn);
    connectionId = 'cn_1';
  });

  it('adds a binding to the connection', () => {
    const draft = { slotId: FLOW_SLOT.id, source: 'mqtt' as const, address: 'pipe/flow', ttlSeconds: 30 };
    const { data } = assignConnectionBinding(PID, connectionId, draft, FLOW_SLOT, stores, USER);
    expect(data.bindings).toHaveLength(1);
    expect(data.bindings![0]!.metric).toBe(FLOW_SLOT.metric);
  });

  it('writes a connection_updated event', () => {
    const draft = { slotId: FLOW_SLOT.id, source: 'mqtt' as const, address: 'pipe/flow', ttlSeconds: 30 };
    const { event } = assignConnectionBinding(PID, connectionId, draft, FLOW_SLOT, stores, USER);
    expect(event.kind).toBe('connection_updated');
  });

  it('removeConnectionBinding removes the binding', () => {
    const draft = { slotId: FLOW_SLOT.id, source: 'mqtt' as const, address: 'pipe/flow', ttlSeconds: 30 };
    const { data: after } = assignConnectionBinding(PID, connectionId, draft, FLOW_SLOT, stores, USER);
    const bId = after.bindings![0]!.id;
    const { data: final } = removeConnectionBinding(PID, connectionId, bId, stores, USER);
    expect(final.bindings).toHaveLength(0);
  });

  it('removeConnectionBinding clears valueBindingId when it matched', () => {
    const draft = { slotId: FLOW_SLOT.id, source: 'mqtt' as const, address: 'pipe/flow', ttlSeconds: 30 };
    const { data: after } = assignConnectionBinding(PID, connectionId, draft, FLOW_SLOT, stores, USER);
    const bId = after.bindings![0]!.id;
    // Manually set valueBindingId
    const cn = stores.graph.getConnection(PID, connectionId)!;
    stores.graph.setConnection({ ...cn, valueBindingId: bId });
    const { data: final } = removeConnectionBinding(PID, connectionId, bId, stores, USER);
    expect(final.valueBindingId).toBeUndefined();
  });
});
