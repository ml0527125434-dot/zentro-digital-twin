import { describe, it, expect } from 'vitest';
import {
  createInMemoryOperationalProfileStore,
} from './operational-profile-store.js';
import { NodeStatus } from '../domain/types.js';
import type { OperationalProfile } from '../domain/types.js';

const PROFILE: OperationalProfile = {
  id:            'op_tank_default',
  appliesToType: 'storage_tank',
  scope:         'type_default',
  metrics: [{
    metric: 'temperature', unit: '°C', hysteresis: 1.5, bands: [
      { status: NodeStatus.Risk, max: 50 },
      { status: NodeStatus.Warn, min: 50, max: 55 },
      { status: NodeStatus.Ok,  min: 55 },
    ],
  }],
};

const PROFILE_2: OperationalProfile = {
  id:            'op_pou_default',
  appliesToType: 'point_of_use',
  scope:         'type_default',
  metrics: [],
};

describe('createInMemoryOperationalProfileStore', () => {
  it('returns undefined for an unknown profile id', () => {
    const store = createInMemoryOperationalProfileStore();
    expect(store.get('no_such_id')).toBeUndefined();
  });

  it('stores and retrieves a profile by id', () => {
    const store = createInMemoryOperationalProfileStore();
    store.set(PROFILE);
    expect(store.get(PROFILE.id)).toEqual(PROFILE);
  });

  it('set() overwrites an existing profile with the same id', () => {
    const store   = createInMemoryOperationalProfileStore();
    const updated = { ...PROFILE, scope: 'instance' as const };
    store.set(PROFILE);
    store.set(updated);
    expect(store.get(PROFILE.id)?.scope).toBe('instance');
  });

  it('setMany() stores multiple profiles', () => {
    const store = createInMemoryOperationalProfileStore();
    store.setMany([PROFILE, PROFILE_2]);
    expect(store.get(PROFILE.id)).toBeDefined();
    expect(store.get(PROFILE_2.id)).toBeDefined();
  });

  it('listAll() returns all stored profiles', () => {
    const store = createInMemoryOperationalProfileStore();
    store.setMany([PROFILE, PROFILE_2]);
    expect(store.listAll()).toHaveLength(2);
  });

  it('listAll() on empty store returns empty array', () => {
    expect(createInMemoryOperationalProfileStore().listAll()).toHaveLength(0);
  });

  it('two stores are independent', () => {
    const a = createInMemoryOperationalProfileStore();
    const b = createInMemoryOperationalProfileStore();
    a.set(PROFILE);
    expect(b.get(PROFILE.id)).toBeUndefined();
  });
});
