import { describe, it, expect } from 'vitest';
import { createComponentRegistry } from '../lib/component-registry.js';
import { registerBaseLibrary } from '../lib/component-library.js';
import { GAS_BACKUP }   from '../lib/definitions/gas-backup.def.js';
import { POINT_OF_USE } from '../lib/definitions/point-of-use.def.js';
import { DemoRuntimeSource } from './demo-runtime-source.js';
import { BackendRuntimeSource } from './backend-runtime-source.js';
import type { ZentroPayload } from '../ingestion/fixture-adapter.js';

function makeRegistry() {
  const r = createComponentRegistry();
  registerBaseLibrary(r);
  r.register(GAS_BACKUP);
  r.register(POINT_OF_USE);
  return r;
}

describe('DemoRuntimeSource', () => {
  it('returns a ZentroPayload with graph, profiles and alarmRules', () => {
    const payload = new DemoRuntimeSource().getInitialPayload(makeRegistry());
    expect(payload.graph).toBeDefined();
    expect(Array.isArray(payload.graph.components)).toBe(true);
    expect(payload.graph.components.length).toBeGreaterThan(0);
    expect(Array.isArray(payload.profiles.profiles)).toBe(true);
    expect(Array.isArray(payload.alarmRules.rules)).toBe(true);
  });

  it('payload includes alarm rules for hot-water components', () => {
    const payload = new DemoRuntimeSource().getInitialPayload(makeRegistry());
    expect(payload.alarmRules.rules.length).toBeGreaterThan(0);
  });

  it('project id is the hot-water project id', () => {
    const payload = new DemoRuntimeSource().getInitialPayload(makeRegistry());
    expect(payload.graph.project.id).toBeTruthy();
  });
});

describe('BackendRuntimeSource', () => {
  it('returns exactly the payload it was constructed with', () => {
    const mock: ZentroPayload = {
      graph:      { project: { id: 'p1', name: 'Site', siteType: '' }, components: [], connections: [] },
      profiles:   { profiles: [] },
      alarmRules: { rules: [] },
    };
    expect(new BackendRuntimeSource(mock).getInitialPayload(makeRegistry())).toBe(mock);
  });
});
