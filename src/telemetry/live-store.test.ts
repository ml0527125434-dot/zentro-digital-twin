import { describe, it, expect, beforeEach } from 'vitest';
import { createInMemoryLiveStore } from './live-store.js';
import { SensorState, ValueProvenance } from '../domain/types.js';
import type { LiveSample } from '../domain/types.js';

function sample(bindingId: string, value: number): LiveSample {
  return {
    bindingId,
    value,
    ts:         new Date().toISOString(),
    state:      SensorState.Live,
    provenance: ValueProvenance.Measured,
  };
}

describe('createInMemoryLiveStore', () => {
  let store: ReturnType<typeof createInMemoryLiveStore>;

  beforeEach(() => { store = createInMemoryLiveStore(); });

  it('get returns undefined for unknown bindingId', () => {
    expect(store.get('b_missing')).toBeUndefined();
  });

  it('set + get round-trips a sample', () => {
    const s = sample('b_1', 62);
    store.set('b_1', s);
    expect(store.get('b_1')).toBe(s);
  });

  it('overwriting a binding replaces the sample', () => {
    store.set('b_1', sample('b_1', 60));
    const newer = sample('b_1', 65);
    store.set('b_1', newer);
    expect(store.get('b_1')).toBe(newer);
  });

  it('different bindingIds are isolated', () => {
    store.set('b_1', sample('b_1', 10));
    store.set('b_2', sample('b_2', 20));
    expect(store.get('b_1')?.value).toBe(10);
    expect(store.get('b_2')?.value).toBe(20);
  });

  it('clear removes all samples', () => {
    store.set('b_1', sample('b_1', 10));
    store.set('b_2', sample('b_2', 20));
    store.clear();
    expect(store.get('b_1')).toBeUndefined();
    expect(store.get('b_2')).toBeUndefined();
  });

  it('get after clear returns undefined', () => {
    store.set('b_x', sample('b_x', 99));
    store.clear();
    expect(store.get('b_x')).toBeUndefined();
  });

  it('set after clear works normally', () => {
    store.clear();
    const s = sample('b_1', 42);
    store.set('b_1', s);
    expect(store.get('b_1')).toBe(s);
  });
});
