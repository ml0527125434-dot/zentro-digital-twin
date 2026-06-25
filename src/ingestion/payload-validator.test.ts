import { describe, it, expect } from 'vitest';
import { validatePayload, assertValidPayload } from './payload-validator.js';

const VALID: Record<string, unknown> = {
  graph: {
    project:     { id: 'proj_1', name: 'Test Project', siteType: 'test' },
    components:  [{ id: 'cmp_1', type: 'tank', name: 'Tank', projectId: 'proj_1', bindings: [] }],
    connections: [],
  },
  profiles:   { profiles: [] },
  alarmRules: { rules: [] },
};

describe('validatePayload', () => {
  it('returns no errors for a minimal valid payload', () => {
    expect(validatePayload(VALID)).toHaveLength(0);
  });

  it('accepts optional empty samples array', () => {
    expect(validatePayload({ ...VALID, samples: [] })).toHaveLength(0);
  });

  it('errors on null', () => {
    expect(validatePayload(null).length).toBeGreaterThan(0);
  });

  it('errors on array', () => {
    expect(validatePayload([]).length).toBeGreaterThan(0);
  });

  it('errors when graph is missing', () => {
    const { graph: _g, ...rest } = VALID as Record<string, unknown>;
    const errors = validatePayload(rest);
    expect(errors.some(e => e.path === 'graph')).toBe(true);
  });

  it('errors when graph.project.id is empty string', () => {
    const bad = structuredClone(VALID) as Record<string, unknown>;
    ((bad['graph'] as Record<string, unknown>)['project'] as Record<string, unknown>)['id'] = '';
    expect(validatePayload(bad).some(e => e.path === 'graph.project.id')).toBe(true);
  });

  it('errors when graph.project.name is missing', () => {
    const bad = structuredClone(VALID) as Record<string, unknown>;
    delete ((bad['graph'] as Record<string, unknown>)['project'] as Record<string, unknown>)['name'];
    expect(validatePayload(bad).some(e => e.path === 'graph.project.name')).toBe(true);
  });

  it('errors when graph.components is not an array', () => {
    const bad = structuredClone(VALID) as Record<string, unknown>;
    (bad['graph'] as Record<string, unknown>)['components'] = 'bad';
    expect(validatePayload(bad).some(e => e.path === 'graph.components')).toBe(true);
  });

  it('errors when a component is missing type', () => {
    const bad = structuredClone(VALID) as Record<string, unknown>;
    const comps = (bad['graph'] as Record<string, unknown>)['components'] as Record<string, unknown>[];
    delete comps[0]!['type'];
    expect(validatePayload(bad).some(e => e.path === 'graph.components[0].type')).toBe(true);
  });

  it('errors when profiles.profiles is not an array', () => {
    const bad = structuredClone(VALID) as Record<string, unknown>;
    (bad['profiles'] as Record<string, unknown>)['profiles'] = null;
    expect(validatePayload(bad).some(e => e.path === 'profiles.profiles')).toBe(true);
  });

  it('errors when alarmRules.rules is not an array', () => {
    const bad = structuredClone(VALID) as Record<string, unknown>;
    (bad['alarmRules'] as Record<string, unknown>)['rules'] = {};
    expect(validatePayload(bad).some(e => e.path === 'alarmRules.rules')).toBe(true);
  });

  it('errors when alarmRules.rules[i].id is missing', () => {
    const bad = structuredClone(VALID) as Record<string, unknown>;
    (bad['alarmRules'] as Record<string, unknown>)['rules'] = [{ componentId: 'cmp_1' }];
    expect(validatePayload(bad).some(e => e.path === 'alarmRules.rules[0].id')).toBe(true);
  });

  it('errors when samples is a non-array value', () => {
    const bad = { ...VALID, samples: 'bad' };
    expect(validatePayload(bad).some(e => e.path === 'samples')).toBe(true);
  });

  it('collects multiple errors in one pass', () => {
    const bad = { graph: 'x', profiles: null, alarmRules: null };
    expect(validatePayload(bad).length).toBeGreaterThan(1);
  });
});

describe('assertValidPayload', () => {
  it('does not throw for a valid payload', () => {
    expect(() => assertValidPayload(VALID)).not.toThrow();
  });

  it('throws with "Invalid ZentroPayload" prefix', () => {
    expect(() => assertValidPayload(null)).toThrow('Invalid ZentroPayload');
  });

  it('throws with path detail for invalid payload', () => {
    const bad = { graph: 42, profiles: { profiles: [] }, alarmRules: { rules: [] } };
    expect(() => assertValidPayload(bad)).toThrow('graph');
  });
});
