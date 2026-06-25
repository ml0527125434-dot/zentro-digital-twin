/** @vitest-environment happy-dom */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';

import { bootstrapApp } from './bootstrap.js';
import { buildHotWaterPayload } from '../ingestion/fixture-adapter.js';
import { createComponentRegistry } from '../lib/component-registry.js';
import { registerBaseLibrary } from '../lib/component-library.js';
import { GAS_BACKUP   } from '../lib/definitions/gas-backup.def.js';
import { POINT_OF_USE } from '../lib/definitions/point-of-use.def.js';
import { HOT_WATER_PROJECT_ID } from '../seed/hot-water.seed.js';
import { SensorState, ValueProvenance } from '../domain/types.js';
import type { LiveSample } from '../domain/types.js';
import { ZentroApp } from './ZentroApp.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRegistry() {
  const r = createComponentRegistry();
  registerBaseLibrary(r);
  r.register(GAS_BACKUP);
  r.register(POINT_OF_USE);
  return r;
}

const NOW_ISO = new Date(1_000_000_000_000).toISOString();

const SAMPLE: LiveSample = {
  bindingId: 'b_t1', value: 62, ts: NOW_ISO,
  state: SensorState.Live, provenance: ValueProvenance.Measured,
};

// ---------------------------------------------------------------------------
// bootstrapApp
// ---------------------------------------------------------------------------

describe('bootstrapApp', () => {
  it('returns a populated AppContext', () => {
    const registry = makeRegistry();
    const payload  = buildHotWaterPayload(registry);
    const ctx      = bootstrapApp(payload, registry);

    expect(ctx.stores).toBeDefined();
    expect(ctx.liveStore).toBeDefined();
    expect(ctx.profileStore).toBeDefined();
    expect(ctx.alarmStore).toBeDefined();
    expect(ctx.registry).toBe(registry);
    expect(ctx.projectId).toBeDefined();
  });

  it('projectId matches the payload project id', () => {
    const registry = makeRegistry();
    const payload  = buildHotWaterPayload(registry);
    const ctx      = bootstrapApp(payload, registry);

    expect(ctx.projectId).toBe(HOT_WATER_PROJECT_ID);
    expect(ctx.projectId).toBe(payload.graph.project.id);
  });

  it('graph is populated — 6 components and 6 connections', () => {
    const registry = makeRegistry();
    const payload  = buildHotWaterPayload(registry);
    const ctx      = bootstrapApp(payload, registry);

    expect(ctx.stores.graph.getComponents(ctx.projectId)).toHaveLength(6);
    expect(ctx.stores.graph.getConnections(ctx.projectId)).toHaveLength(6);
  });

  it('profiles are populated', () => {
    const registry = makeRegistry();
    const payload  = buildHotWaterPayload(registry);
    const ctx      = bootstrapApp(payload, registry);

    expect(ctx.profileStore.listAll().length).toBeGreaterThan(0);
    expect(ctx.profileStore.get('op_tank_default')).toBeDefined();
  });

  it('alarm rules are populated when payload includes them', () => {
    const registry = makeRegistry();
    const base     = buildHotWaterPayload(registry);
    const rule = {
      id: 'rule_bootstrap_test', componentId: 'cmp_tank',
      triggerStatus: [], debounceSeconds: 0, severity: 'info' as const, message: 'Test',
    };
    const payload = { ...base, alarmRules: { rules: [rule] } };
    const ctx = bootstrapApp(payload, registry);

    expect(ctx.alarmStore.getAlarmRule(rule.id)).toEqual(rule);
  });

  it('live samples are populated when present in payload', () => {
    const registry = makeRegistry();
    const base     = buildHotWaterPayload(registry);
    const payload  = { ...base, samples: [SAMPLE] };
    const ctx      = bootstrapApp(payload, registry);

    expect(ctx.liveStore.get(SAMPLE.bindingId)).toEqual(SAMPLE);
  });

  it('repeated calls return independent store instances — no shared state', () => {
    const registry = makeRegistry();
    const payload  = buildHotWaterPayload(registry);
    const ctx1     = bootstrapApp(payload, registry);
    const ctx2     = bootstrapApp(payload, registry);

    expect(ctx1.stores.graph).not.toBe(ctx2.stores.graph);
    expect(ctx1.liveStore).not.toBe(ctx2.liveStore);
    expect(ctx1.profileStore).not.toBe(ctx2.profileStore);
    expect(ctx1.alarmStore).not.toBe(ctx2.alarmStore);

    // Mutating one does not affect the other
    ctx1.liveStore.set(SAMPLE.bindingId, SAMPLE);
    expect(ctx2.liveStore.get(SAMPLE.bindingId)).toBeUndefined();
  });

  it('ZentroApp mounts without throwing when given the returned context', () => {
    const registry = makeRegistry();
    const payload  = buildHotWaterPayload(registry);
    const ctx      = bootstrapApp(payload, registry);

    expect(() =>
      render(
        React.createElement(ZentroApp, {
          projectId:    ctx.projectId,
          stores:       ctx.stores,
          registry:     ctx.registry,
          liveStore:    ctx.liveStore,
          profileStore: ctx.profileStore,
          alarmStore:   ctx.alarmStore,
        }),
      ),
    ).not.toThrow();
  });
});
