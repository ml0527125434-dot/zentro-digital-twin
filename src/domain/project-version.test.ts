import { describe, it, expect, beforeEach } from 'vitest';
import { createInMemoryVersionStore, type VersionStore } from './project-version.js';

const PROJECT = 'proj_test';

describe('VersionStore', () => {
  let store: VersionStore;

  beforeEach(() => {
    store = createInMemoryVersionStore();
  });

  it('current returns 0 before any increment', () => {
    expect(store.current(PROJECT)).toBe(0);
  });

  it('first increment returns version 1', () => {
    const v = store.increment(PROJECT, 'project_created', 'user_1');
    expect(v.version).toBe(1);
  });

  it('increments are monotonically increasing', () => {
    store.increment(PROJECT, 'project_created', 'user_1');
    store.increment(PROJECT, 'component_add',   'user_1');
    const v3 = store.increment(PROJECT, 'connection_add', 'user_1');
    expect(v3.version).toBe(3);
  });

  it('current reflects the latest version after increments', () => {
    store.increment(PROJECT, 'project_created', 'user_1');
    store.increment(PROJECT, 'component_add',   'user_1');
    expect(store.current(PROJECT)).toBe(2);
  });

  it('history returns all versions in ascending order', () => {
    store.increment(PROJECT, 'project_created', 'user_1');
    store.increment(PROJECT, 'component_add',   'user_1');
    const h = store.history(PROJECT);
    expect(h).toHaveLength(2);
    expect(h[0]?.version).toBe(1);
    expect(h[1]?.version).toBe(2);
  });

  it('history is a copy — mutating it does not affect the store', () => {
    store.increment(PROJECT, 'project_created', 'user_1');
    const h = store.history(PROJECT);
    h.splice(0, 1);
    expect(store.history(PROJECT)).toHaveLength(1);
  });

  it('each version record carries the correct changeKind', () => {
    const v = store.increment(PROJECT, 'component_remove', 'user_2');
    expect(v.changeKind).toBe('component_remove');
  });

  it('each version record carries the correct createdBy', () => {
    const v = store.increment(PROJECT, 'project_created', 'alice');
    expect(v.createdBy).toBe('alice');
  });

  it('each version record has a unique id', () => {
    const v1 = store.increment(PROJECT, 'project_created', 'user_1');
    const v2 = store.increment(PROJECT, 'component_add',   'user_1');
    expect(v1.id).not.toBe(v2.id);
  });

  it('projects are versioned independently', () => {
    store.increment(PROJECT,  'project_created', 'user_1');
    store.increment(PROJECT,  'component_add',   'user_1');
    store.increment('proj_b', 'project_created', 'user_2');
    expect(store.current(PROJECT)).toBe(2);
    expect(store.current('proj_b')).toBe(1);
  });

  it('createdAt is a valid ISO8601 string', () => {
    const v = store.increment(PROJECT, 'project_created', 'user_1');
    expect(() => new Date(v.createdAt)).not.toThrow();
    expect(new Date(v.createdAt).toISOString()).toBe(v.createdAt);
  });
});
