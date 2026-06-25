import { describe, it, expect, beforeEach } from 'vitest';
import { validateConnectionDraft, type ConnectionDraft } from './port-validator.js';
import { createComponentRegistry } from '../lib/component-registry.js';
import { registerBaseLibrary } from '../lib/component-library.js';
import type { Connection } from '../domain/types.js';

function makeRegistry() {
  const r = createComponentRegistry();
  registerBaseLibrary(r);
  return r;
}

function makeDraft(overrides?: Partial<ConnectionDraft>): ConnectionDraft {
  return {
    fromComponentId:   'cmp_tank',
    fromComponentType: 'storage_tank',
    fromPortId:        'hot_out',
    toComponentId:     'cmp_valve',
    toComponentType:   'mixing_valve',
    toPortId:          'hot_in',
    medium:            'hot_water',
    ...overrides,
  };
}

const NO_CONNECTIONS: Connection[] = [];

describe('validateConnectionDraft', () => {
  let registry: ReturnType<typeof makeRegistry>;

  beforeEach(() => {
    registry = makeRegistry();
  });

  it('accepts a valid draft', () => {
    expect(validateConnectionDraft(makeDraft(), registry, NO_CONNECTIONS)).toEqual({ valid: true });
  });

  // Rule 1 — no self-loop
  it('rejects self-loop', () => {
    const result = validateConnectionDraft(
      makeDraft({ toComponentId: 'cmp_tank', toComponentType: 'storage_tank', toPortId: 'cold_in' }),
      registry, NO_CONNECTIONS,
    );
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some(e => /itself/i.test(e))).toBe(true);
  });

  // Rule 2 — source port must exist
  it('rejects unknown from-port', () => {
    const result = validateConnectionDraft(
      makeDraft({ fromPortId: 'no_such_port' }),
      registry, NO_CONNECTIONS,
    );
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some(e => /hot_out|no_such_port/i.test(e) || /does not exist/i.test(e))).toBe(true);
  });

  // Rule 3 — target port must exist
  it('rejects unknown to-port', () => {
    const result = validateConnectionDraft(
      makeDraft({ toPortId: 'no_such_port' }),
      registry, NO_CONNECTIONS,
    );
    expect(result.valid).toBe(false);
  });

  // Rule 4 — medium matches source port
  it('rejects medium mismatch on source port', () => {
    const result = validateConnectionDraft(
      makeDraft({ medium: 'recirc_water' as never }),
      registry, NO_CONNECTIONS,
    );
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some(e => /medium/i.test(e))).toBe(true);
  });

  // Rule 5 — medium matches target port
  it('rejects medium mismatch on target port (cross-medium)', () => {
    const result = validateConnectionDraft(
      makeDraft({ toComponentType: 'recirc_pump', toPortId: 'in', medium: 'hot_water' }),
      registry, NO_CONNECTIONS,
    );
    expect(result.valid).toBe(false);
  });

  // Rule 6 — from-port must not be an inlet
  it('rejects when from-port is inlet', () => {
    const result = validateConnectionDraft(
      makeDraft({ fromPortId: 'hot_in', fromComponentType: 'mixing_valve', fromComponentId: 'cmp_valve' }),
      registry, NO_CONNECTIONS,
    );
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some(e => /inlet/i.test(e))).toBe(true);
  });

  // Rule 7 — to-port must not be an outlet
  it('rejects when to-port is outlet', () => {
    const result = validateConnectionDraft(
      makeDraft({ toPortId: 'hot_out', toComponentType: 'storage_tank', toComponentId: 'cmp_tank2' }),
      registry, NO_CONNECTIONS,
    );
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some(e => /outlet/i.test(e))).toBe(true);
  });

  // Rule 8 — no duplicate
  it('rejects duplicate connection', () => {
    const existing: Connection[] = [{
      id: 'cn_existing', projectId: 'p1',
      fromComponentId: 'cmp_tank', fromPortId: 'hot_out',
      toComponentId: 'cmp_valve', toPortId: 'hot_in',
      medium: 'hot_water', topologicalDirection: 'forward',
      bindings: [],
    }];
    const result = validateConnectionDraft(makeDraft(), registry, existing);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some(e => /already exists/i.test(e))).toBe(true);
  });

  // Multiple errors reported together
  it('returns multiple errors when multiple rules fail', () => {
    const result = validateConnectionDraft(
      {
        fromComponentId:   'cmp_1',
        fromComponentType: 'storage_tank',
        fromPortId:        'no_port',
        toComponentId:     'cmp_1', // self-loop
        toComponentType:   'storage_tank',
        toPortId:          'no_port',
        medium:            'hot_water',
      },
      registry, NO_CONNECTIONS,
    );
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  // Unknown component type (early-exit path)
  it('rejects when from-component type is unregistered', () => {
    const result = validateConnectionDraft(
      makeDraft({ fromComponentType: 'unknown_type' }),
      registry, NO_CONNECTIONS,
    );
    expect(result.valid).toBe(false);
  });
});
