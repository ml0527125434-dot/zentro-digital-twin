import { describe, it, expect } from 'vitest';
import { validateDefinition } from './definition-validator.js';
import type { ComponentDefinition } from './component-registry.js';

function validDef(overrides: Partial<ComponentDefinition> = {}): ComponentDefinition {
  return {
    typeId:   'test_component',
    category: 'storage',
    label:    'Test Component',
    ports: [
      { id: 'in',  label: 'In',  medium: 'hot_water', role: 'inlet',  anchor: 'left'  },
      { id: 'out', label: 'Out', medium: 'hot_water', role: 'outlet', anchor: 'right' },
    ],
    properties:  [],
    sensorSlots: [
      { id: 'temp', label: 'Temp', metric: 'temperature', required: true, defaultTtlSeconds: 60 },
    ],
    commands: [],
    visual: {
      shape:               'tank',
      primaryStatusMetric: 'temperature',
      portAnchors:         { in: 'left', out: 'right' },
      dashboardCard:       { fields: ['temp'] },
      propertyPanel:       { sections: ['live', 'config'] },
    },
    ...overrides,
  };
}

describe('validateDefinition', () => {
  it('valid definition returns { valid: true }', () => {
    expect(validateDefinition(validDef())).toEqual({ valid: true });
  });

  // --- Identity ---
  it('empty typeId → invalid', () => {
    const r = validateDefinition(validDef({ typeId: '' }));
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.errors.some(e => e.includes('typeId'))).toBe(true);
  });

  it('empty label → invalid', () => {
    const r = validateDefinition(validDef({ label: '' }));
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.errors.some(e => e.includes('label'))).toBe(true);
  });

  it('invalid category → invalid', () => {
    const r = validateDefinition(validDef({ category: 'spaceship' as never }));
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.errors.some(e => e.includes('category'))).toBe(true);
  });

  // --- Ports ---
  it('duplicate port ids → invalid', () => {
    const r = validateDefinition(validDef({
      ports: [
        { id: 'dup', label: 'A', medium: 'hot_water', role: 'inlet',  anchor: 'left' },
        { id: 'dup', label: 'B', medium: 'hot_water', role: 'outlet', anchor: 'right' },
      ],
    }));
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.errors.some(e => e.includes("Duplicate port id 'dup'"))).toBe(true);
  });

  it('invalid port medium → invalid', () => {
    const r = validateDefinition(validDef({
      ports: [{ id: 'p', label: 'P', medium: 'plasma' as never, role: 'inlet', anchor: 'left' }],
    }));
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.errors.some(e => e.includes("invalid medium 'plasma'"))).toBe(true);
  });

  it('invalid port role → invalid', () => {
    const r = validateDefinition(validDef({
      ports: [{ id: 'p', label: 'P', medium: 'hot_water', role: 'source' as never, anchor: 'left' }],
    }));
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.errors.some(e => e.includes("invalid role 'source'"))).toBe(true);
  });

  it('invalid port anchor → invalid', () => {
    const r = validateDefinition(validDef({
      ports: [{ id: 'p', label: 'P', medium: 'hot_water', role: 'inlet', anchor: 'center' as never }],
    }));
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.errors.some(e => e.includes("invalid anchor 'center'"))).toBe(true);
  });

  // --- SensorSlots ---
  it('duplicate sensorSlot ids → invalid', () => {
    const r = validateDefinition(validDef({
      sensorSlots: [
        { id: 'dup', label: 'A', metric: 'temperature', required: true,  defaultTtlSeconds: 60 },
        { id: 'dup', label: 'B', metric: 'pressure',    required: false, defaultTtlSeconds: 60 },
      ],
    }));
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.errors.some(e => e.includes("Duplicate sensorSlot id 'dup'"))).toBe(true);
  });

  it('invalid sensorSlot metric → invalid', () => {
    const r = validateDefinition(validDef({
      sensorSlots: [{ id: 's', label: 'S', metric: 'magic' as never, required: true, defaultTtlSeconds: 60 }],
    }));
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.errors.some(e => e.includes("invalid metric 'magic'"))).toBe(true);
  });

  it('sensorSlot defaultTtlSeconds === 0 → invalid', () => {
    const r = validateDefinition(validDef({
      sensorSlots: [{ id: 's', label: 'S', metric: 'temperature', required: true, defaultTtlSeconds: 0 }],
    }));
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.errors.some(e => e.includes("defaultTtlSeconds must be > 0"))).toBe(true);
  });

  it('sensorSlot defaultTtlSeconds < 0 → invalid', () => {
    const r = validateDefinition(validDef({
      sensorSlots: [{ id: 's', label: 'S', metric: 'temperature', required: true, defaultTtlSeconds: -1 }],
    }));
    expect(r.valid).toBe(false);
  });

  // --- Commands ---
  it('duplicate command ids → invalid', () => {
    const r = validateDefinition(validDef({
      commands: [
        { id: 'dup', label: 'A', dangerous: false, confirm: false },
        { id: 'dup', label: 'B', dangerous: false, confirm: false },
      ],
    }));
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.errors.some(e => e.includes("Duplicate command id 'dup'"))).toBe(true);
  });

  it('dangerous command without interlockKeys → invalid (SDK §1)', () => {
    const r = validateDefinition(validDef({
      commands: [{ id: 'cmd', label: 'C', dangerous: true, confirm: true }],
    }));
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.errors.some(e => e.includes('dangerous but declares no interlockKeys'))).toBe(true);
  });

  it('dangerous command with empty interlockKeys array → invalid', () => {
    const r = validateDefinition(validDef({
      commands: [{ id: 'cmd', label: 'C', dangerous: true, confirm: true, interlockKeys: [] }],
    }));
    expect(r.valid).toBe(false);
  });

  it('dangerous command with interlockKeys populated → valid', () => {
    const r = validateDefinition(validDef({
      commands: [{ id: 'cmd', label: 'C', dangerous: true, confirm: true, interlockKeys: ['sensor_live'] }],
    }));
    expect(r.valid).toBe(true);
  });

  it('non-dangerous command without interlockKeys → valid', () => {
    const r = validateDefinition(validDef({
      commands: [{ id: 'cmd', label: 'C', dangerous: false, confirm: false }],
    }));
    expect(r.valid).toBe(true);
  });

  // --- Visual ---
  it('portAnchors references unknown port id → invalid', () => {
    const r = validateDefinition(validDef({
      visual: {
        shape: 'tank', primaryStatusMetric: 'temperature',
        portAnchors: { in: 'left', out: 'right', ghost: 'top' },
        dashboardCard: { fields: [] }, propertyPanel: { sections: ['live'] },
      },
    }));
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.errors.some(e => e.includes("unknown port id 'ghost'"))).toBe(true);
  });

  it('invalid visual.primaryStatusMetric → invalid', () => {
    const r = validateDefinition(validDef({
      visual: {
        shape: 'tank', primaryStatusMetric: 'voltage' as never,
        portAnchors: {}, dashboardCard: { fields: [] }, propertyPanel: { sections: ['live'] },
      },
    }));
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.errors.some(e => e.includes('primaryStatusMetric'))).toBe(true);
  });

  it('empty propertyPanel.sections → invalid', () => {
    const r = validateDefinition(validDef({
      visual: {
        shape: 'tank', primaryStatusMetric: 'temperature',
        portAnchors: { in: 'left', out: 'right' },
        dashboardCard: { fields: [] }, propertyPanel: { sections: [] },
      },
    }));
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.errors.some(e => e.includes('sections must not be empty'))).toBe(true);
  });

  it('multiple errors are all reported', () => {
    const r = validateDefinition(validDef({
      typeId:   '',
      label:    '',
      category: 'invalid' as never,
    }));
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.errors.length).toBeGreaterThanOrEqual(3);
  });
});
