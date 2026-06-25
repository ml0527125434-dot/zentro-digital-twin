import { describe, it, expect, beforeEach } from 'vitest';
import { projectConnection } from './project-connection.js';
import { createInMemoryLiveStore } from '../telemetry/live-store.js';
import {
  FlowState, NodeStatus, SensorState, ValueProvenance,
} from '../domain/types.js';
import type { Connection, LiveSample } from '../domain/types.js';

const NOW_MS = 1_000_000_000_000;

function isoAt(ageSeconds: number): string {
  return new Date(NOW_MS - ageSeconds * 1000).toISOString();
}

function makeSample(value: number, ageSeconds = 0): LiveSample {
  return {
    bindingId:  'b_supply',
    value,
    ts:         isoAt(ageSeconds),
    state:      SensorState.Live,
    provenance: ValueProvenance.Measured,
  };
}

const BASE_CONNECTION: Connection = {
  id:                   'cn_supply',
  projectId:            'proj_1',
  fromComponentId:      'cmp_tank',
  fromPortId:           'hot_out',
  toComponentId:        'cmp_tmv',
  toPortId:             'hot_in',
  medium:               'hot_water',
  topologicalDirection: 'forward',
  bindings: [
    { id: 'b_supply', source: 'mqtt', address: 'site/hw/supply/temp', metric: 'temperature', unit: '°C', ttlSeconds: 120 },
  ],
  valueBindingId: 'b_supply',
};

describe('projectConnection — no valueBinding', () => {
  it('returns Unknown flow when no valueBindingId', () => {
    const cn = { ...BASE_CONNECTION, valueBindingId: undefined };
    const store = createInMemoryLiveStore();
    const vm = projectConnection(cn, store, NOW_MS);
    expect(vm.flow).toBe(FlowState.Unknown);
    expect(vm.sensorState).toBe(SensorState.Unknown);
    expect(vm.value).toBeNull();
  });

  it('returns Unknown when valueBindingId references a non-existent binding', () => {
    const cn = { ...BASE_CONNECTION, valueBindingId: 'b_missing' };
    const store = createInMemoryLiveStore();
    const vm = projectConnection(cn, store, NOW_MS);
    expect(vm.flow).toBe(FlowState.Unknown);
  });

  it('returns Unknown when bindings array is empty', () => {
    const cn = { ...BASE_CONNECTION, bindings: [] };
    const store = createInMemoryLiveStore();
    const vm = projectConnection(cn, store, NOW_MS);
    expect(vm.flow).toBe(FlowState.Unknown);
  });
});

describe('projectConnection — with live sample', () => {
  let store: ReturnType<typeof createInMemoryLiveStore>;

  beforeEach(() => { store = createInMemoryLiveStore(); });

  it('Flowing when Live and value > 0', () => {
    store.set('b_supply', makeSample(62, 0));
    const vm = projectConnection(BASE_CONNECTION, store, NOW_MS);
    expect(vm.flow).toBe(FlowState.Flowing);
    expect(vm.sensorState).toBe(SensorState.Live);
  });

  it('NoFlow when Live and value === 0', () => {
    store.set('b_supply', makeSample(0, 0));
    const vm = projectConnection(BASE_CONNECTION, store, NOW_MS);
    expect(vm.flow).toBe(FlowState.NoFlow);
  });

  it('Reverse when Live and value < 0', () => {
    store.set('b_supply', makeSample(-5, 0));
    const vm = projectConnection(BASE_CONNECTION, store, NOW_MS);
    expect(vm.flow).toBe(FlowState.Reverse);
  });

  it('Unknown when sample is Stale (age === ttl)', () => {
    store.set('b_supply', makeSample(62, 120)); // age === ttl → Stale
    const vm = projectConnection(BASE_CONNECTION, store, NOW_MS);
    expect(vm.flow).toBe(FlowState.Unknown);
    expect(vm.sensorState).toBe(SensorState.Stale);
  });

  it('Unknown when no sample in store', () => {
    const vm = projectConnection(BASE_CONNECTION, store, NOW_MS);
    expect(vm.flow).toBe(FlowState.Unknown);
    expect(vm.sensorState).toBe(SensorState.Unknown);
  });

  it('value is populated when Live', () => {
    store.set('b_supply', makeSample(63.5, 0));
    const vm = projectConnection(BASE_CONNECTION, store, NOW_MS);
    expect(vm.value).toBe(63.5);
    expect(vm.unit).toBe('°C');
  });

  it('value is null when Stale', () => {
    store.set('b_supply', makeSample(62, 121));
    const vm = projectConnection(BASE_CONNECTION, store, NOW_MS);
    expect(vm.value).toBeNull();
  });

  it('status is always NodeStatus.Unknown in Stage 4', () => {
    store.set('b_supply', makeSample(62, 0));
    const vm = projectConnection(BASE_CONNECTION, store, NOW_MS);
    expect(vm.status).toBe(NodeStatus.Unknown);
  });

  it('connectionId matches input connection id', () => {
    const vm = projectConnection(BASE_CONNECTION, store, NOW_MS);
    expect(vm.connectionId).toBe('cn_supply');
  });
});
