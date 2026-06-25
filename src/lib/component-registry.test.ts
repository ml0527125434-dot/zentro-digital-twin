import { describe, it, expect, beforeEach } from 'vitest';
import { createComponentRegistry, type ComponentRegistry, type ComponentDefinition } from './component-registry.js';

function makeDef(typeId: string): ComponentDefinition {
  return {
    typeId,
    category: 'storage',
    label:    typeId,
    ports: [
      { id: 'hot_out', label: 'Hot Out', medium: 'hot_water', role: 'outlet', anchor: 'top' },
    ],
    properties:  [],
    sensorSlots: [
      { id: 'temp', label: 'Temperature', metric: 'temperature', required: true, defaultTtlSeconds: 120 },
    ],
    commands: [],
    visual: {
      shape:               'tank',
      primaryStatusMetric: 'temperature',
      portAnchors:         { hot_out: 'top' },
      dashboardCard:       { fields: ['temp'] },
      propertyPanel:       { sections: ['live', 'commands', 'history'] },
    },
  };
}

describe('ComponentRegistry', () => {
  let registry: ComponentRegistry;

  beforeEach(() => {
    registry = createComponentRegistry();
  });

  it('register then get returns the definition', () => {
    const def = makeDef('storage_tank');
    registry.register(def);
    expect(registry.get('storage_tank')).toBe(def);
  });

  it('get with unknown typeId returns undefined', () => {
    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('getOrThrow with unknown typeId throws', () => {
    expect(() => registry.getOrThrow('nonexistent')).toThrow(
      /typeId "nonexistent" is not registered/,
    );
  });

  it('getOrThrow with known typeId returns the definition', () => {
    const def = makeDef('storage_tank');
    registry.register(def);
    expect(registry.getOrThrow('storage_tank')).toBe(def);
  });

  it('registering the same typeId twice throws', () => {
    registry.register(makeDef('storage_tank'));
    expect(() => registry.register(makeDef('storage_tank'))).toThrow(
      /typeId "storage_tank" is already registered/,
    );
  });

  it('listAll returns all registered definitions in registration order', () => {
    const a = makeDef('type_a');
    const b = makeDef('type_b');
    const c = makeDef('type_c');
    registry.register(a);
    registry.register(b);
    registry.register(c);
    const all = registry.listAll();
    expect(all).toHaveLength(3);
    expect(all[0]?.typeId).toBe('type_a');
    expect(all[1]?.typeId).toBe('type_b');
    expect(all[2]?.typeId).toBe('type_c');
  });

  it('listAll returns a copy — mutating it does not affect the registry', () => {
    registry.register(makeDef('storage_tank'));
    const list = registry.listAll();
    list.splice(0, 1);
    expect(registry.listAll()).toHaveLength(1);
  });

  it('listAll returns empty array when nothing is registered', () => {
    expect(registry.listAll()).toHaveLength(0);
  });
});
